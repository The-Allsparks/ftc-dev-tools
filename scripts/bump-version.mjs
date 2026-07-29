#!/usr/bin/env node
/**
 * Patch-bump monorepo version, PACKAGE_VERSION, and CHANGELOG.
 * Used by .github/workflows/epic-release-tag.yml when an epic issue closes.
 *
 * Env: EPIC_ISSUE (number), EPIC_TITLE (string). Optional: DRY_RUN=1
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

const epicIssue = process.env.EPIC_ISSUE?.trim();
const epicTitle = process.env.EPIC_TITLE?.trim() ?? "";
if (!epicIssue) {
  console.error("bump-version: EPIC_ISSUE is required");
  process.exit(1);
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

function writeJson(rel, data) {
  const full = path.join(root, rel);
  fs.writeFileSync(full, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function bumpPatch(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(.*)$/.exec(version);
  if (!match) {
    throw new Error(`Unsupported semver: ${version}`);
  }
  const patch = Number.parseInt(match[3], 10) + 1;
  return `${match[1]}.${match[2]}.${patch}${match[4]}`;
}

const rootPkg = readJson("package.json");
const nextVersion = bumpPatch(rootPkg.version);

const versionFiles = [
  "package.json",
  "packages/shared/package.json",
  "packages/cli/package.json",
  "packages/mcp/package.json",
  "packages/vscode-extension/package.json",
];

for (const rel of versionFiles) {
  const pkg = readJson(rel);
  pkg.version = nextVersion;
  if (!dryRun) writeJson(rel, pkg);
}

const constantsRel = "packages/shared/src/constants.ts";
const constantsPath = path.join(root, constantsRel);
let constants = fs.readFileSync(constantsPath, "utf8");
const versionLine = `export const PACKAGE_VERSION = "${nextVersion}";`;
if (!constants.includes('export const PACKAGE_VERSION = "')) {
  throw new Error(`${constantsRel}: PACKAGE_VERSION line not found`);
}
constants = constants.replace(/export const PACKAGE_VERSION = "[^"]+";/, versionLine);
if (!dryRun) fs.writeFileSync(constantsPath, constants, "utf8");

const date = new Date().toISOString().slice(0, 10);
const changelogRel = "CHANGELOG.md";
const changelogPath = path.join(root, changelogRel);
const changelog = fs.readFileSync(changelogPath, "utf8");
const entry = [
  "",
  `## [${nextVersion}] - ${date}`,
  "",
  "### Changed",
  "",
  `- Release after closing epic #${epicIssue}: ${epicTitle}`,
  "",
].join("\n");

const firstReleaseHeading = changelog.search(/\n## \[/);
if (firstReleaseHeading === -1) {
  throw new Error(`${changelogRel}: no ## [version] heading found`);
}
const updatedChangelog =
  changelog.slice(0, firstReleaseHeading) + entry + changelog.slice(firstReleaseHeading);
if (!dryRun) fs.writeFileSync(changelogPath, updatedChangelog, "utf8");

console.log(`bump-version: ${rootPkg.version} → ${nextVersion}${dryRun ? " (dry run)" : ""}`);
