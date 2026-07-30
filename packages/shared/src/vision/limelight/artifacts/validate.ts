import fs from "node:fs/promises";
import { scanLimelightArtifacts } from "./scan.js";
import type {
  LimelightArtifactValidationIssue,
  LimelightArtifactValidationReport,
} from "./types.js";

const MIN_PIPELINE_SLOT = 0;
const MAX_PIPELINE_SLOT = 9;

export async function validateLimelightArtifacts(
  projectRoot: string,
): Promise<LimelightArtifactValidationReport> {
  const manifest = await scanLimelightArtifacts(projectRoot);
  const issues: LimelightArtifactValidationIssue[] = [];

  if (!manifest.pipelineDirectory) {
    issues.push({
      severity: "error",
      relativePath: ".",
      message: manifest.warnings[0] ?? "Pipeline directory not configured.",
    });
  }

  const slotsSeen = new Map<number, string>();

  for (const pipeline of manifest.pipelines) {
    let text: string;
    try {
      text = await fs.readFile(pipeline.absolutePath, "utf8");
    } catch (error) {
      issues.push({
        severity: "error",
        relativePath: pipeline.relativePath,
        message: `Could not read file: ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      issues.push({
        severity: "error",
        relativePath: pipeline.relativePath,
        message: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      });
      continue;
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      issues.push({
        severity: "error",
        relativePath: pipeline.relativePath,
        message: "Pipeline file must contain a JSON object.",
      });
      continue;
    }

    if (pipeline.slot === undefined) {
      issues.push({
        severity: "warning",
        relativePath: pipeline.relativePath,
        message: "No pipeline slot (0-9) inferred from filename.",
      });
    } else if (pipeline.slot < MIN_PIPELINE_SLOT || pipeline.slot > MAX_PIPELINE_SLOT) {
      issues.push({
        severity: "error",
        relativePath: pipeline.relativePath,
        message: `Pipeline slot must be between ${MIN_PIPELINE_SLOT} and ${MAX_PIPELINE_SLOT}.`,
      });
    } else {
      const previous = slotsSeen.get(pipeline.slot);
      if (previous) {
        issues.push({
          severity: "error",
          relativePath: pipeline.relativePath,
          message: `Duplicate pipeline slot ${pipeline.slot} (also used by ${previous}).`,
        });
      } else {
        slotsSeen.set(pipeline.slot, pipeline.relativePath);
      }
    }
  }

  for (const warning of manifest.warnings) {
    issues.push({
      severity: "warning",
      relativePath: manifest.pipelineDirectory || ".",
      message: warning,
    });
  }

  for (const script of manifest.pythonScripts) {
    try {
      await fs.access(script.absolutePath);
    } catch {
      issues.push({
        severity: "error",
        relativePath: script.relativePath,
        message: "Python SnapScript file is missing.",
      });
    }
  }

  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  const pipelinesWithErrors = new Set(
    issues.filter((issue) => issue.severity === "error").map((issue) => issue.relativePath),
  );
  const validCount = manifest.pipelines.filter(
    (pipeline) => !pipelinesWithErrors.has(pipeline.relativePath),
  ).length;

  return {
    pipelineDirectory: manifest.pipelineDirectory,
    issues,
    validCount: Math.max(0, validCount),
    errorCount,
    warningCount,
    success: errorCount === 0,
    message:
      errorCount === 0
        ? `Validated ${manifest.pipelines.length} pipeline file(s) in ${manifest.pipelineDirectory || "workspace"}.`
        : `Found ${errorCount} validation error(s) in Limelight Vision pipeline artifacts.`,
    generatedAt: new Date().toISOString(),
  };
}
