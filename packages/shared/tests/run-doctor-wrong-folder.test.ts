import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import { OfficialFtcProjectAdapter } from "../src/adapters/official-ftc-project-adapter.js";
import { runDoctor } from "../src/doctor/run-doctor.js";
import type { ProcessRunner } from "../src/types/process.js";

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

async function writeOfficialFtcRoot(root: string): Promise<void> {
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(
    path.join(root, "settings.gradle"),
    "include ':FtcRobotController', ':TeamCode'\n",
  );
  await fs.writeFile(path.join(root, "build.common.gradle"), "// common\n");
  await fs.mkdir(path.join(root, "FtcRobotController"), { recursive: true });
  await fs.mkdir(path.join(root, "TeamCode", "src", "main", "java"), { recursive: true });
  await fs.writeFile(path.join(root, "gradlew.bat"), "@echo off\n");
  await fs.writeFile(path.join(root, "gradlew"), "#!/bin/sh\n");
}

describe("runDoctor wrong folder", () => {
  it("returns actionable project errors when adapter detects no FTC project", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-doctor-wrong-"));
    tempDirs.push(dir);

    class NoProjectAdapter extends OfficialFtcProjectAdapter {
      override async detect(): Promise<boolean> {
        return false;
      }
    }

    const report = await runDoctor({
      cwd: dir,
      runner: new FakeRunner(),
      projectAdapter: new NoProjectAdapter(),
      nodeVersion: "20.11.0",
      platform: process.platform,
      checkFtcSdkVersion: false,
      checkWifi: false,
    });

    expect(report.readiness.projectReadyToBuild).toBe(false);
    const projectCheck = report.checks.find((c) => c.id === "ftc-project");
    expect(projectCheck?.friendlyError?.title).toMatch(/not in an ftc project folder/i);

    const wrapperCheck = report.checks.find((c) => c.id === "gradle-wrapper");
    expect(wrapperCheck?.friendlyError?.title).toMatch(/project folder not detected/i);
  });

  it(
    "suggests nearby FTC root when opened in TeamCode subfolder",
    async () => {
      const monorepo = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-doctor-nested-"));
      tempDirs.push(monorepo);
      const ftcRoot = path.join(monorepo, "FtcRobotController");
      await writeOfficialFtcRoot(ftcRoot);
      const cwd = path.join(ftcRoot, "TeamCode");

      const report = await runDoctor({
        cwd,
        runner: new FakeRunner(),
        projectAdapter: new OfficialFtcProjectAdapter(),
        nodeVersion: "20.11.0",
        platform: process.platform,
        checkFtcSdkVersion: false,
        checkWifi: false,
      });

      const projectCheck = report.checks.find((c) => c.id === "ftc-project");
      expect(projectCheck?.suggestedProjectRoots?.[0]).toBe(path.resolve(ftcRoot));
      expect(projectCheck?.friendlyError?.suggestedProjectRoots?.[0]).toBe(path.resolve(ftcRoot));

      const wrapperCheck = report.checks.find((c) => c.id === "gradle-wrapper");
      expect(wrapperCheck?.suggestedProjectRoots?.[0]).toBe(path.resolve(ftcRoot));
    },
    60_000,
  );
});
