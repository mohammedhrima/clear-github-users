const grid = document.getElementById("grid");
const state = document.getElementById("state");
const toastEl = document.getElementById("toast");
const meEl = document.getElementById("me");
const repobar = document.getElementById("repobar");
const filterEl = document.getElementById("filter");
const pubCountEl = document.getElementById("pubCount");
const privCountEl = document.getElementById("privCount");

let repos = [];

async function api(path, options) {
  const res = await fetch(path, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw body;
  return body;
}

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

// A toast that can carry an Undo action (success) or a hint (error).
function toast(message, { hint, onUndo } = {}) {
  toastEl.classList.toggle("ok", Boolean(onUndo));
  let html = esc(message);
  if (hint) html += ` <code>${esc(hint)}</code>`;
  if (onUndo) html += ` <button class="undo">Undo</button>`;
  toastEl.innerHTML = html;
  toastEl.hidden = false;
  if (onUndo) {
    toastEl.querySelector(".undo").addEventListener("click", () => {
      toastEl.hidden = true;
      onUndo();
    });
  }
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (toastEl.hidden = true), 6000);
}

async function init() {
  try {
    const me = await api("/api/me");
    meEl.href = me.htmlUrl;
    meEl.innerHTML = `<img src="${esc(me.avatarUrl)}" alt="" /><span>@${esc(me.login)}</span>`;
    meEl.hidden = false;
  } catch (e) {
    state.innerHTML = `${esc(e.error || "Not authenticated.")} <code>${esc(e.hint || "gh auth login")}</code>`;
    return;
  }
  await load();
}

async function load() {
  state.hidden = false;
  state.textContent = "Loading…";
  grid.hidden = true;
  repobar.hidden = true;
  try {
    repos = await api("/api/repos");
  } catch (e) {
    state.innerHTML = `${esc(e.error || "Failed to load.")} ${e.hint ? `<code>${esc(e.hint)}</code>` : ""}`;
    return;
  }
  repobar.hidden = false;
  render();
}

function render() {
  const q = filterEl.value.trim().toLowerCase();
  const list = q
    ? repos.filter((r) => r.name.toLowerCase().includes(q))
    : repos;

  pubCountEl.textContent = repos.filter((r) => !r.private).length;
  privCountEl.textContent = repos.filter((r) => r.private).length;

  if (!list.length) {
    grid.hidden = true;
    state.hidden = false;
    state.textContent = repos.length ? "No repos match." : "No repos 🎉";
    return;
  }
  state.hidden = true;
  grid.hidden = false;
  grid.innerHTML = list.map(card).join("");
}

function card(r) {
  const vis = r.private ? "private" : "public";
  const sub = [
    r.language ? esc(r.language) : null,
    r.stars ? `★ ${r.stars}` : null,
    r.fork ? "fork" : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return `
    <article class="card repo-card" data-name="${esc(r.name)}">
      <a class="card-link" href="${esc(r.htmlUrl)}" target="_blank" rel="noopener">
        <span class="meta">
          <span class="name">${esc(r.name)}</span>
          <span class="login">@${esc(r.owner)}/${esc(r.name)}</span>
          ${r.description ? `<span class="desc">${esc(r.description)}</span>` : ""}
          ${sub ? `<span class="sub">${sub}</span>` : ""}
        </span>
      </a>
      <button class="repo-toggle ${vis}" data-name="${esc(r.name)}" title="Click to make ${r.private ? "public" : "private"}">
        ${r.private ? "Private" : "Public"}
      </button>
    </article>`;
}

async function toggle(repo, btn) {
  const target = !repo.private; // the new visibility we want
  btn.disabled = true;
  try {
    const updated = await api(
      `/api/repos/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.name)}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ private: target }),
      },
    );
    repo.private = updated.private;
    render();
    toast(
      `${repo.name} is now ${repo.private ? "private" : "public"}.`,
      { onUndo: () => toggleTo(repo, !repo.private) },
    );
  } catch (e) {
    btn.disabled = false;
    toast(e.error || "Couldn't change visibility.", { hint: e.hint });
  }
}

// Used by Undo: flip a repo to an explicit visibility, finding its live button.
async function toggleTo(repo, makePrivate) {
  if (repo.private === makePrivate) return;
  const btn = grid.querySelector(`.repo-toggle[data-name="${CSS.escape(repo.name)}"]`);
  await toggle(repo, btn || document.createElement("button"));
}

grid.addEventListener("click", (e) => {
  const btn = e.target.closest(".repo-toggle");
  if (!btn) return;
  e.preventDefault();
  const repo = repos.find((r) => r.name === btn.dataset.name);
  if (repo) toggle(repo, btn);
});

filterEl.addEventListener("input", render);
document.getElementById("refresh").addEventListener("click", load);

init();
