import fs from "node:fs/promises";
import path from "node:path";
import { normalizeVisionPortalProcessorKind } from "./normalize.js";
import type {
  VisionPortalConfigSignal,
  VisionPortalInitPattern,
  VisionPortalProcessorSignal,
  VisionPortalStreamFormat,
} from "./types.js";

const VISION_PORTAL_PATTERN = /\bVisionPortal\b/;
const CLASS_NAME_PATTERN = /\b(?:public\s+)?(?:final\s+)?class\s+(\w+)/;

const INIT_PATTERNS: Array<{ pattern: RegExp; initPattern: VisionPortalInitPattern }> = [
  { pattern: /\bVisionPortal\.Builder\b/, initPattern: "builder" },
  { pattern: /\bVisionPortal\.easyInitialize\b/, initPattern: "easyInitialize" },
];

const CAMERA_NAME_PATTERNS: RegExp[] = [
  /\beasyInitializeFromCameraName\s*\(\s*"([^"]+)"/,
  /\bsetCamera\s*\(\s*hardwareMap\.get\s*\(\s*WebcamName\.class\s*,\s*"([^"]+)"/,
  /\bsetCamera\s*\([^,]+,\s*"([^"]+)"/,
  /\bsetCamera\s*\(\s*"([^"]+)"/,
];

const RESOLUTION_PATTERNS: RegExp[] = [
  /\bsetCameraResolution\s*\(\s*new\s+Size\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/,
  /\bsetCameraResolution\s*\(\s*Size\.parseSize\s*\(\s*"(\d+)x(\d+)"/,
];

const STREAM_FORMAT_PATTERN = /\bsetStreamFormat\s*\(\s*StreamFormat\.(\w+)/;

const PROCESSOR_DECL_PATTERN =
  /\b(AprilTagProcessor|ColorProcessor|ColorBlobProcessor|TfodProcessor|TensorFlowProcessor|CustomVisionProcessor|VisionProcessor)\s+(\w+)/g;

const ADD_PROCESSOR_PATTERN = /\baddProcessor\s*\(\s*(\w+)\s*\)/g;

function stripJavaComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function detectInitPattern(source: string): VisionPortalInitPattern {
  for (const entry of INIT_PATTERNS) {
    if (entry.pattern.test(source)) {
      return entry.initPattern;
    }
  }
  return "unknown";
}

function detectCameraName(source: string): string | undefined {
  for (const pattern of CAMERA_NAME_PATTERNS) {
    const match = source.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return undefined;
}

function detectResolution(source: string): { width: number; height: number } | undefined {
  for (const pattern of RESOLUTION_PATTERNS) {
    const match = source.match(pattern);
    if (match?.[1] && match[2]) {
      return {
        width: Number.parseInt(match[1], 10),
        height: Number.parseInt(match[2], 10),
      };
    }
  }
  return undefined;
}

function detectStreamFormat(source: string): VisionPortalStreamFormat | undefined {
  const match = source.match(STREAM_FORMAT_PATTERN);
  return match?.[1] as VisionPortalStreamFormat | undefined;
}

function detectProcessorDeclarations(source: string): Map<string, VisionPortalProcessorSignal> {
  const processors = new Map<string, VisionPortalProcessorSignal>();
  for (const match of source.matchAll(PROCESSOR_DECL_PATTERN)) {
    const rawType = match[1];
    const variableName = match[2];
    if (!rawType || !variableName) {
      continue;
    }
    processors.set(variableName, {
      variableName,
      rawType,
      kind: normalizeVisionPortalProcessorKind(rawType),
      evidence: `Declared ${rawType} ${variableName}`,
    });
  }
  return processors;
}

function detectAddedProcessors(
  source: string,
  declarations: Map<string, VisionPortalProcessorSignal>,
): VisionPortalProcessorSignal[] {
  const added: VisionPortalProcessorSignal[] = [];
  const seen = new Set<string>();

  for (const match of source.matchAll(ADD_PROCESSOR_PATTERN)) {
    const variableName = match[1];
    if (!variableName || seen.has(variableName)) {
      continue;
    }
    seen.add(variableName);
    const declared = declarations.get(variableName);
    if (declared) {
      added.push({
        ...declared,
        evidence: `addProcessor(${variableName})`,
      });
      continue;
    }
    added.push({
      variableName,
      kind: "unknown",
      evidence: `addProcessor(${variableName})`,
    });
  }

  return added;
}

export function scanVisionPortalJavaSource(
  relativePath: string,
  source: string,
): VisionPortalConfigSignal[] {
  const cleaned = stripJavaComments(source);
  if (!VISION_PORTAL_PATTERN.test(cleaned)) {
    return [];
  }

  const className = cleaned.match(CLASS_NAME_PATTERN)?.[1];
  const initPattern = detectInitPattern(cleaned);
  const cameraName = detectCameraName(cleaned);
  const resolution = detectResolution(cleaned);
  const streamFormat = detectStreamFormat(cleaned);
  const declarations = detectProcessorDeclarations(cleaned);
  const processors = detectAddedProcessors(cleaned, declarations);

  const evidence: string[] = ["VisionPortal reference detected"];
  if (initPattern !== "unknown") {
    evidence.push(`Init pattern: ${initPattern}`);
  }
  if (cameraName) {
    evidence.push(`Camera name: ${cameraName}`);
  }
  if (resolution) {
    evidence.push(`Resolution: ${resolution.width}x${resolution.height}`);
  }
  if (streamFormat) {
    evidence.push(`Stream format: ${streamFormat}`);
  }
  for (const processor of processors) {
    evidence.push(processor.evidence);
  }

  return [
    {
      relativePath,
      className,
      initPattern,
      cameraName,
      resolution,
      streamFormat,
      processors,
      evidence: uniqueStrings(evidence),
    },
  ];
}

export async function scanVisionPortalTeamCode(
  teamCodeJavaRoot: string,
  projectRoot: string,
): Promise<VisionPortalConfigSignal[]> {
  const configs: VisionPortalConfigSignal[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!entry.name.endsWith(".java")) {
        continue;
      }
      const relativePath = path.relative(projectRoot, full).replace(/\\/g, "/");
      let source: string;
      try {
        source = await fs.readFile(full, "utf8");
      } catch {
        continue;
      }
      configs.push(...scanVisionPortalJavaSource(relativePath, source));
    }
  }

  await walk(teamCodeJavaRoot);
  return configs;
}
