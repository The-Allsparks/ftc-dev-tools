import fs from "node:fs/promises";
import path from "node:path";
import { resolveLimelightPipelineDirectory } from "../resolve-pipeline-directory.js";
import type {
  LimelightArtifactManifest,
  LimelightFieldMapArtifact,
  LimelightPipelineArtifact,
  LimelightPythonArtifact,
} from "./types.js";

const MANIFEST_NAMES = new Set([
  "limelight-manifest.json",
  ".ftc-limelight.json",
  "artifact-manifest.json",
]);

const PIPELINE_EXTENSIONS = new Set([".json", ".vpr"]);
const SLOT_PATTERNS = [
  /^pipeline[-_]?(\d+)\./i,
  /^slot[-_]?(\d+)\./i,
  /^(\d+)[-_.].+\.(json|vpr)$/i,
  /^(\d+)\.(json|vpr)$/i,
];

function inferSlotFromFilename(fileName: string): number | undefined {
  for (const pattern of SLOT_PATTERNS) {
    const match = fileName.match(pattern);
    if (!match?.[1]) {
      continue;
    }
    const slot = Number.parseInt(match[1], 10);
    if (Number.isFinite(slot) && slot >= 0 && slot <= 9) {
      return slot;
    }
  }
  return undefined;
}

function inferNameFromFilename(fileName: string): string | undefined {
  const base = fileName.replace(/\.(json|vpr)$/i, "");
  const cleaned = base.replace(/^(pipeline|slot)[-_]?\d+[-_.]?/i, "").trim();
  return cleaned || base;
}

async function walkFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  async function walk(current: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        files.push(full);
      }
    }
  }
  await walk(dir);
  return files;
}

function classifyRelativePath(
  relativePath: string,
  projectRoot: string,
): {
  pipelines: LimelightPipelineArtifact[];
  pythonScripts: LimelightPythonArtifact[];
  fieldMaps: LimelightFieldMapArtifact[];
  warnings: string[];
} {
  const pipelines: LimelightPipelineArtifact[] = [];
  const pythonScripts: LimelightPythonArtifact[] = [];
  const fieldMaps: LimelightFieldMapArtifact[] = [];
  const warnings: string[] = [];

  const normalized = relativePath.replace(/\\/g, "/");
  const fileName = path.basename(normalized);
  const absolutePath = path.join(projectRoot, normalized);
  const ext = path.extname(fileName).toLowerCase();

  if (MANIFEST_NAMES.has(fileName.toLowerCase())) {
    return { pipelines, pythonScripts, fieldMaps, warnings };
  }

  if (PIPELINE_EXTENSIONS.has(ext) && !normalized.includes("/python/")) {
    const slot = inferSlotFromFilename(fileName);
    pipelines.push({
      kind: "pipeline",
      slot,
      name: inferNameFromFilename(fileName),
      relativePath: normalized,
      absolutePath,
    });
    if (slot === undefined) {
      warnings.push(`Pipeline file "${normalized}" has no inferable slot (0-9); assign via manifest later.`);
    }
    return { pipelines, pythonScripts, fieldMaps, warnings };
  }

  if (ext === ".py") {
    pythonScripts.push({
      kind: "python-script",
      relativePath: normalized,
      absolutePath,
    });
    return { pipelines, pythonScripts, fieldMaps, warnings };
  }

  const lower = normalized.toLowerCase();
  if (
    lower.includes("fieldmap") ||
    lower.includes("field-map") ||
    lower.includes("/fieldmaps/") ||
    lower.includes("/field-maps/")
  ) {
    if (ext === ".json") {
      fieldMaps.push({
        kind: "field-map",
        relativePath: normalized,
        absolutePath,
      });
    }
  }

  return { pipelines, pythonScripts, fieldMaps, warnings };
}

export async function scanLimelightArtifacts(projectRoot: string): Promise<LimelightArtifactManifest> {
  const root = path.resolve(projectRoot);
  const warnings: string[] = [];
  const resolved = await resolveLimelightPipelineDirectory(root);

  if (!resolved) {
    return {
      version: "1.0.0",
      pipelineDirectory: "",
      pipelines: [],
      pythonScripts: [],
      fieldMaps: [],
      warnings: [
        "No Limelight Vision pipeline directory found. Set vision.pipelineDirectory or vision.limelight.pipelineDirectory in .ftc-dev.json.",
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  const files = await walkFiles(resolved.absolutePath);
  const pipelines: LimelightPipelineArtifact[] = [];
  const pythonScripts: LimelightPythonArtifact[] = [];
  const fieldMaps: LimelightFieldMapArtifact[] = [];

  for (const absolutePath of files) {
    const relativePath = path.relative(root, absolutePath).replace(/\\/g, "/");
    const classified = classifyRelativePath(relativePath, root);
    pipelines.push(...classified.pipelines);
    pythonScripts.push(...classified.pythonScripts);
    fieldMaps.push(...classified.fieldMaps);
    warnings.push(...classified.warnings);
  }

  pipelines.sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99) || a.relativePath.localeCompare(b.relativePath));
  pythonScripts.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  fieldMaps.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return {
    version: "1.0.0",
    pipelineDirectory: resolved.relativePath,
    pipelines,
    pythonScripts,
    fieldMaps,
    warnings,
    generatedAt: new Date().toISOString(),
  };
}

export function findPipelineForSlot(
  manifest: LimelightArtifactManifest,
  slot: number,
): LimelightPipelineArtifact | undefined {
  return manifest.pipelines.find((pipeline) => pipeline.slot === slot);
}
