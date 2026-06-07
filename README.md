# clear-github-users

A small local tool to see your GitHub relationships at a glance — **who you follow that
doesn't follow you back**, who follows you that **you** don't follow back, and your mutuals —
with a visual UI to unfollow (or follow back) right from the page.

No tokens to paste: it authenticates through your local **GitHub CLI** (`gh`).

## Features

- **Three tabs** with live counts: **Not following back** (Unfollow), **Fans** — they follow
  you, you don't (Follow back), and **Mutuals**.
- **Visual cards** — avatar, name, `@login`; click a card to open the person's GitHub profile.
- **One-click unfollow / follow back**, with the list updating instantly.
- **No token in the code.** Auth is read from the GitHub CLI at runtime (`gh auth token`).
- **Swagger API docs** at `/docs`.

## Requirements

The [GitHub CLI](https://cli.github.com) installed and logged in:

```bash
gh auth login
```

Reading your followers/following works with the default login. To **unfollow / follow** from
the UI, grant the follow scope once:

```bash
gh auth refresh -s user:follow
```

(The app tells you this if you try an action without it.)

## Run

```bash
npm install
npm start
```

Open http://localhost:3000. (Set `PORT` to use a different port.)

## How it works

- **Express** backend (`src/`): resolves the token via `gh auth token`, fetches your
  `following` / `followers` (paginated), and computes the three sets. Display names are fetched
  lazily and cached.
- **Vanilla** frontend (`public/`): tabs + a responsive grid of user cards.

```
src/
├─ server.js        # express app: static + /api + /docs
├─ config.js
├─ githubClient.js  # gh auth token, GitHub calls, set math
├─ routes.js        # /api/me, /api/relationships, /api/user/:login, follow/unfollow
└─ swagger.js
public/             # index.html · app.js · style.css
```

### API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/me` | The authenticated user |
| GET | `/api/relationships` | `{ notFollowingBack, fans, mutuals }` |
| GET | `/api/user/:login` | Public profile (name, avatar, url) |
| PUT | `/api/following/:login` | Follow a user *(needs `user:follow`)* |
| DELETE | `/api/following/:login` | Unfollow a user *(needs `user:follow`)* |
