import type {
  VisionPortalAprilTagSummary,
  VisionPortalColorSummary,
  VisionPortalCustomProcessorAdapter,
  VisionPortalNormalizedProcessorResult,
  VisionPortalProcessorKind,
} from "./types.js";

const PROCESSOR_TYPE_MAP: Array<{ pattern: RegExp; kind: VisionPortalProcessorKind }> = [
  { pattern: /AprilTag/i, kind: "apriltag" },
  { pattern: /ColorProcessor|ColorBlob|ColorRange/i, kind: "color" },
  { pattern: /Tfod|TensorFlow|TFOD/i, kind: "tfod" },
  { pattern: /CustomVision|CustomProcessor/i, kind: "custom" },
  { pattern: /VisionProcessor/i, kind: "generic" },
];

const customAdapters: VisionPortalCustomProcessorAdapter[] = [];

export function registerVisionPortalProcessorAdapter(
  adapter: VisionPortalCustomProcessorAdapter,
): void {
  customAdapters.push(adapter);
}

export function normalizeVisionPortalProcessorKind(
  rawType: string | undefined,
): VisionPortalProcessorKind {
  if (!rawType?.trim()) {
    return "unknown";
  }
  for (const entry of PROCESSOR_TYPE_MAP) {
    if (entry.pattern.test(rawType)) {
      return entry.kind;
    }
  }
  return "unknown";
}

function parseAprilTagSummary(summary: string): VisionPortalAprilTagSummary {
  const result: VisionPortalAprilTagSummary = { raw: summary };
  const countMatch = summary.match(/(\d+)\s+tag/i);
  if (countMatch?.[1]) {
    result.tagCount = Number.parseInt(countMatch[1], 10);
  }
  const idsMatch = summary.match(/ids?\s*[:[]?\s*([0-9,\s]+)/i);
  if (idsMatch?.[1]) {
    result.tagIds = idsMatch[1]
      .split(/[,\s]+/)
      .map((value) => Number.parseInt(value, 10))
      .filter((value) => Number.isFinite(value));
  }
  return result;
}

function parseColorSummary(summary: string): VisionPortalColorSummary {
  const result: VisionPortalColorSummary = { raw: summary };
  const hexMatch = summary.match(/#([0-9A-Fa-f]{6})/);
  if (hexMatch?.[0]) {
    result.dominantColor = hexMatch[0];
  }
  const countMatch = summary.match(/(\d+)\s+(?:blob|pixel|sample)/i);
  if (countMatch?.[1]) {
    result.sampleCount = Number.parseInt(countMatch[1], 10);
  }
  return result;
}

export function normalizeVisionPortalProcessorResult(input: {
  kind: string;
  summary?: string;
}): VisionPortalNormalizedProcessorResult {
  const normalizedKind = normalizeVisionPortalProcessorKind(input.kind);
  const summary = input.summary?.trim();
  const result: VisionPortalNormalizedProcessorResult = {
    kind: normalizedKind,
    summary,
  };

  if (summary) {
    if (normalizedKind === "apriltag") {
      result.aprilTag = parseAprilTagSummary(summary);
    } else if (normalizedKind === "color") {
      result.color = parseColorSummary(summary);
    }
  }

  for (const adapter of customAdapters) {
    if (adapter.matches(normalizedKind, summary)) {
      result.custom = adapter.normalize(summary ?? "");
      break;
    }
  }

  return result;
}
