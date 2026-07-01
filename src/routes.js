const express = require("express");
const gh = require("./githubClient");

const router = express.Router();

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((e) => {
    const status = e.status || (e.response && e.response.status) || 500;
    const error =
      e.message ||
      (e.response && e.response.data && e.response.data.message) ||
      "Request failed";
    res.status(status).json({ error, hint: e.hint });
  });

router.get("/me", wrap(async (_req, res) => res.json(await gh.getViewer())));

router.get("/relationships", wrap(async (_req, res) =>
  res.json(await gh.getRelationships()),
));

router.get("/user/:login", wrap(async (req, res) =>
  res.json(await gh.getUser(req.params.login)),
));

router.put("/following/:login", wrap(async (req, res) => {
  await gh.follow(req.params.login);
  res.json({ ok: true });
}));

router.delete("/following/:login", wrap(async (req, res) => {
  await gh.unfollow(req.params.login);
  res.json({ ok: true });
}));

router.get("/repos", wrap(async (_req, res) => res.json(await gh.getRepos())));

router.patch("/repos/:owner/:repo", wrap(async (req, res) => {
  const updated = await gh.setRepoVisibility(
    req.params.owner,
    req.params.repo,
    Boolean(req.body.private),
  );
  res.json(updated);
}));

module.exports = router;
