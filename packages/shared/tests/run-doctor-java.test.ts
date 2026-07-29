import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { REQUIRED_JDK_MAJOR } from "../src/constants.js";
import { DOCTOR_CHECK_LABELS } from "../src/doctor/doctor-copy.js";
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
  constructor(
    private readonly javaStderr: string,
    private readonly homeJavaStderr?: string,
  ) {}

  async run(spec: CommandSpec): Promise<CommandResult> {
    if (spec.args[0] === "-version") {
      const isPathJava = spec.command === "java";
      const stderr = isPathJava ? this.javaStderr : (this.homeJavaStderr ?? this.javaStderr);
      return {
        exitCode: 0,
        signal: null,
        stdout: "",
        stderr,
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

async function runDoctorWithJava(
  javaStderr: string,
  platform: NodeJS.Platform = "linux",
  options?: { env?: NodeJS.ProcessEnv; homeJavaStderr?: string },
) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-doctor-java-"));
  tempDirs.push(dir);
  return runDoctor({
    cwd: dir,
    runner: new JavaVersionRunner(javaStderr, options?.homeJavaStderr),
    projectAdapter: new NoProjectAdapter(),
    nodeVersion: "20.11.0",
    platform,
    checkFtcSdkVersion: false,
    checkWifi: false,
    env: options?.env,
  });
}

describe("runDoctor Java version", () => {
  it(`passes when JDK major is ${REQUIRED_JDK_MAJOR}`, async () => {
    const report = await runDoctorWithJava('openjdk version "17.0.9" 2023-10-17');
    const javaCheck = report.checks.find((c) => c.id === "java");
    expect(javaCheck?.status).toBe("pass");
    expect(javaCheck?.label).toBe(DOCTOR_CHECK_LABELS.java);
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

  it("warns when PATH java differs from selected JDK 17 home", async () => {
    const jdkRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-jdk17-"));
    tempDirs.push(jdkRoot);
    const binDir = path.join(jdkRoot, "bin");
    await fs.mkdir(binDir);
    await fs.writeFile(path.join(binDir, "java"), "");
    await fs.writeFile(path.join(binDir, "java.exe"), "");

    const report = await runDoctorWithJava('openjdk version "11.0.22"', "linux", {
      env: { FTC_JAVA_HOME: jdkRoot },
      homeJavaStderr: 'openjdk version "17.0.9"',
    });
    const javaCheck = report.checks.find((c) => c.id === "java");
    expect(javaCheck?.status).toBe("warn");
    expect(javaCheck?.detail).toMatch(/builds use JDK 17/);
    expect(javaCheck?.detail).toMatch(/PATH is 11/);
    expect(report.readiness.computerReady).toBeTypeOf("boolean");
  });
});
