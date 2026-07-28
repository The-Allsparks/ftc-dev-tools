#!/usr/bin/env node
/**
 * Validate and apply GitHub issue labels from scripts/issue-label-catalog.json.
 *
 * Usage:
 *   node scripts/issue-labels.mjs validate [--repo OWNER/NAME]
 *   node scripts/issue-labels.mjs apply [--repo OWNER/NAME] [--dry-run]
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = "The-Allsparks/ftc-dev-tools";

const PRIORITY_LABELS = ["priority: P0", "priority: P1", "priority: P2"];
const SURFACE_LABELS = new Set([
  "shared-core",
  "vscode",
  "cli",
  "mcp",
  "vision",
  "documentation",
  "architecture",
]);
const TRIAGE_LABELS = new Set([
  "bug",
  "enhancement",
  "documentation",
  "question",
  "duplicate",
  "invalid",
  "wontfix",
  "good first issue",
  "help wanted",
]);

function parseArgs(argv) {
  const args = { repo: DEFAULT_REPO, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--repo") args.repo = argv[++i];
    else if (arg === "validate" || arg === "apply") args.command = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.command) throw new Error("Command required: validate | apply");
  return args;
}

function ghJson(args) {
  const out = execFileSync("gh", args, { encoding: "utf8" });
  return out.trim() ? JSON.parse(out) : [];
}

function loadCatalog() {
  const path = join(__dirname, "issue-label-catalog.json");
  const data = JSON.parse(readFileSync(path, "utf8"));
  if (!data.issues || typeof data.issues !== "object") {
    throw new Error("issue-label-catalog.json must contain an issues object");
  }
  return data.issues;
}

function listIssues(repo) {
  return ghJson([
    "issue",
    "list",
    "--repo",
    repo,
    "--state",
    "all",
    "--limit",
    "500",
    "--json",
    "number,title,labels,state",
  ]);
}

function missingLabels(actual, expected) {
  const have = new Set(actual.map((l) => l.name));
  return expected.filter((name) => !have.has(name));
}

function hasPriority(labels) {
  return labels.some((l) => PRIORITY_LABELS.includes(l.name));
}

function hasSurfaceOrEpic(labels) {
  if (labels.some((l) => l.name === "epic")) return true;
  return labels.some((l) => SURFACE_LABELS.has(l.name));
}

function validateIssue(issue, catalog) {
  const problems = [];
  const names = issue.labels.map((l) => l.name);
  const expected = catalog[issue.title];

  if (expected) {
    const missing = missingLabels(issue.labels, expected);
    if (missing.length) {
      problems.push(`catalog missing labels: ${missing.join(", ")}`);
    }
  } else if (issue.state === "open") {
    if (!hasPriority(issue.labels)) {
      problems.push("no priority label (priority: P0 | P1 | P2)");
    }
    const hasTriage = names.some((n) => TRIAGE_LABELS.has(n));
    if (!hasTriage && !names.includes("epic")) {
      problems.push("no type label (bug, enhancement, documentation, epic, …)");
    }
    if (hasPriority(issue.labels) && !hasSurfaceOrEpic(issue.labels)) {
      problems.push("priority set but no surface/epic label (shared-core, vscode, cli, mcp, vision, …)");
    }
  }

  return problems;
}

function applyLabels(repo, number, labels, dryRun) {
  if (!labels.length) return;
  const joined = labels.join(",");
  if (dryRun) {
    console.log(`Would add to #${number}: ${joined}`);
    return;
  }
  execFileSync(
    "gh",
    ["issue", "edit", String(number), "--repo", repo, "--add-label", joined],
    { stdio: "inherit" },
  );
}

function main() {
  const args = parseArgs(process.argv);
  const catalog = loadCatalog();
  const issues = listIssues(args.repo);
  const byTitle = new Map(issues.map((i) => [i.title, i]));

  for (const title of Object.keys(catalog)) {
    if (!byTitle.has(title)) {
      console.warn(`Catalog issue not found in repo: ${title}`);
    }
  }

  if (args.command === "validate") {
    let failures = 0;
    for (const issue of issues) {
      const problems = validateIssue(issue, catalog);
      if (problems.length) {
        failures++;
        console.error(`#${issue.number} [${issue.state}] ${issue.title}`);
        for (const p of problems) console.error(`  - ${p}`);
      }
    }
    if (failures) {
      console.error(`\n${failures} issue(s) failed label checks.`);
      console.error("See docs/issue-labels.md and run: node scripts/issue-labels.mjs apply");
      process.exit(1);
    }
    console.log(`All ${issues.length} issues passed label checks.`);
    return;
  }

  let updated = 0;
  for (const issue of issues) {
    const expected = catalog[issue.title];
    if (!expected) continue;
    const missing = missingLabels(issue.labels, expected);
    if (!missing.length) continue;
    updated++;
    console.log(`#${issue.number}: adding ${missing.join(", ")}`);
    applyLabels(args.repo, issue.number, missing, args.dryRun);
  }
  console.log(`${args.dryRun ? "Would update" : "Updated"} ${updated} issue(s).`);
}

main();
