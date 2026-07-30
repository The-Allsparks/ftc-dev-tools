import fs from "node:fs/promises";
import path from "node:path";
import type { EasyOpenCvDependencyInfo } from "./types.js";

const GRADLE_VERSION_PATTERNS = [
  /org\.openftc:easyopencv:([0-9]+(?:\.[0-9A-Za-z-]+)*)/,
  /easyopencv:([0-9]+(?:\.[0-9A-Za-z-]+)*)/i,
];

export async function detectEasyOpenCvDependency(
  projectRoot: string,
): Promise<EasyOpenCvDependencyInfo> {
  const depsPath = path.join(projectRoot, "build.dependencies.gradle");
  let text: string;
  try {
    text = await fs.readFile(depsPath, "utf8");
  } catch {
    return { detected: false };
  }

  for (const pattern of GRADLE_VERSION_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return {
        detected: true,
        version: match[1],
        evidence: `Gradle dependency org.openftc:easyopencv:${match[1]}`,
      };
    }
  }

  if (/easyopencv/i.test(text) && /openftc/i.test(text)) {
    return {
      detected: true,
      evidence: "EasyOpenCV dependency reference found in build.dependencies.gradle",
    };
  }

  return { detected: false };
}
