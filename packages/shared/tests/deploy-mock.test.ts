import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readApplicationId } from "../src/adapters/official-ftc-project-adapter.js";
import { deployProject } from "../src/services/deploy.js";
import { OfficialFtcProjectAdapter } from "../src/adapters/official-ftc-project-adapter.js";
import { MockDeviceProvider } from "../src/devices/mock-device-provider.js";
import { ConsoleLogger } from "../src/logger.js";
import type { CommandResult, CommandSpec, ProcessRunner } from "../src/types/process.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

class FakeRunner implements ProcessRunner {
  async run(spec: CommandSpec): Promise<CommandResult> {
    void spec;
    return {
      exitCode: 0,
      signal: null,
      stdout: "BUILD SUCCESSFUL",
      stderr: "",
      timedOut: false,
      durationMs: 1,
    };
  }

  spawn(): never {
    throw new Error("not implemented");
  }
}

describe("application ID parsing and mocked deploy", () => {
  it("parses application id from manifest package", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-appid-"));
    tempDirs.push(dir);
    const manifestDir = path.join(dir, "FtcRobotController", "src", "main");
    await fs.mkdir(manifestDir, { recursive: true });
    await fs.writeFile(
      path.join(manifestDir, "AndroidManifest.xml"),
      `<manifest package="com.qualcomm.ftcrobotcontroller"></manifest>\n`,
    );
    await expect(readApplicationId(dir)).resolves.toBe("com.qualcomm.ftcrobotcontroller");
  });

  it("dry-runs deploy against mock devices without mutating", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-deploy-"));
    tempDirs.push(dir);
    await fs.writeFile(path.join(dir, "settings.gradle"), "include ':TeamCode'\n");
    await fs.writeFile(path.join(dir, "build.common.gradle"), "//\n");
    await fs.mkdir(path.join(dir, "FtcRobotController"), { recursive: true });
    await fs.mkdir(path.join(dir, "TeamCode"), { recursive: true });
    await fs.writeFile(path.join(dir, "gradlew.bat"), "@echo off\n");
    await fs.writeFile(path.join(dir, "gradlew"), "#!/bin/sh\n");

    const outcome = await deployProject({
      adapter: new OfficialFtcProjectAdapter(),
      runner: new FakeRunner(),
      devices: new MockDeviceProvider({ scenario: "one" }),
      logger: new ConsoleLogger("error"),
      cwd: dir,
      dryRun: true,
      skipBuild: true,
      apkPath: path.join(dir, "app.apk"),
    });

    expect(outcome.result.success).toBe(true);
    expect(outcome.result.dryRun).toBe(true);
    expect(outcome.result.steps.some((step) => step.includes("DRY RUN"))).toBe(true);
  });

  it("refuses deploy when multiple devices are connected", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-deploy-multi-"));
    tempDirs.push(dir);
    await fs.writeFile(path.join(dir, "settings.gradle"), "include ':TeamCode'\n");
    await fs.writeFile(path.join(dir, "build.common.gradle"), "//\n");
    await fs.mkdir(path.join(dir, "FtcRobotController"), { recursive: true });
    await fs.mkdir(path.join(dir, "TeamCode"), { recursive: true });
    await fs.writeFile(path.join(dir, "gradlew.bat"), "@echo off\n");

    const outcome = await deployProject({
      adapter: new OfficialFtcProjectAdapter(),
      runner: new FakeRunner(),
      devices: new MockDeviceProvider({ scenario: "multiple" }),
      logger: new ConsoleLogger("error"),
      cwd: dir,
      dryRun: true,
      skipBuild: true,
      apkPath: "app.apk",
    });
    expect(outcome.result.success).toBe(false);
    expect(outcome.friendlyError?.code).toBe("MULTIPLE_DEVICES");
  });
});
