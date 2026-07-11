# github-management

A small local tool to manage your GitHub account from a visual UI — your **follow
relationships** (who you follow that doesn't follow you back, who follows you that **you**
don't follow back, and your mutuals) and your **repositories** (browse what you own and flip a
repo public ↔ private) — all from one page.

No tokens to paste: it authenticates through your local **GitHub CLI** (`gh`).

## Features

### Followers

- **Three tabs** with live counts: **Not following back** (Unfollow), **Fans** — they follow
  you, you don't (Follow back), and **Mutuals**.
- **Visual cards** — avatar, name, `@login`; click a card to open the person's GitHub profile.
- **One-click unfollow / follow back**, with the list updating instantly.

### Repos

- **Your repositories** (owned, most-recently-updated first) with a **live name filter** and
  running **public / private counts**.
- **Toggle visibility** — one click flips a repo public ↔ private, with an **Undo** in the
  toast if you change your mind.
- **Cards** show the repo name, description, and `language · ★ stars · fork`.

### Everywhere

- A top-level **Followers / Repos** nav to switch pages.
- **No token in the code.** Auth is read from the GitHub CLI at runtime (`gh auth token`).
- **Swagger API docs** at `/docs`.

## Requirements

The [GitHub CLI](https://cli.github.com) installed and logged in:

```bash
gh auth login
```

Reading your followers / following and repositories works with the default login. Some actions
need an extra scope, granted once (the app tells you which if you try an action without it):

```bash
gh auth refresh -s user:follow   # to unfollow / follow back
gh auth refresh -s repo          # to change a repo's visibility
```

## Run

```bash
npm install
npm start
```

Open http://localhost:3000. (Set `PORT` to use a different port.)

## How it works

- **Express** backend (`src/`): resolves the token via `gh auth token`, then fetches your
  `following` / `followers` (paginated) to compute the three sets and lists your owned repos —
  and can follow / unfollow a user or change a repo's visibility. Display names are fetched
  lazily and cached.
- **Vanilla** frontend (`public/`): a Followers page (tabs + a grid of user cards) and a Repos
  page (filter, counts + a grid of repo cards), sharing an Undo/hint toast.

```
src/
├─ server.js        # express app: static + /api + /docs
├─ config.js
├─ githubClient.js  # gh auth token, GitHub calls, set math, repos
├─ routes.js        # /api/me, /relationships, /user/:login, follow/unfollow, /repos
└─ swagger.js
public/             # index.html · app.js · repos.html · repos-app.js · style.css
```

### API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/me` | The authenticated user |
| GET | `/api/relationships` | `{ notFollowingBack, fans, mutuals }` |
| GET | `/api/user/:login` | Public profile (name, avatar, url) |
| PUT | `/api/following/:login` | Follow a user *(needs `user:follow`)* |
| DELETE | `/api/following/:login` | Unfollow a user *(needs `user:follow`)* |
| GET | `/api/repos` | Your owned repositories |
| PATCH | `/api/repos/:owner/:repo` | Set visibility — body `{ private: boolean }` *(needs `repo`)* |
