import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createOpMode } from "../src/opmode/create.js";
import { listOpModes, parseOpModeFromSource } from "../src/opmode/list.js";
import { renderOpModeSource } from "../src/opmode/templates.js";
import type { CommandResult, CommandSpec, ProcessRunner } from "../src/types/process.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

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

async function writeOfficialProject(root: string): Promise<void> {
  await fs.writeFile(path.join(root, "settings.gradle"), "include ':TeamCode'\n");
  await fs.writeFile(path.join(root, "build.gradle"), "// root\n");
  await fs.writeFile(path.join(root, "build.common.gradle"), "// common\n");
  await fs.mkdir(path.join(root, "FtcRobotController"), { recursive: true });
  await fs.mkdir(path.join(root, "TeamCode", "src", "main", "java"), { recursive: true });
}

describe("opmode templates and parse", () => {
  it("renders linear teleop with annotation", () => {
    const src = renderOpModeSource({
      className: "MyTele",
      kind: "teleop",
      style: "linear",
      packageName: "org.firstinspires.ftc.teamcode",
      name: "My Tele",
      group: "drive",
    });
    expect(src).toContain('@TeleOp(name="My Tele", group="drive")');
    expect(src).toContain("extends LinearOpMode");
    expect(src).toContain("waitForStart()");
  });

  it("parses annotated class", () => {
    const detected = parseOpModeFromSource(
      `package org.firstinspires.ftc.teamcode;
@Autonomous(name="Auto", group="test")
public class BlueAuto extends LinearOpMode {}
`,
      "TeamCode/src/main/java/org/firstinspires/ftc/teamcode/BlueAuto.java",
    );
    expect(detected?.className).toBe("BlueAuto");
    expect(detected?.kind).toBe("autonomous");
    expect(detected?.group).toBe("test");
  });
});

describe("list / create OpMode", () => {
  it("creates teleop and lists it", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-opmode-"));
    tempDirs.push(root);
    await writeOfficialProject(root);

    const dry = await createOpMode({
      projectRoot: root,
      runner: new FakeRunner(),
      className: "MyTele",
      kind: "teleop",
      dryRun: true,
    });
    expect(dry.success).toBe(true);
    expect(dry.relativePath).toContain("MyTele.java");

    const created = await createOpMode({
      projectRoot: root,
      runner: new FakeRunner(),
      className: "MyTele",
      kind: "teleop",
      group: "demo",
      yes: true,
    });
    expect(created.success).toBe(true);
    const text = await fs.readFile(created.absolutePath!, "utf8");
    expect(text).toContain("@TeleOp");
    expect(text).toContain('group="demo"');

    const listed = await listOpModes(root);
    expect(listed.opmodes.some((o) => o.className === "MyTele" && o.kind === "teleop")).toBe(true);
  });

  it("refuses overwrite without --force", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-opmode-"));
    tempDirs.push(root);
    await writeOfficialProject(root);
    await createOpMode({
      projectRoot: root,
      runner: new FakeRunner(),
      className: "Dup",
      kind: "autonomous",
      yes: true,
    });
    const again = await createOpMode({
      projectRoot: root,
      runner: new FakeRunner(),
      className: "Dup",
      kind: "autonomous",
      yes: true,
    });
    expect(again.success).toBe(false);
    expect(again.error?.code).toBe("OPMODE_EXISTS");
  });

  it("rejects invalid class names", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-opmode-"));
    tempDirs.push(root);
    await writeOfficialProject(root);
    const result = await createOpMode({
      projectRoot: root,
      runner: new FakeRunner(),
      className: "123Bad",
      kind: "teleop",
      yes: true,
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("OPMODE_INVALID_NAME");
  });

  it("refuses dirty tree without --force", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-opmode-"));
    tempDirs.push(root);
    await writeOfficialProject(root);
    const runner = new FakeRunner();
    runner.dirty = true;
    const result = await createOpMode({
      projectRoot: root,
      runner,
      className: "DirtyOp",
      kind: "teleop",
      yes: true,
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("OPMODE_DIRTY_TREE");
  });
});
