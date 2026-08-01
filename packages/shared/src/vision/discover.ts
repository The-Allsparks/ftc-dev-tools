import fs from "node:fs/promises";
import path from "node:path";
import { resolveProjectAdapter } from "../adapters/resolve-project-adapter.js";
import type { ProjectAdapter } from "../types/project.js";
import type {
  VisionDetectionKind,
  VisionPipelineDirectory,
  VisionWorkspaceDiscovery,
  VisionWorkspaceSignal,
} from "./types.js";

const JAVA_SIGNALS: Array<{
  kind: VisionDetectionKind;
  providerId: string;
  patterns: RegExp[];
}> = [
  {
    kind: "visionportal",
    providerId: "vision:visionportal",
    patterns: [/org\.firstinspires\.ftc\.vision/, /\bVisionPortal\b/],
  },
  {
    kind: "easyopencv",
    providerId: "vision:easyopencv",
    patterns: [/org\.openftc\.easyopencv/, /\bEasyOpenCV\b/, /\bOpenCvPipeline\b/],
  },
  {
    kind: "limelight",
    providerId: "vision:limelight",
    patterns: [/limelightvision/, /\bLimelight3A\b/, /\bLimelight\b/],
  },
  {
    kind: "ftc-dashboard",
    providerId: "telemetry:ftc-dashboard",
    patterns: [/com\.acmerobotics\.dashboard/, /\bTelemetry\b.*\bDashboard\b/],
  },
];

const GRADLE_SIGNALS: Array<{
  kind: VisionDetectionKind;
  providerId: string;
  patterns: RegExp[];
}> = [
  {
    kind: "easyopencv",
    providerId: "vision:easyopencv",
    patterns: [/easyopencv/i, /openftc/i],
  },
  {
    kind: "ftc-dashboard",
    providerId: "telemetry:ftc-dashboard",
    patterns: [/ftc.dashboard/i, /acmerobotics/i],
  },
];

const PIPELINE_DIR_CANDIDATES = [
  "limelight",
  "limelight/pipelines",
  "pipelines",
  "vision",
  "vision/pipelines",
];

async function directoryExists(dir: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function countFilesRecursive(dir: string): Promise<number> {
  let count = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += await countFilesRecursive(full);
    } else {
      count += 1;
    }
  }
  return count;
}

async function scanJavaSignals(
  javaRoot: string,
  projectRoot: string,
): Promise<VisionWorkspaceSignal[]> {
  const signals: VisionWorkspaceSignal[] = [];
  const seen = new Set<string>();

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
      let text: string;
      try {
        text = await fs.readFile(full, "utf8");
      } catch {
        continue;
      }
      const relativePath = path.relative(projectRoot, full).replace(/\\/g, "/");
      for (const signal of JAVA_SIGNALS) {
        for (const pattern of signal.patterns) {
          if (!pattern.test(text)) {
            continue;
          }
          const key = `${signal.kind}:${relativePath}`;
          if (seen.has(key)) {
            break;
          }
          seen.add(key);
          signals.push({
            kind: signal.kind,
            suggestedProviderId: signal.providerId,
            evidence: `Java reference matched ${pattern.source}`,
            relativePath,
          });
          break;
        }
      }
    }
  }

  await walk(javaRoot);
  return signals;
}

async function scanGradleSignals(projectRoot: string): Promise<VisionWorkspaceSignal[]> {
  const signals: VisionWorkspaceSignal[] = [];
  const depsPath = path.join(projectRoot, "build.dependencies.gradle");
  let text: string;
  try {
    text = await fs.readFile(depsPath, "utf8");
  } catch {
    return signals;
  }
  for (const signal of GRADLE_SIGNALS) {
    for (const pattern of signal.patterns) {
      if (pattern.test(text)) {
        signals.push({
          kind: signal.kind,
          suggestedProviderId: signal.providerId,
          evidence: `Gradle dependency matched ${pattern.source}`,
          relativePath: "build.dependencies.gradle",
        });
        break;
      }
    }
  }
  return signals;
}

async function scanPipelineDirectories(projectRoot: string): Promise<VisionPipelineDirectory[]> {
  const found: VisionPipelineDirectory[] = [];
  for (const rel of PIPELINE_DIR_CANDIDATES) {
    const abs = path.join(projectRoot, rel);
    if (!(await directoryExists(abs))) {
      continue;
    }
    const fileCount = await countFilesRecursive(abs);
    found.push({ relativePath: rel.replace(/\\/g, "/"), fileCount });
  }
  return found;
}

function dedupeSignals(signals: VisionWorkspaceSignal[]): VisionWorkspaceSignal[] {
  const byKind = new Map<VisionDetectionKind, VisionWorkspaceSignal>();
  for (const signal of signals) {
    if (!byKind.has(signal.kind)) {
      byKind.set(signal.kind, signal);
    }
  }
  return [...byKind.values()];
}

function suggestDefaultProvider(signals: VisionWorkspaceSignal[]): string | undefined {
  const priority: VisionDetectionKind[] = ["limelight", "visionportal", "easyopencv"];
  for (const kind of priority) {
    const hit = signals.find((signal) => signal.kind === kind);
    if (hit) {
      return hit.suggestedProviderId.startsWith("vision:") ? hit.suggestedProviderId : undefined;
    }
  }
  return signals.find((signal) => signal.suggestedProviderId.startsWith("vision:"))
    ?.suggestedProviderId;
}

export interface DiscoverVisionWorkspaceOptions {
  adapter?: ProjectAdapter;
}

export async function discoverVisionWorkspace(
  projectRoot: string,
  options?: DiscoverVisionWorkspaceOptions,
): Promise<VisionWorkspaceDiscovery> {
  const root = path.resolve(projectRoot);
  const warnings: string[] = [];
  const adapter = resolveProjectAdapter(options?.adapter);

  let info;
  try {
    info = await adapter.inspect(root);
  } catch {
    return {
      projectRoot: root,
      isOfficialFtcProject: false,
      signals: [],
      pipelineDirectories: [],
      warnings: ["Not an official FTC project layout."],
      generatedAt: new Date().toISOString(),
    };
  }

  const javaSignals = info.teamCodeSourcePath
    ? await scanJavaSignals(info.teamCodeSourcePath, root)
    : [];
  if (!info.teamCodeSourcePath) {
    warnings.push("TeamCode Java source path not found.");
  }

  const gradleSignals = await scanGradleSignals(root);
  const pipelineDirectories = await scanPipelineDirectories(root);
  const signals = dedupeSignals([...javaSignals, ...gradleSignals]);

  return {
    projectRoot: root,
    isOfficialFtcProject: true,
    teamCodeSourcePath: info.teamCodeSourcePath,
    signals,
    pipelineDirectories,
    suggestedDefaultProviderId: suggestDefaultProvider(signals),
    warnings,
    generatedAt: new Date().toISOString(),
  };
}
