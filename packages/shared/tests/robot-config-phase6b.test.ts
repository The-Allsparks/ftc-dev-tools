import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  isValidAndroidXmlResourceName,
  isValidFtcDeviceName,
} from "../src/robot-config/defaults.js";
import { listRobotConfigs, showRobotConfig } from "../src/robot-config/list.js";
import { parseRobotConfigXml } from "../src/robot-config/parse.js";
import { pullRobotConfigs } from "../src/robot-config/pull.js";
import { validateRobotConfig } from "../src/robot-config/validate.js";
import type { CommandResult, CommandSpec, ProcessRunner } from "../src/types/process.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

const SAMPLE_ROBOT_XML = `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>
<Robot type="FirstInspires-FTC">
  <LynxUsbDevice name="Control Hub Portal" serialNumber="ABC" productName="Control Hub">
    <LynxModule name="Control Hub" port="173">
      <Motor name="leftFront" port="0" />
      <Motor name="rightFront" port="1" />
      <Servo name="claw" port="0" />
    </LynxModule>
  </LynxUsbDevice>
</Robot>
`;

class FakeAdbRunner implements ProcessRunner {
  readonly commands: CommandSpec[] = [];
  remoteListing = "my_robot.xml\nteamwebcamcalibrations.xml\nnotes.txt\n";
  pullFail = false;

  async run(spec: CommandSpec): Promise<CommandResult> {
    this.commands.push(spec);
    const args = spec.args.map(String);

    if (spec.command === "where" || spec.command === "which") {
      return {
        exitCode: 0,
        signal: null,
        stdout: process.platform === "win32" ? "C:\\fake\\adb.exe\n" : "/usr/bin/adb\n",
        stderr: "",
        timedOut: false,
        durationMs: 1,
      };
    }

    if (args.includes("version")) {
      return {
        exitCode: 0,
        signal: null,
        stdout: "Android Debug Bridge version 1.0.41\n",
        stderr: "",
        timedOut: false,
        durationMs: 1,
      };
    }

    if (args.includes("shell") && args.includes("ls")) {
      return {
        exitCode: 0,
        signal: null,
        stdout: this.remoteListing,
        stderr: "",
        timedOut: false,
        durationMs: 1,
      };
    }

    if (args.includes("pull")) {
      if (this.pullFail) {
        return {
          exitCode: 1,
          signal: null,
          stdout: "",
          stderr: "adb: error: failed to pull",
          timedOut: false,
          durationMs: 1,
        };
      }
      const remote = args[args.indexOf("pull") + 1];
      const local = args[args.indexOf("pull") + 2];
      if (remote && local) {
        await fs.mkdir(path.dirname(local), { recursive: true });
        await fs.writeFile(local, SAMPLE_ROBOT_XML, "utf8");
      }
      return {
        exitCode: 0,
        signal: null,
        stdout: "1 file pulled\n",
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

describe("robot config defaults / parse", () => {
  it("validates resource and device names", () => {
    expect(isValidAndroidXmlResourceName("my_robot")).toBe(true);
    expect(isValidAndroidXmlResourceName("MyRobot")).toBe(false);
    expect(isValidFtcDeviceName("leftFront")).toBe(true);
    expect(isValidFtcDeviceName("left-front")).toBe(false);
  });

  it("parses named devices from Robot XML", () => {
    const parsed = parseRobotConfigXml(SAMPLE_ROBOT_XML);
    expect(parsed.rootType).toBe("FirstInspires-FTC");
    expect(parsed.devices.map((d) => d.name)).toEqual([
      "Control Hub Portal",
      "Control Hub",
      "leftFront",
      "rightFront",
      "claw",
    ]);
    expect(parsed.devices.find((d) => d.name === "leftFront")?.type).toBe("Motor");
  });
});

describe("list / show / validate robot configs", () => {
  it("lists Robot XML and skips webcam calibrations", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-config-"));
    tempDirs.push(root);
    await writeOfficialProject(root);
    const xmlDir = path.join(root, "TeamCode", "src", "main", "res", "xml");
    await fs.mkdir(xmlDir, { recursive: true });
    await fs.writeFile(path.join(xmlDir, "my_robot.xml"), SAMPLE_ROBOT_XML, "utf8");
    await fs.writeFile(
      path.join(xmlDir, "teamwebcamcalibrations.xml"),
      "<Calibrations/>\n",
      "utf8",
    );
    await fs.writeFile(path.join(xmlDir, "not_a_robot.xml"), "<SomethingElse/>\n", "utf8");

    const listed = await listRobotConfigs(root);
    expect(listed.error).toBeUndefined();
    expect(listed.configs).toHaveLength(1);
    expect(listed.configs[0]?.name).toBe("my_robot");
    expect(listed.configs[0]?.deviceCount).toBe(5);
  });

  it("shows and validates a config", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-config-"));
    tempDirs.push(root);
    await writeOfficialProject(root);
    const xmlDir = path.join(root, "TeamCode", "src", "main", "res", "xml");
    await fs.mkdir(xmlDir, { recursive: true });
    await fs.writeFile(path.join(xmlDir, "my_robot.xml"), SAMPLE_ROBOT_XML, "utf8");

    const shown = await showRobotConfig(root, "my_robot");
    expect(shown.success).toBe(true);
    expect(shown.config?.devices.some((d) => d.name === "claw")).toBe(true);

    const valid = await validateRobotConfig(root, "my_robot");
    expect(valid.success).toBe(true);
    expect(valid.issues.filter((i) => i.severity === "error")).toHaveLength(0);
  });

  it("flags duplicate device names", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-config-"));
    tempDirs.push(root);
    await writeOfficialProject(root);
    const xmlDir = path.join(root, "TeamCode", "src", "main", "res", "xml");
    await fs.mkdir(xmlDir, { recursive: true });
    await fs.writeFile(
      path.join(xmlDir, "dup.xml"),
      `<Robot type="t"><Motor name="drive" port="0"/><Motor name="drive" port="1"/></Robot>\n`,
      "utf8",
    );

    const result = await validateRobotConfig(root, "dup");
    expect(result.success).toBe(false);
    expect(result.issues.some((i) => /Duplicate device/.test(i.message))).toBe(true);
  });

  it("returns CONFIG_NOT_FOUND for missing config", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-config-"));
    tempDirs.push(root);
    await writeOfficialProject(root);
    const shown = await showRobotConfig(root, "missing");
    expect(shown.success).toBe(false);
    expect(shown.error?.code).toBe("CONFIG_NOT_FOUND");
  });

  it("returns MISSING_CONFIG_NAME for null, undefined, or blank nameOrPath", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-config-"));
    tempDirs.push(root);
    await writeOfficialProject(root);

    for (const nameOrPath of [null, undefined, "", "   "] as const) {
      const shown = await showRobotConfig(root, nameOrPath);
      expect(shown.success).toBe(false);
      expect(shown.error?.code).toBe("MISSING_CONFIG_NAME");
      expect(shown.message).toMatch(/required/i);
    }
  });
});

