import fs from "node:fs/promises";
import path from "node:path";
import { assessDesktopReplayCompatibility } from "./replay.js";
import type {
  EasyOpenCvFactoryPattern,
  EasyOpenCvPipelineSignal,
  EasyOpenCvWebcamSignal,
} from "./types.js";

const EASYOPENCV_PATTERN = /\b(OpenCvWebcam|OpenCvWebcamFactory|OpenCvPipeline|EasyOpenCV)\b/;
const CLASS_NAME_PATTERN = /\b(?:public\s+)?(?:final\s+)?class\s+(\w+)/;
const PIPELINE_CLASS_PATTERN = /\bclass\s+(\w+)\s+extends\s+OpenCvPipeline\b/;
const CONFIG_ANNOTATION_PATTERN = /@Config\b/;

const CAMERA_NAME_PATTERNS: RegExp[] = [
  /\bcreateWebcam\s*\(\s*hardwareMap\.get\s*\(\s*WebcamName\.class\s*,\s*"([^"]+)"/,
  /\bcreateWebcam\s*\(\s*[^,]+,\s*"([^"]+)"/,
  /\bcreatePhoneCamera\s*\(\s*[^,]+,\s*[^,]+,\s*"([^"]+)"/,
  /\bcreateWebcam\s*\(\s*"([^"]+)"/,
];

const CREATE_WEBCAM_PATTERN =
  /\bOpenCvWebcamFactory\.getInstance\s*\(\s*\)\.createWebcam\s*\(\s*([^)]+)\)/;
const CREATE_PHONE_CAMERA_PATTERN =
  /\bOpenCvWebcamFactory\.getInstance\s*\(\s*\)\.createPhoneCamera\b/;
