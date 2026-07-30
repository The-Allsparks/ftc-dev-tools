import type { EasyOpenCvDesktopReplayCompatibility } from "./types.js";

const ANDROID_REPLAY_BLOCKERS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bimport\s+android\./, label: "Android SDK import" },
  { pattern: /\bHardwareMap\b/, label: "HardwareMap reference" },
  { pattern: /\bLinearOpMode\b/, label: "LinearOpMode reference" },
  { pattern: /\bOpMode\b/, label: "OpMode reference" },
  { pattern: /\bTelemetry\b/, label: "Telemetry reference" },
  { pattern: /\bBitmap\b/, label: "Android Bitmap reference" },
  { pattern: /\bCameraDevice\b/, label: "Android CameraDevice reference" },
];

const OPENCV_ONLY_HINTS = [/\borg\.opencv\./, /\bMat\b/, /\bScalar\b/, /\bImgproc\b/, /\bCore\b/];

function extractPipelineClassSource(source: string, className: string): string {
  const pattern = new RegExp(`\\bclass\\s+${className}\\s+extends\\s+OpenCvPipeline\\s*\\{`);
  const match = pattern.exec(source);
  if (!match) {
    return source;
  }
  const openBrace = source.indexOf("{", match.index);
  if (openBrace < 0) {
    return source;
  }

  let depth = 0;
  for (let index = openBrace; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(match.index, index + 1);
      }
    }
  }
  return source.slice(match.index);
}

export function assessDesktopReplayCompatibility(
  source: string,
  className?: string,
): {
  compatible: EasyOpenCvDesktopReplayCompatibility;
  blockers: string[];
} {
  const scopedSource = className ? extractPipelineClassSource(source, className) : source;
  const cleaned = scopedSource.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
  if (!/\bextends\s+OpenCvPipeline\b/.test(cleaned)) {
    return { compatible: "unknown", blockers: ["Not an OpenCvPipeline subclass"] };
  }

  const blockers: string[] = [];
  for (const entry of ANDROID_REPLAY_BLOCKERS) {
    if (entry.pattern.test(cleaned)) {
      blockers.push(entry.label);
    }
  }

  if (blockers.length > 0) {
    return { compatible: "unlikely", blockers };
  }

  const hasOpenCvHints = OPENCV_ONLY_HINTS.some((pattern) => pattern.test(cleaned));
  return {
    compatible: hasOpenCvHints ? "likely" : "unknown",
    blockers: [],
  };
}
