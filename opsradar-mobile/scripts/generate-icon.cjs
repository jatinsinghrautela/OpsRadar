const fs = require("fs");
const path = require("path");
async function main() {
  const { Resvg } = require("@resvg/resvg-js");
  const root = path.resolve(__dirname, "..");
  const image = new Resvg(
    fs.readFileSync(path.join(root, "assets/opsradar-icon.svg")),
  )
    .render()
    .asPng();
  fs.writeFileSync(path.join(root, "assets/opsradar-icon.png"), image);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
