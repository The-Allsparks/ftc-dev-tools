import type { LimelightJsonDiffEntry } from "./types.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function diffLimelightJson(
  workspace: Record<string, unknown>,
  camera: Record<string, unknown>,
  prefix = "",
): LimelightJsonDiffEntry[] {
  const entries: LimelightJsonDiffEntry[] = [];
  const keys = new Set([...Object.keys(workspace), ...Object.keys(camera)]);

  for (const key of [...keys].sort()) {
    const pathKey = prefix ? `${prefix}.${key}` : key;
    const left = workspace[key];
    const right = camera[key];

    if (!(key in workspace)) {
      entries.push({ path: pathKey, kind: "added", cameraValue: right });
      continue;
    }
    if (!(key in camera)) {
      entries.push({ path: pathKey, kind: "removed", workspaceValue: left });
      continue;
    }

    if (isPlainObject(left) && isPlainObject(right)) {
      entries.push(...diffLimelightJson(left, right, pathKey));
      continue;
    }

    if (JSON.stringify(left) !== JSON.stringify(right)) {
      entries.push({
        path: pathKey,
        kind: "changed",
        workspaceValue: left,
        cameraValue: right,
      });
    }
  }

  return entries;
}
