import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { OfficialFtcProjectAdapter } from "../adapters/official-ftc-project-adapter.js";
import { interpretFromUnknown } from "../errors/interpret.js";
import { isGitWorkingTreeDirty } from "../sdk/sync-sdk-update.js";
import type { FetchLike } from "../sdk/types.js";
import type { CommandSpec, ProcessRunner } from "../types/process.js";
import {
  PEDRO_QUICKSTART_OWNER,
  PEDRO_QUICKSTART_RELEASES_URL,
  PEDRO_QUICKSTART_REPO,
} from "./defaults.js";
import type { PedroScaffoldPlanEntry, PedroScaffoldResult } from "./types.js";

export interface ScaffoldPedroOptions {
  projectRoot: string;
  runner: ProcessRunner;
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
  dryRun?: boolean;
  yes?: boolean;
  force?: boolean;
  /** Inject extracted Quickstart root (skips download; for tests). */
  sourceRoot?: string;
  /** Prefer this release tag when downloading. */
  tag?: string;
}

export async function scaffoldPedroPathing(
  options: ScaffoldPedroOptions,
): Promise<PedroScaffoldResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const dryRun = options.dryRun === true;
  const warnings: string[] = [];
  let cleanupTemp: string | undefined;

  try {
    const adapter = new OfficialFtcProjectAdapter();
    const info = await adapter.inspect(projectRoot);
    if (info.kind === "unknown" || !info.teamCodeSourcePath) {
      return {
        success: false,
        dryRun,
        plan: [],
        appliedPaths: [],
        message: "Official FTC project with TeamCode is required for Pedro scaffold.",
        warnings,
        error: interpretFromUnknown(
          Object.assign(new Error("TeamCode missing"), { code: "PEDRO_PROJECT_UNSUPPORTED" }),
        ),
      };
    }

    let sourceRoot = options.sourceRoot ? path.resolve(options.sourceRoot) : undefined;
    let sourceTag: string | undefined = options.tag;

    if (!sourceRoot) {
      const release = await fetchQuickstartRelease({
        fetchImpl: options.fetchImpl,
        signal: options.signal,
        tag: options.tag,
      });
      sourceTag = release.tagName;
      const extracted = await downloadAndExtractQuickstart({
        runner: options.runner,
        zipballUrl: release.zipballUrl,
        fetchImpl: options.fetchImpl,
        signal: options.signal,
      });
      sourceRoot = extracted.sourceRoot;
      cleanupTemp = extracted.tempDir;
    }

    const sources = await listPedroPathingFiles(sourceRoot);
    if (sources.length === 0) {
      return {
        success: false,
        dryRun,
        plan: [],
        appliedPaths: [],
        sourceTag,
        message: "No TeamCode/**/pedroPathing/** files found in Quickstart source.",
        warnings,
        error: interpretFromUnknown(
          Object.assign(new Error("pedroPathing package missing in Quickstart"), {
            code: "PEDRO_SCAFFOLD_EMPTY",
          }),
        ),
      };
    }

    const plan: PedroScaffoldPlanEntry[] = [];
    for (const rel of sources) {
      // rel is relative to Quickstart root, always under TeamCode/
      const dest = path.join(projectRoot, rel);
      let action: PedroScaffoldPlanEntry["action"] = "add";
      try {
        const [a, b] = await Promise.all([
          fs.readFile(path.join(sourceRoot, rel)),
          fs.readFile(dest),
        ]);
        action = Buffer.compare(a, b) === 0 ? "unchanged" : "overwrite";
      } catch {
        action = "add";
      }
      plan.push({ relativePath: rel, action });
    }

    // Defense: never leave TeamCode paths that are outside pedroPathing
    if (plan.some((e) => !isAllowedPedroScaffoldPath(e.relativePath))) {
      throw Object.assign(new Error("Internal error: non-pedroPathing TeamCode path in plan."), {
        code: "PEDRO_ABORTED",
      });
    }

    const toApply = plan.filter((e) => e.action !== "unchanged");
    if (toApply.length === 0) {
      return {
        success: true,
        dryRun,
        plan,
        appliedPaths: [],
        sourceTag,
        message: "Pedro Pathing package already matches Quickstart scaffold.",
        warnings,
      };
    }

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        plan,
        appliedPaths: toApply.map((e) => e.relativePath),
        sourceTag,
        message: `Dry run: would copy ${toApply.length} pedroPathing file(s) from Quickstart.`,
        warnings,
      };
    }

    if (!options.yes) {
      return {
        success: false,
        dryRun: true,
        plan,
        appliedPaths: [],
        sourceTag,
        message: "Refusing to scaffold Pedro Pathing without --yes.",
        warnings,
        error: interpretFromUnknown(
          Object.assign(new Error("Pedro scaffold requires --yes."), { code: "PEDRO_ABORTED" }),
        ),
      };
    }

    const dirty = await isGitWorkingTreeDirty(options.runner, projectRoot);
    if (dirty && !options.force) {
      return {
        success: false,
        dryRun: false,
        plan,
        appliedPaths: [],
        sourceTag,
        message: "Git working tree is dirty. Commit/stash changes or pass --force.",
        warnings,
        error: interpretFromUnknown(
          Object.assign(new Error("Refusing Pedro changes while the git working tree is dirty."), {
            code: "PEDRO_DIRTY_TREE",
          }),
        ),
      };
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupDirectory = path.join(
      projectRoot,
      ".ftc-dev-tools",
      "backups",
      `pedro-scaffold-${stamp}`,
    );
    await fs.mkdir(backupDirectory, { recursive: true });

    const appliedPaths: string[] = [];
    for (const entry of toApply) {
      const from = path.join(sourceRoot, entry.relativePath);
      const to = path.join(projectRoot, entry.relativePath);
      if (entry.action === "overwrite") {
        const backupTo = path.join(backupDirectory, entry.relativePath);
        await fs.mkdir(path.dirname(backupTo), { recursive: true });
        await fs.copyFile(to, backupTo);
      }
      await fs.mkdir(path.dirname(to), { recursive: true });
      await fs.copyFile(from, to);
      appliedPaths.push(entry.relativePath);
    }

    return {
      success: true,
      dryRun: false,
      plan,
      appliedPaths,
      backupDirectory,
      sourceTag,
      message: `Scaffolded ${appliedPaths.length} pedroPathing file(s) into TeamCode. Unrelated TeamCode files were not modified.`,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      dryRun,
      plan: [],
      appliedPaths: [],
      message: "Failed to scaffold Pedro Pathing.",
      warnings,
      error: interpretFromUnknown(error),
    };
  } finally {
    if (cleanupTemp) {
      await fs.rm(cleanupTemp, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

export function isAllowedPedroScaffoldPath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/");
  return (
    normalized.startsWith("TeamCode/") &&
    /(^|\/)pedroPathing\//.test(normalized) &&
    !normalized.includes("..")
  );
}

async function listPedroPathingFiles(sourceRoot: string): Promise<string[]> {
  const teamCode = path.join(sourceRoot, "TeamCode");
  const files: string[] = [];
  await walkFiles(teamCode, async (full) => {
    const rel = path.relative(sourceRoot, full).replace(/\\/g, "/");
    if (isAllowedPedroScaffoldPath(rel)) {
      files.push(rel);
    }
  });
  return files.sort();
}

async function walkFiles(dir: string, visit: (full: string) => Promise<void>): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkFiles(full, visit);
    } else if (entry.isFile()) {
      await visit(full);
    }
  }
}

