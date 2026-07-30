import fs from "node:fs/promises";
import path from "node:path";
import { loadProjectConfig } from "../../config/load.js";
import { visionConfigFromProjectConfig } from "../status.js";

const DEFAULT_PIPELINE_DIRS = ["limelight/pipelines", "limelight", "pipelines", "vision/pipelines"];

export interface ResolvePipelineDirectoryResult {
  relativePath: string;
  absolutePath: string;
  source: "project-config" | "default-heuristic";
}

export async function resolveLimelightPipelineDirectory(
  projectRoot: string,
): Promise<ResolvePipelineDirectoryResult | undefined> {
  const root = path.resolve(projectRoot);
  const configResult = await loadProjectConfig(root);
  const visionConfig = visionConfigFromProjectConfig(configResult.config.vision);

  const configured =
    visionConfig.limelight?.pipelineDirectory?.trim() || visionConfig.pipelineDirectory?.trim();

  if (configured) {
    const absolutePath = path.join(root, configured);
    return {
      relativePath: configured.replace(/\\/g, "/"),
      absolutePath,
      source: "project-config",
    };
  }

  for (const rel of DEFAULT_PIPELINE_DIRS) {
    const absolutePath = path.join(root, rel);
    try {
      const stat = await fs.stat(absolutePath);
      if (stat.isDirectory()) {
        return {
          relativePath: rel.replace(/\\/g, "/"),
          absolutePath,
          source: "default-heuristic",
        };
      }
    } catch {
      // continue
    }
  }

  return undefined;
}
