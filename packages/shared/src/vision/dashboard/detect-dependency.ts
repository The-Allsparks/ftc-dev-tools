import fs from "node:fs/promises";
import path from "node:path";
import type { FtcDashboardDependencyInfo } from "./types.js";

const GRADLE_VERSION_PATTERN =
  /com\.acmerobotics\.dashboard:dashboard:([0-9]+(?:\.[0-9A-Za-z-]+)*)/;
const GRADLE_ALT_PATTERN = /ftc\.dashboard[^:]*:([0-9]+(?:\.[0-9A-Za-z-]+)*)/i;

export async function detectFtcDashboardDependency(
  projectRoot: string,
): Promise<FtcDashboardDependencyInfo> {
  const depsPath = path.join(projectRoot, "build.dependencies.gradle");
  let text: string;
  try {
    text = await fs.readFile(depsPath, "utf8");
  } catch {
    return { detected: false };
  }

  const versionMatch = text.match(GRADLE_VERSION_PATTERN) ?? text.match(GRADLE_ALT_PATTERN);
  if (!versionMatch) {
    if (/acmerobotics/i.test(text) && /dashboard/i.test(text)) {
      return {
        detected: true,
        evidence: "FTC Dashboard dependency reference found in build.dependencies.gradle",
      };
    }
    return { detected: false };
  }

  return {
    detected: true,
    version: versionMatch[1],
    evidence: `Gradle dependency com.acmerobotics.dashboard:dashboard:${versionMatch[1]}`,
  };
}
