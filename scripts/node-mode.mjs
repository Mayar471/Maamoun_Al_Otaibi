import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const mode = process.argv[2];
if (!["dev", "build", "start", "test"].includes(mode)) throw new Error("Expected dev, build, start, or test");
const cli = fileURLToPath(new URL("../node_modules/vinext/dist/cli.js", import.meta.url));
const args = mode === "test" ? ["--test", "tests/cms.integration.test.mjs"] : [cli, mode, ...process.argv.slice(3)];
const child = spawn(process.execPath, args, {
  env: { ...process.env, CMS_STORAGE_DRIVER: "node" }, stdio: "inherit", windowsHide: true,
});
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
