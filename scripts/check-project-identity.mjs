#!/usr/bin/env node
/**
 * Lightweight checks that FTC Dev Tools project identity stays consistent.
 * Validates required concepts and file presence — not brittle full-paragraph matches.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warnings = [];

function read(rel) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    errors.push(`Missing required file: ${rel}`);
    return null;
  }
  return fs.readFileSync(full, "utf8");
}

function mustInclude(rel, text, needle, hint) {
  if (text === null) return;
  if (!text.includes(needle)) {
    errors.push(`${rel}: expected to contain ${JSON.stringify(needle)}. ${hint ?? ""}`.trim());
  }
}

function mustMatch(rel, text, regex, hint) {
  if (text === null) return;
  if (!regex.test(text)) {
    errors.push(`${rel}: expected to match ${regex}. ${hint ?? ""}`.trim());
  }
}

function mustNotMatch(rel, text, regex, hint) {
  if (text === null) return;
  if (regex.test(text)) {
    errors.push(`${rel}: must not match ${regex}. ${hint ?? ""}`.trim());
  }
}

function parseJson(rel) {
  const text = read(rel);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    errors.push(`${rel}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    return null;
  }
}

const expectedRepo = "The-Allsparks/ftc-dev-tools";
const expectedRepoUrl = `https://github.com/${expectedRepo}`;
const staleOrg = "github.com/ftc-dev-tools/ftc-dev-tools";

// --- Required identity files ---
const readme = read("README.md");
const governance = read("GOVERNANCE.md");
const authors = read("AUTHORS.md");
const notice = read("NOTICE");
read("docs/project-principles.md");
read("docs/team-use.md");
read("LICENSE");

mustInclude(
  "README.md",
  readme,
  "# FTC Dev Tools",
  "Keep the public project name as FTC Dev Tools.",
);
mustInclude("README.md", readme, "Built by The Allsparks", "Preserve the provenance heading.");
mustInclude("README.md", readme, "The Allsparks", "README should credit The Allsparks.");
mustMatch(
  "README.md",
  readme,
  /not[\s*_]*(officially[\s*_]*)?(affiliated|endorsed)/i,
  "README disclaimer must deny official affiliation/endorsement.",
);
mustInclude("README.md", readme, "GOVERNANCE.md", "Link to governance from the README.");
mustInclude("README.md", readme, "AUTHORS.md", "Link to AUTHORS.md from the README.");
mustInclude(
  "README.md",
  readme,
  "docs/project-principles.md",
  "Link to project principles from the README.",
);
mustInclude("README.md", readme, "docs/team-use.md", "Link to team-use docs from the README.");
mustInclude("README.md", readme, expectedRepoUrl, `Clone/docs URLs should use ${expectedRepoUrl}.`);
mustNotMatch(
  "README.md",
  readme,
  /official\s+(FIRST|REV|Microsoft|Anysphere)\s+(product|project|tool)/i,
  "Do not claim official vendor product status.",
);
mustNotMatch(
  "README.md",
  readme,
  new RegExp(staleOrg.replace(/\./g, "\\.")),
  "Stale GitHub org URL.",
);

mustInclude(
  "GOVERNANCE.md",
  governance,
  "The Allsparks",
  "Governance must name founding stewards.",
);
mustInclude(
  "GOVERNANCE.md",
  governance,
  "not officially affiliated",
  "Governance independence statement required.",
);
mustInclude("AUTHORS.md", authors, "The Allsparks", "AUTHORS.md must name founding organization.");
mustInclude("NOTICE", notice, "The Allsparks", "NOTICE must credit The Allsparks.");
mustInclude(
  "NOTICE",
  notice,
  "not officially affiliated",
  "NOTICE must deny official affiliation.",
);
mustInclude("NOTICE", notice, "LICENSE", "NOTICE should point readers to LICENSE.");

// --- Package metadata ---
const packageFiles = [
  "package.json",
  "packages/cli/package.json",
  "packages/shared/package.json",
  "packages/vscode-extension/package.json",
];

for (const rel of packageFiles) {
  const pkg = parseJson(rel);
  if (!pkg) continue;

  if (pkg.license !== "Apache-2.0") {
    errors.push(`${rel}: license must remain Apache-2.0 (found ${JSON.stringify(pkg.license)}).`);
  }

  const authorName =
    typeof pkg.author === "string"
      ? pkg.author
      : pkg.author && typeof pkg.author === "object"
        ? pkg.author.name
        : undefined;
  if (!authorName || !/Allsparks/i.test(authorName)) {
    errors.push(
      `${rel}: author should identify The Allsparks contributors (found ${JSON.stringify(pkg.author)}).`,
    );
  }

  const repoUrl =
    typeof pkg.repository === "string"
      ? pkg.repository
      : pkg.repository && typeof pkg.repository === "object"
        ? pkg.repository.url
        : undefined;
  if (repoUrl && !repoUrl.includes(expectedRepo)) {
    errors.push(`${rel}: repository URL must point to ${expectedRepo} (found ${repoUrl}).`);
  }
  if (repoUrl && repoUrl.includes(staleOrg)) {
    errors.push(`${rel}: repository URL uses stale org ${staleOrg}.`);
  }

  if (pkg.homepage && !String(pkg.homepage).includes(expectedRepo)) {
    errors.push(`${rel}: homepage should point to ${expectedRepoUrl}.`);
  }

  // Guard against accidental rebranding to an unrelated org while keeping npm scope.
  if (typeof pkg.name === "string") {
    if (pkg.name === "ftc-dev-tools" || pkg.name.startsWith("@ftc-dev-tools/")) {
      // expected product / scope names
    } else if (/first|rev-robotics|microsoft|anysphere/i.test(pkg.name)) {
      errors.push(
        `${rel}: package name ${JSON.stringify(pkg.name)} looks like an unrelated organization identity.`,
      );
    }
  }
}

const extensionPkg = parseJson("packages/vscode-extension/package.json");
if (extensionPkg) {
  if (extensionPkg.displayName !== "FTC Dev Tools") {
    errors.push(
      `packages/vscode-extension/package.json: displayName must remain "FTC Dev Tools" (found ${JSON.stringify(extensionPkg.displayName)}).`,
    );
  }
}

const rootPkg = parseJson("package.json");
if (
  rootPkg &&
  rootPkg.scripts &&
  rootPkg.scripts["check:identity"] !== "node scripts/check-project-identity.mjs"
) {
  errors.push(
    'package.json: scripts.check:identity must run "node scripts/check-project-identity.mjs".',
  );
}

// --- Schema / constants URLs ---
const schema = parseJson("packages/shared/schemas/ftc-dev.schema.json");
if (schema && schema.$id && !String(schema.$id).includes(expectedRepo)) {
  errors.push(`packages/shared/schemas/ftc-dev.schema.json: $id must reference ${expectedRepo}.`);
}

const constants = read("packages/shared/src/constants.ts");
mustInclude(
  "packages/shared/src/constants.ts",
  constants,
  expectedRepo,
  "Schema URL constant must use The-Allsparks/ftc-dev-tools.",
);
mustNotMatch(
  "packages/shared/src/constants.ts",
  constants,
  new RegExp(staleOrg.replace(/\./g, "\\.")),
  "Stale GitHub org URL.",
);

// --- Local documentation link resolution (README + docs + root community files) ---
const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
const markdownRoots = [
  ...fs
    .readdirSync(root)
    .filter((name) => name.endsWith(".md"))
    .map((name) => path.join(root, name)),
  ...fs
    .readdirSync(path.join(root, "docs"))
    .filter((name) => name.endsWith(".md"))
    .map((name) => path.join(root, "docs", name)),
];

for (const filePath of markdownRoots) {
  const text = fs.readFileSync(filePath, "utf8");
  const rel = path.relative(root, filePath).replaceAll("\\", "/");
  for (const match of text.matchAll(linkPattern)) {
    const target = match[2];
    if (
      target.startsWith("http") ||
      target.startsWith("#") ||
      target.startsWith("mailto:") ||
      target.startsWith("vscode:")
    ) {
      continue;
    }
    const cleaned = target.split("#", 1)[0];
    if (!cleaned) continue;
    const candidate = path.resolve(path.dirname(filePath), cleaned);
    if (!fs.existsSync(candidate)) {
      errors.push(`${rel}: broken local link ${JSON.stringify(target)}`);
    }
  }

  if (text.includes(staleOrg)) {
    errors.push(`${rel}: contains stale repository URL ${staleOrg}.`);
  }
}

// --- CODEOWNERS should not invent fake owners ---
const codeowners = read(".github/CODEOWNERS");
if (codeowners !== null) {
  const ownerLines = codeowners
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  for (const line of ownerLines) {
    if (/@The-Allsparks\/</.test(line) || /maintainer-team-slug/.test(line)) {
      errors.push(
        ".github/CODEOWNERS: placeholder team slug must remain commented until a real GitHub team exists.",
      );
    }
  }
  if (ownerLines.length === 0) {
    warnings.push(
      ".github/CODEOWNERS has no active ownership rules yet (manual follow-up: create a maintainer team).",
    );
  }
}

if (warnings.length) {
  console.warn("Project identity warnings:");
  for (const warning of warnings) console.warn(`- ${warning}`);
}

if (errors.length) {
  console.error("Project identity check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Project identity check passed.");
