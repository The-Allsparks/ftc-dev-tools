import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { createReadStream } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const sharedRoot = path.resolve(packageRoot, "..", "shared");
const distDir = path.join(packageRoot, "dist");
const outDir = path.join(packageRoot, "artifacts");

const cliPkg = JSON.parse(await fs.readFile(path.join(packageRoot, "package.json"), "utf8"));
const version = cliPkg.version;
const archiveName = `ftc-cli-${version}.tar.gz`;
const archivePath = path.join(outDir, archiveName);

await fs.mkdir(outDir, { recursive: true });

// Portable npm package: dist + package.json + vendored @ftc-dev-tools/shared for offline global install.
const staging = path.join(outDir, "staging");
const pkgRoot = path.join(staging, "pkg");
await fs.rm(staging, { recursive: true, force: true });
await fs.mkdir(pkgRoot, { recursive: true });

await fs.cp(distDir, path.join(pkgRoot, "dist"), { recursive: true });
await fs.copyFile(path.join(packageRoot, "package.json"), path.join(pkgRoot, "package.json"));

const sharedStaging = path.join(pkgRoot, "node_modules", "@ftc-dev-tools", "shared");
await fs.mkdir(sharedStaging, { recursive: true });
await fs.cp(path.join(sharedRoot, "dist"), path.join(sharedStaging, "dist"), { recursive: true });
await fs.cp(path.join(sharedRoot, "schemas"), path.join(sharedStaging, "schemas"), {
  recursive: true,
});
await fs.copyFile(path.join(sharedRoot, "package.json"), path.join(sharedStaging, "package.json"));

const sharedIndex = path.join(sharedStaging, "dist", "index.js");
if (!(await fs.stat(sharedIndex).catch(() => null))) {
  console.error("Missing built shared package. Run npm run build from the repo root first.");
  process.exit(1);
}

async function trySystemTar() {
  const { spawn } = await import("node:child_process");
  await new Promise((resolve, reject) => {
    const child = spawn("tar", ["-czf", archivePath, "-C", pkgRoot, "."], {
      stdio: "inherit",
      shell: false,
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve(undefined) : reject(new Error(`tar exit ${code}`)),
    );
  });
}

try {
  await trySystemTar();
} catch {
  const files = [];
  async function walk(dir, prefix = "") {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.join(prefix, entry.name).replaceAll("\\", "/");
      if (entry.isDirectory()) {
        await walk(full, rel);
      } else {
        files.push({ path: rel, content: await fs.readFile(full, "utf8") });
      }
    }
  }
  await walk(pkgRoot, "");
  const fallbackPath = archivePath.replace(/\.tar\.gz$/, ".json.gz");
  const gzip = createGzip();
  const output = createWriteStream(fallbackPath);
  const { Readable } = await import("node:stream");
  await pipeline(Readable.from([JSON.stringify({ files }, null, 2)]), gzip, output);
  console.log(`Created ${fallbackPath}`);
  process.exit(0);
}

const checksumPath = `${archivePath}.sha256`;
const { createHash } = await import("node:crypto");
const hash = createHash("sha256");
await pipeline(createReadStream(archivePath), hash);
const digest = hash.digest("hex");
await fs.writeFile(checksumPath, `${digest}  ${path.basename(archivePath)}\n`, "utf8");
console.log(`Created ${archivePath}`);
console.log(`Checksum ${checksumPath}`);
console.log("Staged vendored dependency: node_modules/@ftc-dev-tools/shared");
