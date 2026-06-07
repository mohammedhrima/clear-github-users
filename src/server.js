const express = require("express");
const path = require("path");
const { PORT } = require("./config");
const routes = require("./routes");
const swagger = require("./swagger");

const app = express();
app.use(express.json());
app.use("/api", routes);
app.use("/docs", swagger.serve, swagger.setup);
app.use(express.static(path.join(__dirname, "..", "public")));

app.listen(PORT, () => {
  console.log(`clear-github-users → http://localhost:${PORT}`);
});
