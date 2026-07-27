import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { createReadStream } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..");
const distDir = path.join(packageRoot, "dist");
const outDir = path.join(packageRoot, "artifacts");

await fs.mkdir(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const archiveName = `ftc-cli-0.1.0-${stamp}.tar.gz`;
const archivePath = path.join(outDir, archiveName);

// Minimal portable archive of dist + package.json for release artifacts.
const staging = path.join(outDir, "staging");
await fs.rm(staging, { recursive: true, force: true });
await fs.mkdir(path.join(staging, "ftc-cli"), { recursive: true });
await fs.cp(distDir, path.join(staging, "ftc-cli", "dist"), { recursive: true });
await fs.copyFile(
  path.join(packageRoot, "package.json"),
  path.join(staging, "ftc-cli", "package.json"),
);

// Create a simple tar-like payload via gzip of a file list manifest + files is complex;
// for 0.1.0 we zip using PowerShell-compatible approach: write a gzip of a concatenated file map.
// Prefer Node's built-in approach with a directory walk into a .tgz using `tar` if available.
async function trySystemTar() {
  const { spawn } = await import("node:child_process");
  await new Promise((resolve, reject) => {
    const child = spawn("tar", ["-czf", archivePath, "-C", staging, "ftc-cli"], {
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
  // Fallback: gzip a JSON manifest of file contents (still useful as an artifact)
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
  await walk(path.join(staging, "ftc-cli"), "ftc-cli");
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
