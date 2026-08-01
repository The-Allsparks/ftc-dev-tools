import fs from "node:fs/promises";
import path from "node:path";
import { resolveProjectAdapter } from "../adapters/resolve-project-adapter.js";
import type { ProjectAdapter } from "../types/project.js";

export interface DiscoverFtcProjectRootsOptions {
  /** How many parent directories to walk from `startDir`. Default 8. */
  maxUpwardDepth?: number;
  adapter?: ProjectAdapter;
}

/**
 * Search upward and sibling folders for official FTC project roots (#43).
 * Returns distinct absolute paths, closest to `startDir` first.
 */
export async function discoverNearbyFtcProjectRoots(
  startDir: string,
  options?: DiscoverFtcProjectRootsOptions,
): Promise<string[]> {
  const adapter = resolveProjectAdapter(options?.adapter);
  const maxUpwardDepth = options?.maxUpwardDepth ?? 8;
  const start = path.resolve(startDir);
  const ranked: { root: string; rank: number }[] = [];
  const considered = new Set<string>();

  let current = start;
  for (let depth = 0; depth <= maxUpwardDepth; depth++) {
    const parent = path.dirname(current);
    if (depth > 0) {
      await considerCandidate(current, depth, adapter, considered, ranked);
    }
    if (parent === current) {
      break;
    }
    await collectSiblingCandidates(parent, current, depth + 1, adapter, considered, ranked);
    current = parent;
  }

  ranked.sort((a, b) => a.rank - b.rank || a.root.length - b.root.length);
  const distinct: string[] = [];
  const outSeen = new Set<string>();
  for (const entry of ranked) {
    if (!outSeen.has(entry.root)) {
      outSeen.add(entry.root);
      distinct.push(entry.root);
    }
  }
  return distinct;
}

async function considerCandidate(
  dir: string,
  rank: number,
  adapter: ProjectAdapter,
  considered: Set<string>,
  ranked: { root: string; rank: number }[],
): Promise<void> {
  const resolved = path.resolve(dir);
  if (considered.has(resolved)) {
    return;
  }
  considered.add(resolved);
  if (await adapter.detect(resolved)) {
    ranked.push({ root: resolved, rank });
  }
}

async function collectSiblingCandidates(
  parent: string,
  childPath: string,
  rank: number,
  adapter: ProjectAdapter,
  considered: Set<string>,
  ranked: { root: string; rank: number }[],
): Promise<void> {
  let entries: string[];
  try {
    entries = await fs.readdir(parent);
  } catch {
    return;
  }
  const childBase = path.basename(childPath);
  for (const name of entries) {
    if (name === childBase || name.startsWith(".")) {
      continue;
    }
    const sibling = path.join(parent, name);
    try {
      const stat = await fs.stat(sibling);
      if (!stat.isDirectory()) {
        continue;
      }
    } catch {
      continue;
    }
    await considerCandidate(sibling, rank, adapter, considered, ranked);
  }
}