const NEW_PIPELINE_PATTERN = /\bnew\s+(\w+)\s*\(\s*\)/g;
const START_CAMERA_STREAM_PATTERN =
  /\bFtcDashboard\.getInstance\s*\(\s*\)\.startCameraStream\s*\(\s*(\w+)/;
const DASHBOARD_PATTERN = /\bFtcDashboard\b|\bcom\.acmerobotics\.dashboard\b/;

function stripJavaComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
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

function detectFactoryPattern(source: string): EasyOpenCvFactoryPattern {
  if (CREATE_PHONE_CAMERA_PATTERN.test(source)) {
    return "phoneCamera";
  }
  if (/\bOpenCvWebcamFactory\b/.test(source)) {
    return "OpenCvWebcamFactory";
  }
  return "unknown";
}

function detectPipelineClassName(source: string): string | undefined {
  const typedDecl = source.match(/\b([A-Z]\w*)\s+\w+\s*=\s*new\s+\1\s*\(\s*\)/);
  if (typedDecl?.[1]) {
    return typedDecl[1];
  }

  const fromNew = source.match(/\bnew\s+([A-Z]\w*)\s*\(\s*\)/);
  if (fromNew?.[1] && fromNew[1] !== "OpenCvPipeline") {
    return fromNew[1];
  }

  const match = source.match(CREATE_WEBCAM_PATTERN);
  if (match?.[1]) {
    const args = match[1];
    const newPipeline = args.match(/\bnew\s+([A-Z]\w*)\s*\(\s*\)/);
    if (newPipeline?.[1]) {
      return newPipeline[1];
    }
    const parts = args.split(",");
    const last = parts[parts.length - 1]?.trim();
    if (last && /^[A-Z]\w*$/.test(last)) {
      return last;
    }
  }

  return undefined;
}

function detectPipelineVariable(source: string): string | undefined {
  const setMatch = source.match(/\bsetPipeline\s*\(\s*(\w+)\s*\)/);
  return setMatch?.[1];
}

function scanPipelineFile(
  relativePath: string,
  source: string,
): EasyOpenCvPipelineSignal | undefined {
  const cleaned = stripJavaComments(source);
  const classMatch = cleaned.match(PIPELINE_CLASS_PATTERN);
  if (!classMatch?.[1]) {
    return undefined;
  }

  const replay = assessDesktopReplayCompatibility(source, classMatch[1]);
  const evidence: string[] = [`Pipeline class ${classMatch[1]} extends OpenCvPipeline`];
  const hasDashboardConfig = CONFIG_ANNOTATION_PATTERN.test(cleaned);
  if (hasDashboardConfig) {
    evidence.push("@Config fields detected for FTC Dashboard tuning");
  }
  if (replay.compatible === "likely") {
    evidence.push("Desktop replay: likely compatible (OpenCV-only heuristics)");
  } else if (replay.compatible === "unlikely") {
    evidence.push(`Desktop replay: unlikely (${replay.blockers.join(", ")})`);
  }

  return {
    relativePath,
    className: classMatch[1],
    hasDashboardConfig,
    desktopReplayCompatible: replay.compatible,
    replayBlockers: replay.blockers,
    evidence: uniqueStrings(evidence),
  };
}

function scanWebcamUsage(relativePath: string, source: string): EasyOpenCvWebcamSignal[] {
  const cleaned = stripJavaComments(source);
  if (!EASYOPENCV_PATTERN.test(cleaned)) {
    return [];
  }

  const hasWebcamFactory =
    /\bOpenCvWebcamFactory\b/.test(cleaned) ||
    /\bOpenCvWebcam\b/.test(cleaned) ||
    CREATE_WEBCAM_PATTERN.test(cleaned);

  if (!hasWebcamFactory) {
    return [];
  }

  const className = cleaned.match(CLASS_NAME_PATTERN)?.[1];
  const cameraName = detectCameraName(cleaned);
  const factoryPattern = detectFactoryPattern(cleaned);
  const pipelineClassName = detectPipelineClassName(cleaned);
  const pipelineVariable = detectPipelineVariable(cleaned);
  const dashboardStream = START_CAMERA_STREAM_PATTERN.test(cleaned);

  const evidence: string[] = ["EasyOpenCV webcam initialization detected"];
  if (factoryPattern !== "unknown") {
    evidence.push(`Factory pattern: ${factoryPattern}`);
  }
  if (cameraName) {
    evidence.push(`Camera name: ${cameraName}`);
  }
  if (pipelineClassName) {
    evidence.push(`Pipeline class: ${pipelineClassName}`);
  }
  if (pipelineVariable) {
    evidence.push(`Pipeline variable: ${pipelineVariable}`);
  }
  if (dashboardStream) {
    evidence.push("FTC Dashboard startCameraStream detected");
  }

  return [
    {
      relativePath,
      className,
      cameraName,
      pipelineClassName,
      pipelineVariable,
      factoryPattern,
      dashboardStream,
      evidence: uniqueStrings(evidence),
    },
  ];
}

export function scanEasyOpenCvJavaSource(
  relativePath: string,
  source: string,
): {
  webcams: EasyOpenCvWebcamSignal[];
  pipelines: EasyOpenCvPipelineSignal[];
  ftcDashboardReference: boolean;
} {
  const cleaned = stripJavaComments(source);
  const webcams = scanWebcamUsage(relativePath, source);
  const pipeline = scanPipelineFile(relativePath, source);
  const pipelines = pipeline ? [pipeline] : [];

  for (const match of cleaned.matchAll(NEW_PIPELINE_PATTERN)) {
    const className = match[1];
    if (!className || className === "OpenCvPipeline") {
      continue;
    }
    if (webcams.length > 0 && !webcams[0]?.pipelineClassName) {
      webcams[0]!.pipelineClassName = className;
      webcams[0]!.evidence.push(`Pipeline instantiated: new ${className}()`);
    }
  }

  return {
    webcams,
    pipelines,
    ftcDashboardReference: DASHBOARD_PATTERN.test(cleaned),
  };
}

export async function scanEasyOpenCvTeamCode(
  teamCodeJavaRoot: string,
  projectRoot: string,
): Promise<{
  webcams: EasyOpenCvWebcamSignal[];
  pipelines: EasyOpenCvPipelineSignal[];
  ftcDashboardReference: boolean;
}> {
  const webcams: EasyOpenCvWebcamSignal[] = [];
  const pipelines: EasyOpenCvPipelineSignal[] = [];
  let ftcDashboardReference = false;

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
      const scan = scanEasyOpenCvJavaSource(relativePath, source);
      webcams.push(...scan.webcams);
      pipelines.push(...scan.pipelines);
      ftcDashboardReference ||= scan.ftcDashboardReference;
    }
  }

  await walk(teamCodeJavaRoot);
  return { webcams, pipelines, ftcDashboardReference };
}
