import fs from "node:fs/promises";
import path from "node:path";
import type { FetchLike } from "../../../sdk/types.js";
import { limelightHttpGet } from "../client.js";
import { resolveLimelightHost } from "../resolve-host.js";
import type { DeviceProvider } from "../../../types/device.js";
import type { ProcessRunner } from "../../../types/process.js";
import { findPipelineForSlot, scanLimelightArtifacts } from "./scan.js";
import { diffLimelightJson } from "./json-diff.js";
import type { LimelightPipelineDiffReport } from "./types.js";

export interface DiffLimelightPipelineOptions {
  host?: string;
  slot: number;
  workspacePath?: string;
  fetchImpl?: FetchLike;
  deviceProvider?: DeviceProvider;
  runner?: ProcessRunner;
  includeRaw?: boolean;
}

export async function diffLimelightPipeline(
  projectRoot: string,
  options: DiffLimelightPipelineOptions,
): Promise<LimelightPipelineDiffReport> {
  const slot = options.slot;
  if (!Number.isFinite(slot) || slot < 0 || slot > 9) {
    throw Object.assign(new Error("Pipeline slot must be between 0 and 9."), {
      code: "LIMELIGHT_PIPELINE_SLOT_INVALID",
    });
  }

  const resolved = await resolveLimelightHost(projectRoot, {
    explicitHost: options.host,
    deviceProvider: options.deviceProvider,
    runner: options.runner,
  });

  const manifest = await scanLimelightArtifacts(projectRoot);
  const workspaceArtifact = options.workspacePath
    ? (() => {
        const rel = options.workspacePath!.replace(/\\/g, "/");
        const abs = path.isAbsolute(rel)
          ? rel
          : path.join(path.resolve(projectRoot), rel);
        return (
          manifest.pipelines.find((pipeline) => pipeline.relativePath === rel) ?? {
            kind: "pipeline" as const,
            slot,
            relativePath: rel,
            absolutePath: abs,
          }
        );
      })()
    : findPipelineForSlot(manifest, slot);

  let workspaceJson: Record<string, unknown> | undefined;
  if (workspaceArtifact) {
    const text = await fs.readFile(workspaceArtifact.absolutePath, "utf8");
    workspaceJson = JSON.parse(text) as Record<string, unknown>;
  }

  const cameraResponse = await limelightHttpGet<Record<string, unknown>>({
    host: resolved.host,
    path: `/pipeline-atindex?index=${slot}`,
    fetchImpl: options.fetchImpl,
  });

  if (!cameraResponse.ok || !cameraResponse.data) {
    throw Object.assign(new Error(cameraResponse.message), {
      code: "LIMELIGHT_UNREACHABLE",
    });
  }

  const cameraJson = cameraResponse.data;
  const diffEntries =
    workspaceJson !== undefined ? diffLimelightJson(workspaceJson, cameraJson) : [];
  const identical = workspaceJson !== undefined && diffEntries.length === 0;

  const humanSummary: string[] = [];
  if (!workspaceArtifact) {
    humanSummary.push(`No workspace pipeline file mapped to slot ${slot}.`);
  } else if (identical) {
    humanSummary.push(`Workspace file ${workspaceArtifact.relativePath} matches camera slot ${slot}.`);
  } else {
    humanSummary.push(
      `Workspace file ${workspaceArtifact.relativePath} differs from camera slot ${slot} (${diffEntries.length} change(s)).`,
    );
    for (const entry of diffEntries.slice(0, 10)) {
      humanSummary.push(`  ${entry.kind} ${entry.path}`);
    }
    if (diffEntries.length > 10) {
      humanSummary.push(`  ... and ${diffEntries.length - 10} more`);
    }
  }

  return {
    host: resolved.host,
    slot,
    workspacePath: workspaceArtifact?.relativePath,
    identical,
    diffEntries,
    humanSummary,
    workspaceJson: options.includeRaw ? workspaceJson : undefined,
    cameraJson: options.includeRaw ? cameraJson : undefined,
    message: identical
      ? "Workspace and camera pipelines match."
      : workspaceArtifact
        ? "Workspace and camera pipelines differ."
        : "Camera pipeline fetched; no workspace file for this slot.",
    generatedAt: new Date().toISOString(),
  };
}
