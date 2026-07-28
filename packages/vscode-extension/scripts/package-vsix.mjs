import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const extRoot = path.resolve(here, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(extRoot, "package.json"), "utf8"));
const outDir = path.join(extRoot, "artifacts");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, `ftc-dev-tools-${pkg.version}.vsix`);
execFileSync("npx", ["vsce", "package", "--no-dependencies", "-o", outFile], {
  cwd: extRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
});
