#!/usr/bin/env node
/**
 * Dry-run release validation for FTC Dev Tools.
 * Usage: npm run release:check [-- --skip-package] [-- --allow-dirty]
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const skipPackage = args.has("--skip-package");
const allowDirty = args.has("--allow-dirty");
const errors = [];

function fail(message) {
  errors.push(message);
}

function readJson(rel) {
  const full = path.join(root, rel);
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function runNode(relScript, scriptArgs = []) {
  const result = spawnSync(process.execPath, [path.join(root, relScript), ...scriptArgs], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    fail(`${relScript} failed:\n${result.stdout ?? ""}${result.stderr ?? ""}`);
  }
}

console.log("release:check — validating FTC Dev Tools release readiness…");

// Identity / stale URLs
runNode("scripts/check-project-identity.mjs");

// Versions
const rootPkg = readJson("package.json");
const sharedPkg = readJson("packages/shared/package.json");
const cliPkg = readJson("packages/cli/package.json");
const mcpPkg = readJson("packages/mcp/package.json");
const extPkg = readJson("packages/vscode-extension/package.json");
const version = rootPkg.version;
for (const [name, pkg] of [
  ["shared", sharedPkg],
  ["cli", cliPkg],
  ["mcp", mcpPkg],
  ["extension", extPkg],
]) {
  if (pkg.version !== version) {
    fail(`Version mismatch: root is ${version} but ${name} is ${pkg.version}`);
  }
}

const constants = fs.readFileSync(path.join(root, "packages/shared/src/constants.ts"), "utf8");
if (!constants.includes(`PACKAGE_VERSION = "${version}"`)) {
  fail(`packages/shared/src/constants.ts PACKAGE_VERSION must equal ${version}`);
}

// Repository URLs
const expectedRepo = "https://github.com/The-Allsparks/ftc-dev-tools.git";
for (const [rel, pkg] of [
  ["package.json", rootPkg],
  ["packages/shared/package.json", sharedPkg],
  ["packages/cli/package.json", cliPkg],
  ["packages/mcp/package.json", mcpPkg],
  ["packages/vscode-extension/package.json", extPkg],
]) {
  const url = typeof pkg.repository === "string" ? pkg.repository : pkg.repository?.url;
  if (!url || !String(url).includes("The-Allsparks/ftc-dev-tools")) {
    fail(`${rel}: repository URL must point at The-Allsparks/ftc-dev-tools (found ${url})`);
  }
  if (String(url).includes("github.com/ftc-dev-tools/ftc-dev-tools")) {
    fail(`${rel}: stale repository org URL`);
  }
}

// Publisher format (Marketplace ID, not display name)
const publisher = extPkg.publisher;
if (typeof publisher !== "string" || !/^[a-z0-9][a-z0-9-]*$/i.test(publisher)) {
  fail(
    `Extension publisher must be a Marketplace publisher ID (found ${JSON.stringify(publisher)})`,
  );
}
if (publisher.includes(" ")) {
  fail("Extension publisher must not contain spaces (publisher ID ≠ display name)");
}

// Icon + metadata
if (!extPkg.icon) {
  fail('packages/vscode-extension/package.json missing "icon" field');
} else if (!exists(path.join("packages/vscode-extension", extPkg.icon))) {
  fail(`Extension icon missing: packages/vscode-extension/${extPkg.icon}`);
}
if (extPkg.displayName !== "FTC Dev Tools") {
  fail(`displayName must be "FTC Dev Tools" (found ${JSON.stringify(extPkg.displayName)})`);
}

// Licenses
for (const rel of ["LICENSE", "packages/vscode-extension/LICENSE", "NOTICE"]) {
  if (!exists(rel)) fail(`Missing ${rel}`);
}
for (const [rel, pkg] of [
  ["package.json", rootPkg],
  ["packages/shared/package.json", sharedPkg],
  ["packages/cli/package.json", cliPkg],
  ["packages/mcp/package.json", mcpPkg],
  ["packages/vscode-extension/package.json", extPkg],
]) {
  if (pkg.license !== "Apache-2.0") fail(`${rel}: license must be Apache-2.0`);
}

// CHANGELOG
if (!exists("CHANGELOG.md")) {
  fail("Missing CHANGELOG.md");
} else {
  const changelog = fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8");
  if (!changelog.includes(`## [${version}]`) && !changelog.includes(`## ${version}`)) {
    fail(`CHANGELOG.md must include an entry for version ${version}`);
  }
}

// README clone link
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
if (
  !readme.includes(expectedRepo.replace(/\.git$/, ".git")) &&
  !readme.includes("The-Allsparks/ftc-dev-tools")
) {
  fail("README.md must document The-Allsparks/ftc-dev-tools clone URL");
}
if (readme.includes("github.com/ftc-dev-tools/ftc-dev-tools")) {
  fail("README.md contains stale repository URL");
}

// Branding / publishing docs
if (!exists("docs/branding-and-publishing.md")) {
  fail("Missing docs/branding-and-publishing.md");
}

// Snippets (when contributed)
if (Array.isArray(extPkg.contributes?.snippets)) {
  for (const snippet of extPkg.contributes.snippets) {
    const snippetPath = path.join("packages/vscode-extension", snippet.path);
    if (!exists(snippetPath)) fail(`Missing snippet file: ${snippetPath}`);
  }
}

// Git cleanliness
if (!allowDirty) {
  try {
    const status = execFileSync("git", ["status", "--porcelain"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    if (status) {
      fail(
        `Working tree is dirty (pass --allow-dirty to skip). Status:\n${status.split("\n").slice(0, 20).join("\n")}`,
      );
    }
  } catch {
    fail("Unable to determine git status (is git installed?)");
  }
}

// Package artifacts
if (!skipPackage) {
  console.log("Building and packaging CLI + VSIX…");
  const build = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });
  if (build.status !== 0) {
    fail(`npm run build failed:\n${build.stdout ?? ""}${build.stderr ?? ""}`);
  } else {
    for (const script of ["package:cli", "package:extension"]) {
      const packed = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", script], {
        cwd: root,
        encoding: "utf8",
        shell: true,
      });
      if (packed.status !== 0) {
        fail(`npm run ${script} failed:\n${packed.stdout ?? ""}${packed.stderr ?? ""}`);
      }
    }
    const cliArtifacts = path.join(root, "packages/cli/artifacts");
    const extArtifacts = path.join(root, "packages/vscode-extension/artifacts");
    if (!fs.existsSync(cliArtifacts) || fs.readdirSync(cliArtifacts).length === 0) {
      fail("CLI package artifacts missing after package:cli");
    }
    const vsix = fs.existsSync(extArtifacts)
      ? fs.readdirSync(extArtifacts).filter((f) => f.endsWith(".vsix"))
      : [];
    if (vsix.length === 0) {
      fail("VSIX missing after package:extension");
    }
  }
}

if (errors.length) {
  console.error("\nrelease:check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("release:check passed.");
