import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import { runDoctor } from "../src/doctor/run-doctor.js";
import type { ProjectAdapter } from "../src/types/project.js";
import type { ProcessRunner } from "../src/types/process.js";

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

describe("runDoctor wrong folder", () => {
  it("returns actionable project errors when adapter detects no FTC project", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-doctor-wrong-"));
    tempDirs.push(dir);

    const report = await runDoctor({
      cwd: dir,
      runner: new FakeRunner(),
      projectAdapter: new NoProjectAdapter(),
      nodeVersion: "20.11.0",
      platform: process.platform,
      checkFtcSdkVersion: false,
      checkWifi: false,
    });

    expect(report.readiness.computerReady).toBeTypeOf("boolean");
    expect(report.readiness.projectReadyToBuild).toBe(false);
    expect(report.sections.project.ready).toBe(false);
    expect(report.sections.machine.checks.length).toBeGreaterThan(0);

    const projectCheck = report.checks.find((c) => c.id === "ftc-project");
    expect(projectCheck?.friendlyError?.title).toMatch(/not in an ftc project folder/i);
    expect(projectCheck?.friendlyError?.suggestedActions.join(" ")).toMatch(/settings\.gradle/i);

    const wrapperCheck = report.checks.find((c) => c.id === "gradle-wrapper");
    expect(wrapperCheck?.friendlyError?.title).toMatch(/project folder not detected/i);
    expect(wrapperCheck?.friendlyError?.code).toBe("UNSUPPORTED_PROJECT_LAYOUT");
  });
});
