import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { CommandResult, CommandSpec, ProcessRunner } from "../src/types/process.js";
import { applySdkUpdate, planSdkUpdate, SDK_OWNED_PATHS } from "../src/sdk/sync-sdk-update.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

async function makeTemp(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

class FakeRunner implements ProcessRunner {
  dirty = false;

  async run(spec: CommandSpec): Promise<CommandResult> {
    if (spec.command === "git" && spec.args.includes("status")) {
      return {
        exitCode: 0,
        signal: null,
        stdout: this.dirty ? " M TeamCode/foo.java\n" : "",
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

async function writeProject(root: string, robotCoreVersion: string): Promise<void> {
  await fs.writeFile(path.join(root, "settings.gradle"), "include ':TeamCode'\n");
  await fs.writeFile(path.join(root, "build.gradle"), "// old build\n");
  await fs.writeFile(path.join(root, "build.common.gradle"), "// old common\n");
  await fs.writeFile(
    path.join(root, "build.dependencies.gradle"),
    `implementation 'org.firstinspires.ftc:RobotCore:${robotCoreVersion}'\n`,
  );
  await fs.mkdir(path.join(root, "FtcRobotController"), { recursive: true });
  await fs.writeFile(path.join(root, "FtcRobotController", "marker.txt"), "old-rc\n");
  await fs.mkdir(path.join(root, "TeamCode", "src"), { recursive: true });
  await fs.writeFile(path.join(root, "TeamCode", "src", "MyOpMode.java"), "team-secret\n");
  await fs.writeFile(path.join(root, "gradlew"), "#!/bin/sh\nold\n");
  await fs.writeFile(path.join(root, "gradlew.bat"), "@echo off\nold\n");
  await fs.mkdir(path.join(root, "gradle", "wrapper"), { recursive: true });
  await fs.writeFile(path.join(root, "gradle", "wrapper", "gradle-wrapper.properties"), "old=1\n");
}

async function writeUpstream(root: string, robotCoreVersion: string): Promise<void> {
  await fs.writeFile(
    path.join(root, "settings.gradle"),
    "include ':FtcRobotController', ':TeamCode'\n",
  );
  await fs.writeFile(path.join(root, "build.gradle"), "// new build\n");
  await fs.writeFile(path.join(root, "build.common.gradle"), "// new common\n");
  await fs.writeFile(
    path.join(root, "build.dependencies.gradle"),
    `implementation 'org.firstinspires.ftc:RobotCore:${robotCoreVersion}'\n`,
  );
  await fs.mkdir(path.join(root, "FtcRobotController"), { recursive: true });
  await fs.writeFile(path.join(root, "FtcRobotController", "marker.txt"), "new-rc\n");
  await fs.mkdir(path.join(root, "TeamCode", "src"), { recursive: true });
  await fs.writeFile(path.join(root, "TeamCode", "src", "UpstreamOnly.java"), "should-not-copy\n");
  await fs.writeFile(path.join(root, "gradlew"), "#!/bin/sh\nnew\n");
  await fs.writeFile(path.join(root, "gradlew.bat"), "@echo off\nnew\n");
  await fs.mkdir(path.join(root, "gradle", "wrapper"), { recursive: true });
  await fs.writeFile(path.join(root, "gradle", "wrapper", "gradle-wrapper.properties"), "new=1\n");
  await fs.writeFile(path.join(root, "README.md"), "upstream readme should not sync\n");
}

describe("planSdkUpdate / applySdkUpdate", () => {
  it("dry-run plan excludes TeamCode", async () => {
    const project = await makeTemp("ftc-sdk-proj-");
    const upstream = await makeTemp("ftc-sdk-up-");
    await writeProject(project, "11.1.0");
    await writeUpstream(upstream, "11.2.0");

    const plan = await planSdkUpdate({
      projectRoot: project,
      sourceRoot: upstream,
      targetVersion: "11.2.0",
      targetTag: "v11.2",
    });

    expect(plan.teamCodePreserved).toBe(true);
    expect(plan.entries.every((e) => !e.relativePath.startsWith("TeamCode"))).toBe(true);
    expect(plan.entries.some((e) => e.relativePath === "build.dependencies.gradle")).toBe(true);
    expect(SDK_OWNED_PATHS).not.toContain("TeamCode");
  });

  it("apply updates SDK paths and leaves TeamCode byte-identical", async () => {
    const project = await makeTemp("ftc-sdk-proj-");
    const upstream = await makeTemp("ftc-sdk-up-");
    await writeProject(project, "11.1.0");
    await writeUpstream(upstream, "11.2.0");
    const teamBefore = await fs.readFile(path.join(project, "TeamCode", "src", "MyOpMode.java"));

    const runner = new FakeRunner();
    const result = await applySdkUpdate({
      projectRoot: project,
      runner,
      yes: true,
      sourceRoot: upstream,
      targetTag: "v11.2",
    });

    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(false);
    expect(result.appliedPaths).not.toContain("TeamCode");
    const deps = await fs.readFile(path.join(project, "build.dependencies.gradle"), "utf8");
    expect(deps).toContain("11.2.0");
    const marker = await fs.readFile(
      path.join(project, "FtcRobotController", "marker.txt"),
      "utf8",
    );
    expect(marker).toBe("new-rc\n");
    const teamAfter = await fs.readFile(path.join(project, "TeamCode", "src", "MyOpMode.java"));
    expect(teamAfter.equals(teamBefore)).toBe(true);
    expect(
      await fs
        .access(path.join(project, "TeamCode", "src", "UpstreamOnly.java"))
        .then(() => true)
        .catch(() => false),
    ).toBe(false);
    expect(result.backupDirectory).toBeTruthy();
  });

  it("replaces SDK directories exactly (removes stale files)", async () => {
    const project = await makeTemp("ftc-sdk-proj-");
    const upstream = await makeTemp("ftc-sdk-up-");
    await writeProject(project, "11.1.0");
    await writeUpstream(upstream, "11.2.0");
    await fs.writeFile(
      path.join(project, "FtcRobotController", "stale-only-local.txt"),
      "remove-me\n",
    );

    const runner = new FakeRunner();
    const result = await applySdkUpdate({
      projectRoot: project,
      runner,
      yes: true,
      sourceRoot: upstream,
      targetTag: "v11.2",
    });

    expect(result.success).toBe(true);
    await expect(
      fs.access(path.join(project, "FtcRobotController", "stale-only-local.txt")),
    ).rejects.toThrow();
  });

  it("refuses dirty tree without --force", async () => {
    const project = await makeTemp("ftc-sdk-proj-");
    const upstream = await makeTemp("ftc-sdk-up-");
    await writeProject(project, "11.1.0");
    await writeUpstream(upstream, "11.2.0");
    const runner = new FakeRunner();
    runner.dirty = true;

    const result = await applySdkUpdate({
      projectRoot: project,
      runner,
      yes: true,
      sourceRoot: upstream,
      targetTag: "v11.2",
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("SDK_UPDATE_DIRTY_TREE");
  });

  it("dry-run does not write files", async () => {
    const project = await makeTemp("ftc-sdk-proj-");
    const upstream = await makeTemp("ftc-sdk-up-");
    await writeProject(project, "11.1.0");
    await writeUpstream(upstream, "11.2.0");
    const runner = new FakeRunner();

    const result = await applySdkUpdate({
      projectRoot: project,
      runner,
      dryRun: true,
      sourceRoot: upstream,
      targetTag: "v11.2",
    });
    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    const deps = await fs.readFile(path.join(project, "build.dependencies.gradle"), "utf8");
    expect(deps).toContain("11.1.0");
  });
});
