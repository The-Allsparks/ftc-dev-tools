import { describe, expect, it } from "vitest";
import {
  ConsoleLogger,
  MockDeviceProvider,
  OfficialFtcProjectAdapter,
  checkSdkStatus,
  formatCommandForDisplay,
  runDoctor,
} from "@ftc-dev-tools/shared";
import type { CommandResult, CommandSpec, ProcessRunner } from "@ftc-dev-tools/shared";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach } from "vitest";

class FakeRunner implements ProcessRunner {
  async run(spec: CommandSpec): Promise<CommandResult> {
    const joined = formatCommandForDisplay(spec);
    if (joined.includes("java")) {
      return {
        exitCode: 0,
        signal: null,
        stdout: "",
        stderr: 'openjdk version "17.0.0"',
        timedOut: false,
        durationMs: 1,
      };
    }
    if (joined.includes("where") || joined.includes("which") || joined.includes("adb version")) {
      return {
        exitCode: 1,
        signal: null,
        stdout: "",
        stderr: "",
        timedOut: false,
        durationMs: 1,
      };
    }
    if (joined.includes("--version")) {
      return {
        exitCode: 0,
        signal: null,
        stdout: "Gradle 8.7",
        stderr: "",
        timedOut: false,
        durationMs: 1,
      };
    }
    return {
      exitCode: 0,
      signal: null,
      stdout: "",
      stderr: "",
      timedOut: false,
      durationMs: 1,
    };
  }

  spawn(): never {
    throw new Error("not used");
  }
}

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

describe("CLI-facing shared flows", () => {
  it("produces stable doctor JSON fields", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-cli-doctor-"));
    tempDirs.push(dir);
    await fs.writeFile(path.join(dir, "settings.gradle"), "include ':TeamCode'\n");
    await fs.writeFile(path.join(dir, "build.common.gradle"), "//\n");
    await fs.mkdir(path.join(dir, "FtcRobotController"), { recursive: true });
    await fs.mkdir(path.join(dir, "TeamCode"), { recursive: true });
    await fs.writeFile(path.join(dir, "gradlew.bat"), "@echo off\n");
    await fs.writeFile(path.join(dir, "gradlew"), "#!/bin/sh\n");

    const report = await runDoctor({
      cwd: dir,
      runner: new FakeRunner(),
      projectAdapter: new OfficialFtcProjectAdapter(),
      deviceProvider: new MockDeviceProvider({ scenario: "one" }),
      nodeVersion: "20.11.0",
      platform: process.platform,
      checkFtcSdkVersion: false,
      checkWifi: false,
    });

    expect(report).toMatchObject({
      ready: expect.any(Boolean),
      summaryLine: expect.any(String),
      version: expect.any(String),
      generatedAt: expect.any(String),
    });
    expect(Array.isArray(report.checks)).toBe(true);
    expect(
      report.checks.some((check) => check.id === "ftc-project" && check.status === "pass"),
    ).toBe(true);
    expect(report.checks.some((check) => check.id === "ftc-sdk-version")).toBe(true);
    expect(report.checks.every((check) => typeof check.label === "string")).toBe(true);
  });

  it("checkSdkStatus reports behind against mocked latest", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-cli-sdk-"));
    tempDirs.push(dir);
    await fs.writeFile(
      path.join(dir, "build.dependencies.gradle"),
      `implementation 'org.firstinspires.ftc:RobotCore:11.1.0'\n`,
    );
    const report = await checkSdkStatus({
      projectRoot: dir,
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        async json() {
          return [
            {
              tag_name: "v11.2",
              name: "v11.2",
              html_url:
                "https://github.com/FIRST-Tech-Challenge/FtcRobotController/releases/tag/v11.2",
              zipball_url:
                "https://api.github.com/repos/FIRST-Tech-Challenge/FtcRobotController/zipball/v11.2",
              draft: false,
              prerelease: false,
            },
          ];
        },
        async text() {
          return "[]";
        },
        async arrayBuffer() {
          return new ArrayBuffer(0);
        },
      }),
    });
    expect(report.local.version).toBe("11.1.0");
    expect(report.freshness).toBe("behind");
  });

  it("formats command display without shell interpolation", () => {
    const line = formatCommandForDisplay({
      command: "adb",
      args: ["-s", "ABC 123", "install", "-r", "app.apk"],
    });
    expect(line).toContain("adb");
    expect(line).toContain('"ABC 123"');
    void new ConsoleLogger("error");
  });
});
