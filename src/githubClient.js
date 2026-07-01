const { execFileSync } = require("child_process");
const axios = require("axios");
const { API_BASE } = require("./config");

let cachedToken = null;

function getToken() {
  if (cachedToken) return cachedToken;
  try {
    cachedToken = execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
    }).trim();
  } catch {
    throw withMeta(new Error("GitHub CLI not authenticated."), 401, "gh auth login");
  }
  if (!cachedToken) {
    throw withMeta(new Error("Empty gh token."), 401, "gh auth login");
  }
  return cachedToken;
}

function withMeta(err, status, hint) {
  err.status = status;
  err.hint = hint;
  return err;
}

function client() {
  return axios.create({
    baseURL: API_BASE,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/vnd.github+json",
    },
  });
}

async function request(config) {
  try {
    return await client().request(config);
  } catch (e) {
    if (e.response && e.response.status === 401) {
      cachedToken = null; // token may have rotated — re-read once
      return await client().request(config);
    }
    throw e;
  }
}

async function getAll(path, extraParams = {}) {
  let items = [];
  let page = 1;
  for (;;) {
    const res = await request({
      url: path,
      params: { per_page: 100, page, ...extraParams },
    });
    items = items.concat(res.data);
    if ((res.headers.link || "").includes('rel="next"')) page += 1;
    else break;
  }
  return items;
}

const slim = (u) => ({
  login: u.login,
  avatarUrl: u.avatar_url,
  htmlUrl: u.html_url,
  name: u.name ?? null,
});

async function getViewer() {
  const { data } = await request({ url: "/user" });
  return slim(data);
}

async function getRelationships() {
  const [following, followers] = await Promise.all([
    getAll("/user/following"),
    getAll("/user/followers"),
  ]);
  const followerLogins = new Set(followers.map((u) => u.login));
  const followingLogins = new Set(following.map((u) => u.login));

  return {
    notFollowingBack: following.filter((u) => !followerLogins.has(u.login)).map(slim),
    fans: followers.filter((u) => !followingLogins.has(u.login)).map(slim),
    mutuals: following.filter((u) => followerLogins.has(u.login)).map(slim),
  };
}

const userCache = new Map();
async function getUser(login) {
  if (userCache.has(login)) return userCache.get(login);
  const { data } = await request({ url: `/users/${login}` });
  const user = slim(data);
  userCache.set(login, user);
  return user;
}

function asScopeError(e) {
  const status = e.response && e.response.status;
  if (status === 403 || status === 404) {
    return withMeta(
      new Error("This action needs the user:follow scope."),
      status,
      "gh auth refresh -s user:follow",
    );
  }
  return e;
}

const slimRepo = (r) => ({
  name: r.name,
  fullName: r.full_name,
  owner: r.owner.login,
  htmlUrl: r.html_url,
  description: r.description ?? null,
  private: r.private,
  fork: r.fork,
  stars: r.stargazers_count,
  language: r.language ?? null,
  updatedAt: r.updated_at,
});

async function getRepos() {
  const repos = await getAll("/user/repos", { affiliation: "owner", sort: "updated" });
  return repos.map(slimRepo);
}

function asRepoScopeError(e) {
  const status = e.response && e.response.status;
  if (status === 403 || status === 404) {
    return withMeta(
      new Error("This action needs the repo scope."),
      status,
      "gh auth refresh -s repo",
    );
  }
  return e;
}

async function setRepoVisibility(owner, repo, makePrivate) {
  try {
    const { data } = await request({
      method: "patch",
      url: `/repos/${owner}/${repo}`,
      data: { private: makePrivate },
    });
    return slimRepo(data);
  } catch (e) {
    throw asRepoScopeError(e);
  }
}

async function follow(login) {
  try {
    await request({ method: "put", url: `/user/following/${login}` });
  } catch (e) {
    throw asScopeError(e);
  }
}

async function unfollow(login) {
  try {
    await request({ method: "delete", url: `/user/following/${login}` });
  } catch (e) {
    throw asScopeError(e);
  }
}

module.exports = {
  getViewer,
  getRelationships,
  getUser,
  follow,
  unfollow,
  getRepos,
  setRepoVisibility,
};
