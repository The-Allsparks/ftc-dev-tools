import fs from "node:fs/promises";
import path from "node:path";

export interface MinimalOfficialFtcProjectOptions {
  /** Include Gradle Wrapper scripts. Default true. */
  includeWrapper?: boolean;
  /** Include build.dependencies.gradle with FTC Maven coords. Default true. */
  includeDependencies?: boolean;
  /** FTC SDK version for Maven coordinates. Default 11.1.0. */
  ftcSdkVersion?: string;
}

/**
 * Write a minimal official-style FTC project tree for unit tests.
 * Shape matches detection heuristics; not buildable without full SDK checkout.
 */
export async function writeMinimalOfficialFtcProject(
  dir: string,
  options: MinimalOfficialFtcProjectOptions = {},
): Promise<void> {
  const includeWrapper = options.includeWrapper !== false;
  const includeDependencies = options.includeDependencies !== false;
  const ftcSdkVersion = options.ftcSdkVersion ?? "11.1.0";

  await fs.writeFile(path.join(dir, "settings.gradle"), "include ':FtcRobotController', ':TeamCode'\n");
  await fs.writeFile(path.join(dir, "build.common.gradle"), "// common\n");
  if (includeDependencies) {
    await fs.writeFile(
      path.join(dir, "build.dependencies.gradle"),
      [
        `implementation 'org.firstinspires.ftc:RobotCore:${ftcSdkVersion}'`,
        `implementation 'org.firstinspires.ftc:FtcCommon:${ftcSdkVersion}'`,
        `implementation 'org.firstinspires.ftc:Hardware:${ftcSdkVersion}'`,
        "",
      ].join("\n"),
    );
  }
  await fs.mkdir(path.join(dir, "FtcRobotController", "src", "main"), { recursive: true });
  await fs.mkdir(path.join(dir, "TeamCode", "src", "main", "java"), { recursive: true });
  await fs.writeFile(
    path.join(dir, "FtcRobotController", "src", "main", "AndroidManifest.xml"),
    '<manifest package="com.qualcomm.ftcrobotcontroller"></manifest>\n',
  );
  if (includeWrapper) {
    await fs.writeFile(path.join(dir, "gradlew.bat"), "@echo off\n");
    await fs.writeFile(path.join(dir, "gradlew"), "#!/bin/sh\n");
    await fs.mkdir(path.join(dir, "gradle", "wrapper"), { recursive: true });
    await fs.writeFile(
      path.join(dir, "gradle", "wrapper", "gradle-wrapper.properties"),
      "distributionUrl=https\\://services.gradle.org/distributions/gradle-8.7-bin.zip\n",
    );
  }
}

export async function readGoldenPathFixture(name: string): Promise<string> {
  const fixturePath = path.join(import.meta.dirname, "..", "fixtures", "golden-path", name);
  return fs.readFile(fixturePath, "utf8");
}
