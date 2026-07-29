import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const extRoot = path.resolve(here, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(extRoot, "package.json"), "utf8"));
const outDir = path.join(extRoot, "artifacts");
fs.mkdirSync(outDir, { recursive: true });
const outFileName = `ftc-dev-tools-${pkg.version}.vsix`;
const outFileAbs = path.join(outDir, outFileName);
/** Relative path avoids vsce mis-parsing absolute Windows paths that contain spaces. */
const outFileArg = path.join("artifacts", outFileName);
const spawnOptions = {
  cwd: extRoot,
  stdio: "inherit",
  env: process.env,
  ...(process.platform === "win32" ? { shell: true } : {}),
};
const result = spawnSync("npx", ["vsce", "package", "--no-dependencies", "-o", outFileArg], spawnOptions);
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
console.log(`Created ${outFileAbs}`);
