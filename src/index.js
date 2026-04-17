const app = require("./app");

const PORT = 8088;
app.listen(PORT, () => {
  console.log(`upsa-file-extract-server listening on http://localhost:${PORT}`);
});
