const app = require("./app");

const port = Number(process.env.PORT || 8088);
app.listen(port, () => {
  console.log(`upsa-file-extract-server listening on http://localhost:${port}`);
});
