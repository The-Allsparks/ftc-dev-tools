import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { OfficialFtcProjectAdapter } from "../src/adapters/official-ftc-project-adapter.js";
import { buildProject } from "../src/services/build.js";
import { ConsoleLogger } from "../src/logger.js";
import type { CommandResult, CommandSpec, ProcessRunner } from "../src/types/process.js";
import { readGoldenPathFixture } from "./helpers/official-ftc-project-fixture.js";
import { writeMinimalOfficialFtcProject } from "./helpers/official-ftc-project-fixture.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

class FixtureRunner implements ProcessRunner {
  constructor(private readonly mode: "success" | "compile-failure") {}

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
    }
    if (args.some((arg) => arg.includes("assembleDebug"))) {
      const fixtureName =
        this.mode === "success" ? "gradle-build-success.txt" : "gradle-compile-failure.txt";
      const output = await readGoldenPathFixture(fixtureName);
      return {
        exitCode: this.mode === "success" ? 0 : 1,
        signal: null,
        stdout: output,
        stderr: this.mode === "compile-failure" ? output : "",
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
    throw new Error("not implemented");
  }
}

describe("buildProject with golden-path fixtures", () => {
  it("reports success from recorded Gradle output", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-build-"));
    tempDirs.push(dir);
    await writeMinimalOfficialFtcProject(dir);
    const apkDir = path.join(dir, "TeamCode", "build", "outputs", "apk", "debug");
    await fs.mkdir(apkDir, { recursive: true });
    await fs.writeFile(path.join(apkDir, "TeamCode-debug.apk"), "fake-apk");

    const outcome = await buildProject({
      adapter: new OfficialFtcProjectAdapter(),
      runner: new FixtureRunner("success"),
      logger: new ConsoleLogger("error"),
      cwd: dir,
    });

    expect(outcome.result.success).toBe(true);
    expect(outcome.result.stdout).toContain("BUILD SUCCESSFUL");
  });

  it("surfaces compile failure from recorded Gradle output", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-build-fail-"));
    tempDirs.push(dir);
    await writeMinimalOfficialFtcProject(dir);

    const outcome = await buildProject({
      adapter: new OfficialFtcProjectAdapter(),
      runner: new FixtureRunner("compile-failure"),
      logger: new ConsoleLogger("error"),
      cwd: dir,
    });

    expect(outcome.result.success).toBe(false);
    expect(outcome.friendlyError).toBeDefined();
    expect(outcome.friendlyError?.code).not.toBe("UNKNOWN_ERROR");
    expect(outcome.result.stderr).toContain("cannot find symbol");
  });
});