describe("pull robot configs", () => {
  it("dry-runs and refuses without --yes", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-config-"));
    tempDirs.push(root);
    await writeOfficialProject(root);
    const runner = new FakeAdbRunner();

    const dry = await pullRobotConfigs({
      projectRoot: root,
      runner,
      deviceSerial: "HUB123",
      dryRun: true,
    });
    expect(dry.success).toBe(true);
    expect(dry.plannedFiles).toEqual(["/sdcard/FIRST/my_robot.xml"]);
    expect(dry.pulledFiles).toHaveLength(0);

    const refused = await pullRobotConfigs({
      projectRoot: root,
      runner,
      deviceSerial: "HUB123",
    });
    expect(refused.success).toBe(false);
    expect(refused.error?.code).toBe("CONFIG_ABORTED");
  });

  it("pulls with --yes into TeamCode res/xml", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-config-"));
    tempDirs.push(root);
    await writeOfficialProject(root);
    const runner = new FakeAdbRunner();

    const result = await pullRobotConfigs({
      projectRoot: root,
      runner,
      deviceSerial: "HUB123",
      yes: true,
    });
    expect(result.success).toBe(true);
    expect(result.pulledFiles).toEqual(["TeamCode/src/main/res/xml/my_robot.xml"]);
    const text = await fs.readFile(
      path.join(root, "TeamCode", "src", "main", "res", "xml", "my_robot.xml"),
      "utf8",
    );
    expect(text).toContain("<Robot");
  });
});
