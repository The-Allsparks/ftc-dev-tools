import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { REQUIRED_JDK_MAJOR } from "../src/constants.js";
import { runDoctor } from "../src/doctor/run-doctor.js";
import type { CommandResult, CommandSpec, ProcessRunner } from "../src/types/process.js";
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

class JavaVersionRunner implements ProcessRunner {
  constructor(private readonly javaStderr: string) {}

  async run(spec: CommandSpec): Promise<CommandResult> {
    if (spec.command === "java" && spec.args[0] === "-version") {
      return {
        exitCode: 0,
        signal: null,
        stdout: "",
        stderr: this.javaStderr,
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

async function runDoctorWithJava(javaStderr: string, platform: NodeJS.Platform = "linux") {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-doctor-java-"));
  tempDirs.push(dir);
  return runDoctor({
    cwd: dir,
    runner: new JavaVersionRunner(javaStderr),
    projectAdapter: new NoProjectAdapter(),
    nodeVersion: "20.11.0",
    platform,
    checkFtcSdkVersion: false,
    checkWifi: false,
  });
}

describe("runDoctor Java version", () => {
  it(`passes when JDK major is ${REQUIRED_JDK_MAJOR}`, async () => {
    const report = await runDoctorWithJava('openjdk version "17.0.9" 2023-10-17');
    const javaCheck = report.checks.find((c) => c.id === "java");
    expect(javaCheck?.status).toBe("pass");
    expect(javaCheck?.label).toBe("Supported JDK version");
    expect(report.readiness.computerReady).toBeTypeOf("boolean");
  });

  it("fails when JDK major is unsupported", async () => {
    const report = await runDoctorWithJava('openjdk version "11.0.22" 2024-01-16');
    const javaCheck = report.checks.find((c) => c.id === "java");
    expect(javaCheck?.status).toBe("fail");
    expect(javaCheck?.friendlyError?.code).toBe("INCOMPATIBLE_JAVA");
    expect(javaCheck?.friendlyError?.summary).toContain(String(REQUIRED_JDK_MAJOR));
    expect(javaCheck?.friendlyError?.suggestedActions.join(" ")).toMatch(/install-deps/);
    expect(report.readiness.computerReady).toBe(false);
  });

  it("includes platform install-deps guidance on Windows", async () => {
    const report = await runDoctorWithJava('openjdk version "11.0.22"', "win32");
    const javaCheck = report.checks.find((c) => c.id === "java");
    expect(javaCheck?.friendlyError?.suggestedActions.join(" ")).toMatch(
      /install-deps-windows\.ps1/,
    );
  });

  it("warns when java -version output cannot be parsed", async () => {
    const report = await runDoctorWithJava("java runtime present");
    const javaCheck = report.checks.find((c) => c.id === "java");
    expect(javaCheck?.status).toBe("warn");
    expect(javaCheck?.friendlyError?.title).toMatch(/could not verify/i);
    expect(report.readiness.computerReady).toBe(false);
  });
});
