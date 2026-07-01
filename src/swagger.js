const swaggerUi = require("swagger-ui-express");

const login = {
  name: "login",
  in: "path",
  required: true,
  schema: { type: "string" },
};
const ok = { 200: { description: "OK" } };

const spec = {
  openapi: "3.0.0",
  info: {
    title: "clear-github-users API",
    version: "1.0.0",
    description:
      "Find who you follow that doesn't follow you back (and vice versa), and follow/unfollow. Auth comes from the local GitHub CLI (gh auth token).",
  },
  paths: {
    "/api/me": {
      get: { summary: "The authenticated GitHub user", responses: ok },
    },
    "/api/relationships": {
      get: {
        summary: "notFollowingBack, fans, and mutuals",
        responses: ok,
      },
    },
    "/api/user/{login}": {
      get: {
        summary: "Public profile for a user (name, avatar, url)",
        parameters: [login],
        responses: ok,
      },
    },
    "/api/following/{login}": {
      put: {
        summary: "Follow a user (needs the user:follow scope)",
        parameters: [login],
        responses: ok,
      },
      delete: {
        summary: "Unfollow a user (needs the user:follow scope)",
        parameters: [login],
        responses: ok,
      },
    },
    "/api/repos": {
      get: { summary: "Repos you own (name, owner, visibility, url)", responses: ok },
    },
    "/api/repos/{owner}/{repo}": {
      patch: {
        summary: "Set a repo public/private (needs the repo scope)",
        parameters: [
          { name: "owner", in: "path", required: true, schema: { type: "string" } },
          { name: "repo", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { private: { type: "boolean" } },
                required: ["private"],
              },
            },
          },
        },
        responses: ok,
      },
    },
  },
};

module.exports = { serve: swaggerUi.serve, setup: swaggerUi.setup(spec) };
