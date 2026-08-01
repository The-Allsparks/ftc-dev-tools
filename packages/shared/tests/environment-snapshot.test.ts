import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { OfficialFtcProjectAdapter } from "../src/adapters/official-ftc-project-adapter.js";
import { collectEnvironmentSnapshot } from "../src/diagnostics/environment-snapshot.js";
import { MockDeviceProvider } from "../src/devices/mock-device-provider.js";
import type { CommandResult, CommandSpec, ProcessRunner } from "../src/types/process.js";
import { writeMinimalOfficialFtcProject } from "./helpers/official-ftc-project-fixture.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

class SnapshotRunner implements ProcessRunner {
  async run(spec: CommandSpec): Promise<CommandResult> {
    const args = spec.args ?? [];
    const cmd = spec.command.toLowerCase();
    if (args.includes("--version") || args.includes("-version")) {
      if (cmd.includes("java")) {
        return {
          exitCode: 0,
          signal: null,
          stdout: "",
          stderr: 'openjdk version "17.0.12" 2024-07-16',
          timedOut: false,
          durationMs: 1,
        };
      }
      if (cmd.includes("gradlew")) {
        return {
          exitCode: 0,
          signal: null,
          stdout: "Gradle 8.7",
          stderr: "",
          timedOut: false,
          durationMs: 1,
        };
      }
      if (cmd.includes("adb")) {
        return {
          exitCode: 0,
          signal: null,
          stdout: "Android Debug Bridge version 1.0.41",
          stderr: "",
          timedOut: false,
          durationMs: 1,
        };
      }
    }
    if (spec.command === "where" || spec.command === "which") {
      return { exitCode: 1, signal: null, stdout: "", stderr: "", timedOut: false, durationMs: 1 };
    }
    return { exitCode: 0, signal: null, stdout: "", stderr: "", timedOut: false, durationMs: 1 };
  }

  spawn(): never {
    throw new Error("not implemented");
  }
}

describe("collectEnvironmentSnapshot", () => {
  it("reports project detection and version skew warnings", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-env-"));
    tempDirs.push(dir);
    await writeMinimalOfficialFtcProject(dir);

    const snapshot = await collectEnvironmentSnapshot({
      cwd: dir,
      runner: new SnapshotRunner(),
      projectAdapter: new OfficialFtcProjectAdapter(),
      deviceProvider: new MockDeviceProvider({ scenario: "one" }),
      extensionVersion: "0.2.0",
    });

    expect(snapshot.schemaVersion).toBe("1.0.0");
    expect(snapshot.project?.detected).toBe(true);
    expect(snapshot.project?.root).toBe(dir);
    expect(snapshot.gradle?.wrapperFound).toBe(true);
    expect(snapshot.robot?.deviceCount).toBe(1);
    expect(snapshot.versionSkewWarnings.some((w) => w.includes("Extension version"))).toBe(true);
  });

  it("warns when project is not detected", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-env-empty-"));
    tempDirs.push(dir);

    const snapshot = await collectEnvironmentSnapshot({
      cwd: dir,
      runner: new SnapshotRunner(),
      projectAdapter: new OfficialFtcProjectAdapter(),
    });

    expect(snapshot.project?.detected).toBe(false);
    expect(snapshot.versionSkewWarnings.some((w) => w.includes("No FTC project"))).toBe(true);
  });
});
