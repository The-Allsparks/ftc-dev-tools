import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "dist");
fs.mkdirSync(distDir, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(__dirname, "src/extension.ts")],
  bundle: true,
  outfile: path.join(distDir, "extension.js"),
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  target: "node20",
  sourcemap: true,
  sourcesContent: false,
  logLevel: "info",
});

console.log("Bundled VS Code extension to dist/extension.js");
