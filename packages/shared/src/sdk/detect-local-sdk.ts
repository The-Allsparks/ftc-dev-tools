import fs from "node:fs/promises";
import path from "node:path";
import type { LocalSdkInfo } from "./types.js";

const FTC_GROUP = "org.firstinspires.ftc";
const PREFERRED_ARTIFACTS = ["RobotCore", "FtcCommon"] as const;

const ARTIFACT_RE =
  /(?:implementation|api|compileOnly|runtimeOnly)\s+['"]org\.firstinspires\.ftc:([A-Za-z0-9._-]+):([0-9]+(?:\.[0-9]+){0,3})['"]/g;

export async function detectLocalSdk(projectRoot: string): Promise<LocalSdkInfo> {
  const root = path.resolve(projectRoot);
  const dependenciesPath = path.join(root, "build.dependencies.gradle");
  const artifacts: Array<{ name: string; version: string }> = [];
  let resolvedDepsPath: string | undefined;

  try {
    const text = await fs.readFile(dependenciesPath, "utf8");
    resolvedDepsPath = dependenciesPath;
    for (const match of text.matchAll(ARTIFACT_RE)) {
      const name = match[1];
      const version = match[2];
      if (name && version) {
        artifacts.push({ name, version });
      }
    }
  } catch {
    // missing deps file
  }

  const versions = [...new Set(artifacts.map((a) => a.version))];
  const mismatchedVersions = versions.length > 1;

  let version: string | undefined;
  for (const preferred of PREFERRED_ARTIFACTS) {
    const hit = artifacts.find((a) => a.name === preferred);
    if (hit) {
      version = hit.version;
      break;
    }
  }
  if (!version && artifacts[0]) {
    version = artifacts[0].version;
  }

  const manifest = await readManifestVersion(root);

  return {
    version,
    artifacts,
    mismatchedVersions,
    dependenciesPath: resolvedDepsPath,
    manifestVersionName: manifest.versionName,
    manifestVersionCode: manifest.versionCode,
  };
}

async function readManifestVersion(
  projectRoot: string,
): Promise<{ versionName?: string; versionCode?: string }> {
  const candidate = path.join(
    projectRoot,
    "FtcRobotController",
    "src",
    "main",
    "AndroidManifest.xml",
  );
  try {
    const text = await fs.readFile(candidate, "utf8");
    const versionName = text.match(/android:versionName\s*=\s*"([^"]+)"/)?.[1];
    const versionCode = text.match(/android:versionCode\s*=\s*"([^"]+)"/)?.[1];
    return { versionName, versionCode };
  } catch {
    return {};
  }
}

export function parseFtcMavenArtifacts(gradleText: string): Array<{ name: string; version: string }> {
  const artifacts: Array<{ name: string; version: string }> = [];
  for (const match of gradleText.matchAll(ARTIFACT_RE)) {
    const name = match[1];
    const version = match[2];
    if (name && version) {
      artifacts.push({ name, version });
    }
  }
  return artifacts;
}

export { FTC_GROUP, PREFERRED_ARTIFACTS };
