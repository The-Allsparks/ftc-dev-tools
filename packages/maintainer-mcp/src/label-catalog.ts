import fs from "node:fs/promises";
import path from "node:path";

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

export interface LabelCatalog {
  issues: Record<string, string[]>;
}

export function resolveCatalogPath(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const root = env.MAINTAINER_REPO_ROOT?.trim();
  if (!root) {
    return undefined;
  }
  return path.join(root, "scripts", "issue-label-catalog.json");
}

export async function loadLabelCatalog(options: {
  localPath?: string;
  fetchFromGitHub?: () => Promise<LabelCatalog>;
}): Promise<LabelCatalog> {
  if (options.localPath) {
    try {
      const text = await fs.readFile(options.localPath, "utf8");
      return JSON.parse(text) as LabelCatalog;
    } catch {
      // fall through to GitHub
    }
  }
  if (options.fetchFromGitHub) {
    return options.fetchFromGitHub();
  }
  throw Object.assign(new Error("Label catalog unavailable. Set MAINTAINER_REPO_ROOT or use GitHub API."), {
    code: "CATALOG_UNAVAILABLE",
  });
}

function missingLabels(actual: string[], expected: string[]): string[] {
  const have = new Set(actual);
  return expected.filter((name) => !have.has(name));
}

function hasPriority(labels: string[]): boolean {
  return labels.some((label) => PRIORITY_LABELS.includes(label));
}

function hasSurfaceOrEpic(labels: string[]): boolean {
  if (labels.includes("epic")) {
    return true;
  }
  return labels.some((label) => SURFACE_LABELS.has(label));
}

export function validateIssueLabels(input: {
  title: string;
  state: string;
  labels: string[];
  catalog: LabelCatalog;
}): { ok: boolean; problems: string[]; expectedLabels?: string[] } {
  const problems: string[] = [];
  const expected = input.catalog.issues[input.title];

  if (expected) {
    const missing = missingLabels(input.labels, expected);
    if (missing.length) {
      problems.push(`catalog missing labels: ${missing.join(", ")}`);
    }
    return {
      ok: problems.length === 0,
      problems,
      expectedLabels: expected,
    };
  }

  if (input.state === "open") {
    if (!hasPriority(input.labels)) {
      problems.push("no priority label (priority: P0 | P1 | P2)");
    }
    const hasTriage = input.labels.some((label) => TRIAGE_LABELS.has(label));
    if (!hasTriage && !input.labels.includes("epic")) {
      problems.push("no type label (bug, enhancement, documentation, epic, …)");
    }
    if (hasPriority(input.labels) && !hasSurfaceOrEpic(input.labels)) {
      problems.push(
        "priority set but no surface/epic label (shared-core, vscode, cli, mcp, vision, …)",
      );
    }
  }

  return { ok: problems.length === 0, problems };
}

export function catalogLabelsForTitle(catalog: LabelCatalog, title: string): string[] | undefined {
  return catalog.issues[title];
}
