const ACTIONS = { notFollowingBack: "Unfollow", fans: "Follow back", mutuals: null };

const tabs = document.getElementById("tabs");
const grid = document.getElementById("grid");
const state = document.getElementById("state");
const toastEl = document.getElementById("toast");
const meEl = document.getElementById("me");

let data = { notFollowingBack: [], fans: [], mutuals: [] };
let active = "notFollowingBack";

async function api(path, options) {
  const res = await fetch(path, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw body;
  return body;
}

function toast(message, hint) {
  toastEl.innerHTML = hint
    ? `${message} <code>${hint}</code>`
    : message;
  toastEl.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (toastEl.hidden = true), 6000);
}

async function init() {
  try {
    const me = await api("/api/me");
    meEl.href = me.htmlUrl;
    meEl.innerHTML = `<img src="${me.avatarUrl}" alt="" /><span>@${me.login}</span>`;
    meEl.hidden = false;
  } catch (e) {
    state.innerHTML = `${e.error || "Not authenticated."} <code>${e.hint || "gh auth login"}</code>`;
    return;
  }
  await load();
}

async function load() {
  state.hidden = false;
  state.textContent = "Loading…";
  grid.hidden = true;
  try {
    data = await api("/api/relationships");
  } catch (e) {
    state.innerHTML = `${e.error || "Failed to load."} ${e.hint ? `<code>${e.hint}</code>` : ""}`;
    return;
  }
  tabs.hidden = false;
  for (const btn of tabs.querySelectorAll(".tab")) {
    btn.querySelector(".count").textContent = data[btn.dataset.kind].length;
  }
  render();
}

function render() {
  const list = data[active];
  for (const btn of tabs.querySelectorAll(".tab")) {
    btn.classList.toggle("active", btn.dataset.kind === active);
  }
  if (!list.length) {
    grid.hidden = true;
    state.hidden = false;
    state.textContent = "Nothing here 🎉";
    return;
  }
  state.hidden = true;
  grid.hidden = false;
  grid.innerHTML = list.map((u) => card(u, active)).join("");
  enrich(list);
}

function card(u, kind) {
  const action = ACTIONS[kind];
  const btn = action
    ? `<button class="action ${kind}" data-login="${u.login}">${action}</button>`
    : `<span class="badge">following</span>`;
  return `
    <article class="card" data-login="${u.login}">
      <a class="card-link" href="${u.htmlUrl}" target="_blank" rel="noopener">
        <img class="avatar" src="${u.avatarUrl}&s=128" alt="" loading="lazy" />
        <span class="meta">
          <span class="name">${u.login}</span>
          <span class="login">@${u.login}</span>
        </span>
      </a>
      ${btn}
    </article>`;
}

const nameCache = new Map();
async function enrich(list) {
  const todo = list.filter((u) => !nameCache.has(u.login));
  await mapLimit(todo, 6, async (u) => {
    try {
      const full = await api(`/api/user/${u.login}`);
      nameCache.set(u.login, full.name || u.login);
    } catch {
      nameCache.set(u.login, u.login);
    }
    const el = grid.querySelector(`.card[data-login="${CSS.escape(u.login)}"] .name`);
    if (el) el.textContent = nameCache.get(u.login);
  });
  for (const u of list) {
    if (nameCache.has(u.login)) {
      const el = grid.querySelector(`.card[data-login="${CSS.escape(u.login)}"] .name`);
      if (el) el.textContent = nameCache.get(u.login);
    }
  }
}

async function mapLimit(items, limit, fn) {
  const iterator = items[Symbol.iterator]();
  const run = async () => {
    for (let next = iterator.next(); !next.done; next = iterator.next()) {
      await fn(next.value);
    }
  };
  await Promise.all(Array.from({ length: limit }, run));
}

tabs.addEventListener("click", (e) => {
  const tab = e.target.closest(".tab");
  if (!tab) return;
  active = tab.dataset.kind;
  render();
});

grid.addEventListener("click", async (e) => {
  const btn = e.target.closest(".action");
  if (!btn) return;
  e.preventDefault();
  const login = btn.dataset.login;
  if (btn.classList.contains("notFollowingBack")) {
    if (!confirm(`Unfollow @${login}?`)) return;
    await act(btn, login, "DELETE", () => {
      data.notFollowingBack = data.notFollowingBack.filter((u) => u.login !== login);
    });
  } else if (btn.classList.contains("fans")) {
    await act(btn, login, "PUT", () => {
      const u = data.fans.find((x) => x.login === login);
      data.fans = data.fans.filter((x) => x.login !== login);
      if (u) data.mutuals = [u, ...data.mutuals];
    });
  }
});

async function act(btn, login, method, apply) {
  btn.disabled = true;
  btn.textContent = "…";
  try {
    await api(`/api/following/${login}`, { method });
    apply();
    for (const t of tabs.querySelectorAll(".tab")) {
      t.querySelector(".count").textContent = data[t.dataset.kind].length;
    }
    render();
  } catch (e) {
    btn.disabled = false;
    btn.textContent = btn.classList.contains("fans") ? "Follow back" : "Unfollow";
    toast(e.error || "Action failed.", e.hint);
  }
}

document.getElementById("refresh").addEventListener("click", load);

init();
