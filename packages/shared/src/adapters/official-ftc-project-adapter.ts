import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_MODULE_NAME, DEFAULT_ROBOT_CONTROLLER_APPLICATION_ID } from "../constants.js";
import { findGradleWrapper, buildGradleCommand } from "../gradle/wrapper.js";
import type { CommandSpec } from "../types/process.js";
import type { FtcProjectInfo, ProjectAdapter } from "../types/project.js";

export class OfficialFtcProjectAdapter implements ProjectAdapter {
  constructor(private readonly platform: NodeJS.Platform = process.platform) {}

  async detect(directory: string): Promise<boolean> {
    try {
      const info = await this.inspect(directory);
      return info.kind === "official-ftc";
    } catch {
      return false;
    }
  }

  async inspect(directory: string): Promise<FtcProjectInfo> {
    const rootDirectory = path.resolve(directory);
    const settingsGradlePath = await firstExisting(rootDirectory, [
      "settings.gradle",
      "settings.gradle.kts",
    ]);
    const buildGradlePath = await firstExisting(rootDirectory, [
      "build.gradle",
      "build.gradle.kts",
    ]);
    const wrapper = await findGradleWrapper(rootDirectory, this.platform);

    const hasFtcRobotController = await directoryExists(
      path.join(rootDirectory, "FtcRobotController"),
    );
    const hasTeamCode = await directoryExists(path.join(rootDirectory, "TeamCode"));
    const hasCommonGradle = await fileExists(path.join(rootDirectory, "build.common.gradle"));

    const looksOfficial =
      Boolean(settingsGradlePath) &&
      (hasFtcRobotController || hasCommonGradle) &&
      (hasTeamCode || hasFtcRobotController);

    if (!looksOfficial) {
      throw Object.assign(
        new Error("Directory does not look like an official FTC Android Studio project."),
        {
          code: "UNSUPPORTED_PROJECT_LAYOUT",
        },
      );
    }

    const moduleName = hasTeamCode ? DEFAULT_MODULE_NAME : "FtcRobotController";
    const applicationId = await readApplicationId(rootDirectory).catch(() => undefined);
    const teamCodeSourcePath = hasTeamCode
      ? path.join(rootDirectory, "TeamCode", "src", "main", "java")
      : undefined;

    return {
      rootDirectory,
      kind: "official-ftc",
      moduleName,
      hasGradleWrapper: wrapper.found,
      gradleWrapperPath: wrapper.wrapperPath ?? "",
      settingsGradlePath,
      buildGradlePath,
      applicationId,
      teamCodeSourcePath,
    };
  }

  async getBuildCommand(project: FtcProjectInfo): Promise<CommandSpec> {
    if (!project.hasGradleWrapper || !project.gradleWrapperPath) {
      throw Object.assign(new Error("Gradle Wrapper is missing."), {
        code: "GRADLE_WRAPPER_MISSING",
      });
    }
    const task = `:${project.moduleName}:assembleDebug`;
    return buildGradleCommand(project.gradleWrapperPath, [task], project.rootDirectory);
  }

  async getCleanCommand(project: FtcProjectInfo): Promise<CommandSpec> {
    if (!project.hasGradleWrapper || !project.gradleWrapperPath) {
      throw Object.assign(new Error("Gradle Wrapper is missing."), {
        code: "GRADLE_WRAPPER_MISSING",
      });
    }
    return buildGradleCommand(project.gradleWrapperPath, ["clean"], project.rootDirectory);
  }

  async locateApk(project: FtcProjectInfo): Promise<string> {
    const candidates = [
      path.join(
        project.rootDirectory,
        project.moduleName,
        "build",
        "outputs",
        "apk",
        "debug",
        `${project.moduleName}-debug.apk`,
      ),
      path.join(
        project.rootDirectory,
        "FtcRobotController",
        "build",
        "outputs",
        "apk",
        "debug",
        "FtcRobotController-debug.apk",
      ),
      path.join(
        project.rootDirectory,
        "TeamCode",
        "build",
        "outputs",
        "apk",
        "debug",
        "TeamCode-debug.apk",
      ),
    ];

    for (const candidate of candidates) {
      if (await fileExists(candidate)) {
        return candidate;
      }
    }

    // Broader search under module build outputs
    const searchRoots = [
      path.join(project.rootDirectory, project.moduleName, "build", "outputs", "apk"),
      path.join(project.rootDirectory, "FtcRobotController", "build", "outputs", "apk"),
    ];
    for (const root of searchRoots) {
      const found = await findFirstApk(root);
      if (found) {
        return found;
      }
    }

    throw Object.assign(new Error("APK not found after build."), { code: "APK_NOT_FOUND" });
  }

  async resolveApplicationId(project: FtcProjectInfo): Promise<string> {
    if (project.applicationId) {
      return project.applicationId;
    }
    const fromDisk = await readApplicationId(project.rootDirectory).catch(() => undefined);
    return fromDisk ?? DEFAULT_ROBOT_CONTROLLER_APPLICATION_ID;
  }
}

async function firstExisting(root: string, names: string[]): Promise<string | undefined> {
  for (const name of names) {
    const full = path.join(root, name);
    if (await fileExists(full)) {
      return full;
    }
  }
  return undefined;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(filePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export async function readApplicationId(projectRoot: string): Promise<string | undefined> {
  const candidates = [
    path.join(projectRoot, "FtcRobotController", "src", "main", "AndroidManifest.xml"),
    path.join(projectRoot, "TeamCode", "src", "main", "AndroidManifest.xml"),
    path.join(projectRoot, "FtcRobotController", "build.gradle"),
    path.join(projectRoot, "build.common.gradle"),
  ];

  for (const candidate of candidates) {
    if (!(await fileExists(candidate))) {
      continue;
    }
    const text = await fs.readFile(candidate, "utf8");
    const packageMatch = text.match(/package\s*=\s*"([^"]+)"/);
    if (packageMatch?.[1]) {
      return packageMatch[1];
    }
    const appIdMatch = text.match(/applicationId\s+["']([^"']+)["']/);
    if (appIdMatch?.[1]) {
      return appIdMatch[1];
    }
  }
  return undefined;
}

async function findFirstApk(root: string): Promise<string | undefined> {
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(root, entry.name);
      if (entry.isFile() && entry.name.endsWith(".apk")) {
        return full;
      }
      if (entry.isDirectory()) {
        const nested = await findFirstApk(full);
        if (nested) {
          return nested;
        }
      }
    }
  } catch {
    return undefined;
  }
  return undefined;
}
