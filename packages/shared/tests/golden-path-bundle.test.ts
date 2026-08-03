import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { OfficialFtcProjectAdapter } from "../src/adapters/official-ftc-project-adapter.js";
import {
  collectGoldenPathBundle,
  formatGoldenPathBundleMarkdown,
} from "../src/diagnostics/golden-path-bundle.js";
import { redactDiagnosticText } from "../src/diagnostics/redact.js";
import { MockDeviceProvider } from "../src/devices/mock-device-provider.js";
import type { CommandResult, CommandSpec, ProcessRunner } from "../src/types/process.js";
import { writeMinimalOfficialFtcProject } from "./helpers/official-ftc-project-fixture.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

class BundleRunner implements ProcessRunner {
  async run(spec: CommandSpec): Promise<CommandResult> {
    if (spec.args?.includes("--version")) {
      return {
        exitCode: 0,
        signal: null,
        stdout: spec.command.includes("gradlew") ? "Gradle 8.7" : "",
        stderr: spec.command.includes("java") ? 'openjdk version "17.0.12"' : "",
        timedOut: false,
        durationMs: 1,
      };
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

describe("collectGoldenPathBundle", () => {
  it("composes doctor, environment, and device evidence", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-bundle-"));
    tempDirs.push(dir);
    await writeMinimalOfficialFtcProject(dir);

    const bundle = await collectGoldenPathBundle({
      cwd: dir,
      runner: new BundleRunner(),
      projectAdapter: new OfficialFtcProjectAdapter(),
      deviceProvider: new MockDeviceProvider({ scenario: "none" }),
      trigger: { command: "ftc deploy", errorCode: "NO_DEVICES", errorTitle: "No robot connected" },
    });

    expect(bundle.schemaVersion).toBe("1.0.0");
    expect(bundle.environment.project?.detected).toBe(true);
    expect(bundle.doctor).toBeDefined();
    expect(bundle.devices?.count).toBe(0);
    expect(bundle.diagnosticCodes).toContain("NO_DEVICES");
  });

  it("redacts serial numbers and home paths", async () => {
    const raw = "Device AH7A12CD at C:\\Users\\student\\FTC connected to 192.168.43.1";
    const redacted = redactDiagnosticText(raw);
    expect(redacted).not.toContain("AH7A12CD");
    expect(redacted).not.toContain("student");
    expect(redacted).not.toContain("192.168.43.1");
  });

  it("formats markdown summary for mentors", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-bundle-md-"));
    tempDirs.push(dir);
    await writeMinimalOfficialFtcProject(dir);

    const bundle = await collectGoldenPathBundle({
      cwd: dir,
      runner: new BundleRunner(),
      projectAdapter: new OfficialFtcProjectAdapter(),
      includeDoctor: false,
    });

    const md = formatGoldenPathBundleMarkdown(bundle);
    expect(md).toContain("golden-path diagnostic bundle");
    expect(md).toContain("Product version:");
  });
});