async function fetchQuickstartRelease(options: {
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
  tag?: string;
}): Promise<{ tagName: string; zipballUrl: string }> {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
  if (!fetchImpl) {
    throw Object.assign(new Error("fetch is not available"), { code: "PEDRO_NETWORK" });
  }

  const url = options.tag
    ? `https://api.github.com/repos/${PEDRO_QUICKSTART_OWNER}/${PEDRO_QUICKSTART_REPO}/releases/tags/${encodeURIComponent(options.tag)}`
    : `${PEDRO_QUICKSTART_RELEASES_URL}/latest`;

  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "ftc-dev-tools",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: options.signal,
  });
  if (!response.ok) {
    throw Object.assign(
      new Error(`Failed to fetch Pedro Quickstart release (${response.status})`),
      { code: "PEDRO_NETWORK" },
    );
  }
  const json = (await response.json()) as { tag_name?: string; zipball_url?: string };
  if (!json.tag_name || !json.zipball_url) {
    throw Object.assign(new Error("Pedro Quickstart release JSON missing tag/zipball."), {
      code: "PEDRO_NETWORK",
    });
  }
  if (!json.zipball_url.includes("Pedro-Pathing/Quickstart")) {
    throw Object.assign(new Error("Unexpected Quickstart zipball URL host/path."), {
      code: "PEDRO_URL_BLOCKED",
    });
  }
  return { tagName: json.tag_name, zipballUrl: json.zipball_url };
}

async function downloadAndExtractQuickstart(options: {
  runner: ProcessRunner;
  zipballUrl: string;
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
}): Promise<{ sourceRoot: string; tempDir: string }> {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
  if (!fetchImpl) {
    throw Object.assign(new Error("fetch is not available"), { code: "PEDRO_NETWORK" });
  }
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-pedro-qs-"));
  const zipPath = path.join(tempDir, "quickstart.zip");
  const extractDir = path.join(tempDir, "extract");
  await fs.mkdir(extractDir, { recursive: true });

  const response = await fetchImpl(options.zipballUrl, {
    headers: { "User-Agent": "ftc-dev-tools", Accept: "application/octet-stream" },
    signal: options.signal,
  });
  if (!response.ok) {
    throw Object.assign(new Error(`Quickstart download failed (${response.status})`), {
      code: "PEDRO_NETWORK",
    });
  }
  await fs.writeFile(zipPath, Buffer.from(await response.arrayBuffer()));

  const extractSpec: CommandSpec = {
    command: "tar",
    args: ["-xf", zipPath, "-C", extractDir],
  };
  const result = await options.runner.run(extractSpec);
  if (result.exitCode !== 0) {
    throw Object.assign(new Error("Failed to extract Quickstart archive with tar."), {
      code: "PEDRO_NETWORK",
      technicalDetails: `${result.stdout}\n${result.stderr}`,
    });
  }

  const sourceRoot = await findQuickstartRoot(extractDir);
  return { sourceRoot, tempDir };
}

async function findQuickstartRoot(extractDir: string): Promise<string> {
  const entries = await fs.readdir(extractDir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => path.join(extractDir, e.name));
  for (const dir of dirs) {
    if (await pathExists(path.join(dir, "TeamCode"))) {
      return dir;
    }
  }
  if (await pathExists(path.join(extractDir, "TeamCode"))) {
    return extractDir;
  }
  throw Object.assign(new Error("Could not locate TeamCode in extracted Quickstart."), {
    code: "PEDRO_SCAFFOLD_EMPTY",
  });
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
