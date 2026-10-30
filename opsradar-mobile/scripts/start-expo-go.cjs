// Expo Go and account commands share one private Expo home on the project drive.
// No Gradle, native compilation, emulator or cloud build.
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const project = path.resolve(__dirname, "..");
const cache = path.resolve(project, "../.cache");
const directory = (name) => {
  const value = path.join(cache, name);
  fs.mkdirSync(value, { recursive: true });
  return value;
};
const env = {
  ...process.env,
  TEMP: directory("tmp"),
  TMP: directory("tmp"),
  TMPDIR: directory("tmp"),
  npm_config_cache: directory("npm"),
  __UNSAFE_EXPO_HOME_DIRECTORY: directory("expo"),
  EXPO_NO_TELEMETRY: "1",
};
const cli = path.join(
  path.dirname(require.resolve("expo/package.json")),
  "bin/cli",
);
const argumentsFromUser = process.argv.slice(2);
const cliArguments =
  argumentsFromUser[0] === "--cli"
    ? argumentsFromUser.slice(1)
    : ["start", "--go", ...argumentsFromUser];
const child = spawn(process.execPath, [cli, ...cliArguments], {
  cwd: project,
  env,
  stdio: "inherit",
});
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
