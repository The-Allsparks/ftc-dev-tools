import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runDoctor } from "../src/doctor/run-doctor.js";
import { buildSetUpComputerDoctorOptions } from "../src/setup/setup-computer-doctor.js";
import type { ProcessRunner } from "../src/types/process.js";
import type { ProjectAdapter } from "../src/types/project.js";

class NoProjectAdapter implements ProjectAdapter {
  async detect(): Promise<boolean> {
    return false;
  }

  async inspect(): Promise<never> {
    throw new Error("no project");
  }

  async getBuildCommand(): Promise<never> {
    throw new Error("no project");
  }

  async getCleanCommand(): Promise<never> {
    throw new Error("no project");
  }

  async locateApk(): Promise<never> {
    throw new Error("no project");
  }

  async resolveApplicationId(): Promise<never> {
    throw new Error("no project");
  }
}

class FakeRunner implements ProcessRunner {
  async run(): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return { exitCode: 0, stdout: "", stderr: "" };
  }

  spawn() {
    throw new Error("not used");
  }
}

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

describe("buildSetUpComputerDoctorOptions", () => {
  it("runs doctor with Wi-Fi checks skipped", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-setup-computer-doctor-"));
    tempDirs.push(dir);

    const runner = new FakeRunner();
    const adapter = new NoProjectAdapter();
    const report = await runDoctor({
      ...buildSetUpComputerDoctorOptions(dir, runner, adapter),
      nodeVersion: "20.11.0",
      platform: process.platform,
      checkFtcSdkVersion: false,
    });

    const wifiConsole = report.checks.find((c) => c.id === "wifi-console");
    const wifiRobot = report.checks.find((c) => c.id === "wifi-robot-interface");
    expect(wifiConsole?.status).toBe("skip");
    expect(wifiRobot?.status).toBe("skip");
  });
});
