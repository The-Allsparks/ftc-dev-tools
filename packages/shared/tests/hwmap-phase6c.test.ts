import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { codegenHardwareMapOpMode } from "../src/hwmap/codegen.js";
import { resolveXmlTypeMapping, toJavaFieldName } from "../src/hwmap/map-types.js";
import { resolveConfigForHwMap } from "../src/hwmap/resolve.js";
import { showHardwareMap } from "../src/hwmap/show.js";
import { escapeJavaString, renderHwMapOpModeSource } from "../src/hwmap/templates.js";
import { isValidJavaPackageName } from "../src/opmode/defaults.js";
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
      <LynxEmbeddedIMU name="imu" port="0" bus="0" />
      <ContinuousRotationServo name="intake" port="1" />
    </LynxModule>
  </LynxUsbDevice>
</Robot>
`;

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

async function writeConfig(root: string, name: string, xml = SAMPLE_ROBOT_XML): Promise<void> {
  const xmlDir = path.join(root, "TeamCode", "src", "main", "res", "xml");
  await fs.mkdir(xmlDir, { recursive: true });
  await fs.writeFile(path.join(xmlDir, `${name}.xml`), xml, "utf8");
}

describe("hwmap type mapping", () => {
  it("maps common XML tags", () => {
    expect(resolveXmlTypeMapping("Motor")?.javaType).toBe("DcMotor");
    expect(resolveXmlTypeMapping("Servo")?.javaType).toBe("Servo");
    expect(resolveXmlTypeMapping("LynxEmbeddedIMU")?.javaType).toBe("IMU");
    expect(resolveXmlTypeMapping("LynxModule")?.category).toBe("module");
    expect(resolveXmlTypeMapping("LynxModule")?.includedInCodegen).toBe(false);
  });

  it("sanitizes field names", () => {
    const used = new Set<string>();
    expect(toJavaFieldName("leftFront", used)).toBe("leftFront");
    expect(toJavaFieldName("Left Motor", used)).toBe("Left_Motor");
    expect(toJavaFieldName("leftFront", used)).toBe("leftFront_2");
  });
});

describe("hwmap show / codegen", () => {
  it("shows mapped devices from config", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-hwmap-"));
    tempDirs.push(root);
    await writeOfficialProject(root);
    await writeConfig(root, "my_robot");

    const shown = await showHardwareMap(root, "my_robot");
    expect(shown.success).toBe(true);
    expect(shown.entries.some((e) => e.configName === "leftFront" && e.javaType === "DcMotor")).toBe(
      true,
    );
    expect(shown.entries.some((e) => e.configName === "imu" && e.javaType === "IMU")).toBe(true);
    expect(shown.entries.filter((e) => e.includedInCodegen)).toHaveLength(5);
    expect(shown.entries.some((e) => e.category === "module")).toBe(true);
  });

  it("requires --config when multiple configs exist", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-hwmap-"));
    tempDirs.push(root);
    await writeOfficialProject(root);
    await writeConfig(root, "a");
    await writeConfig(root, "b");

    const shown = await showHardwareMap(root);
    expect(shown.success).toBe(false);
    expect(shown.error?.code).toBe("HWMAP_CONFIG_AMBIGUOUS");
  });

  it("renders codegen with hardwareMap.get calls", () => {
    const src = renderHwMapOpModeSource({
      className: "HwTele",
      kind: "teleop",
      style: "linear",
      packageName: "org.firstinspires.ftc.teamcode",
      name: "HwTele",
      configName: "my_robot",
      entries: [
        {
          configName: "leftFront",
          xmlType: "Motor",
          javaType: "DcMotor",
          javaImport: "com.qualcomm.robotcore.hardware.DcMotor",
          fieldName: "leftFront",
          category: "actuator",
          includedInCodegen: true,
        },
        {
          configName: "Control Hub",
          xmlType: "LynxModule",
          fieldName: "Control_Hub",
          category: "module",
          includedInCodegen: false,
        },
      ],
    });
    expect(src).toContain('leftFront = hardwareMap.get(DcMotor.class, "leftFront");');
    expect(src).toContain("private DcMotor leftFront;");
    expect(src).not.toContain("Control_Hub");
  });

  it("generates OpMode file with --yes", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-hwmap-"));
    tempDirs.push(root);
    await writeOfficialProject(root);
    await writeConfig(root, "my_robot");

    const dry = await codegenHardwareMapOpMode({
      projectRoot: root,
      runner: new FakeRunner(),
      configName: "my_robot",
      className: "ConfigTele",
      dryRun: true,
    });
    expect(dry.success).toBe(true);
    expect(dry.sourcePreview).toContain("hardwareMap.get(DcMotor.class");

    const created = await codegenHardwareMapOpMode({
      projectRoot: root,
      runner: new FakeRunner(),
      configName: "my_robot",
      className: "ConfigTele",
      yes: true,
    });
    expect(created.success).toBe(true);
    const text = await fs.readFile(created.absolutePath!, "utf8");
    expect(text).toContain('hardwareMap.get(Servo.class, "claw")');
    expect(text).toContain('hardwareMap.get(IMU.class, "imu")');
    expect(text).toContain("@TeleOp");
  });

  it("refuses overwrite without --force", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-hwmap-"));
    tempDirs.push(root);
    await writeOfficialProject(root);
    await writeConfig(root, "my_robot");
    await codegenHardwareMapOpMode({
      projectRoot: root,
      runner: new FakeRunner(),
      configName: "my_robot",
      className: "Dup",
      yes: true,
    });
    const again = await codegenHardwareMapOpMode({
      projectRoot: root,
      runner: new FakeRunner(),
      configName: "my_robot",
      className: "Dup",
      yes: true,
    });
    expect(again.success).toBe(false);
    expect(again.error?.code).toBe("OPMODE_EXISTS");
  });

  it("rejects path-like --config and only reads TeamCode res/xml", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-hwmap-"));
    tempDirs.push(root);
    await writeOfficialProject(root);
    await writeConfig(root, "my_robot");

    const outside = path.join(root, "evil.xml");
    await fs.writeFile(outside, SAMPLE_ROBOT_XML, "utf8");

    const byPath = await resolveConfigForHwMap(root, outside);
    expect(byPath.config).toBeUndefined();
    expect(byPath.code).toBe("CONFIG_NOT_FOUND");

    const shown = await showHardwareMap(root, "../evil");
    expect(shown.success).toBe(false);
    expect(shown.error?.code).toBe("CONFIG_NOT_FOUND");

    const ok = await resolveConfigForHwMap(root, "my_robot");
    expect(ok.config?.name).toBe("my_robot");
  });

  it("rejects invalid --package values", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-hwmap-"));
    tempDirs.push(root);
    await writeOfficialProject(root);
    await writeConfig(root, "my_robot");

    for (const packageName of ["../evil", "foo; class X //", "org..bad", ""]) {
      expect(isValidJavaPackageName(packageName)).toBe(false);
      const result = await codegenHardwareMapOpMode({
        projectRoot: root,
        runner: new FakeRunner(),
        configName: "my_robot",
        className: "PkgTest",
        packageName,
        dryRun: true,
      });
      expect(result.success).toBe(false);
      expect(result.message).toMatch(/Invalid Java package name/);
    }
  });

  it("escapes Unicode breakouts in generated Java strings", () => {
    const payload = '\\u0022); System.exit(1); //';
    const escaped = escapeJavaString(payload);
    // Backslash becomes \\u005c so \\u0022 cannot fire at Java translation time.
    expect(escaped.startsWith("\\u005cu0022")).toBe(true);
    expect(escapeJavaString('say "hi"')).toBe('say \\"hi\\"');

    const src = renderHwMapOpModeSource({
      className: "Safe",
      kind: "teleop",
      style: "linear",
      packageName: "org.firstinspires.ftc.teamcode",
      name: payload,
      group: payload,
      configName: "my_robot",
      entries: [
        {
          configName: "leftFront",
          xmlType: "Motor",
          javaType: "DcMotor",
          javaImport: "com.qualcomm.robotcore.hardware.DcMotor",
          fieldName: "leftFront",
          category: "actuator",
          includedInCodegen: true,
        },
      ],
    });
    expect(src).toContain(`name="${escaped}"`);
    expect(src).toContain(`group="${escaped}"`);
  });

  it("skips codegen for invalid FTC device names", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-hwmap-"));
    tempDirs.push(root);
    await writeOfficialProject(root);
    const xml = `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>
<Robot type="FirstInspires-FTC">
  <LynxUsbDevice name="Control Hub Portal" serialNumber="ABC" productName="Control Hub">
    <LynxModule name="Control Hub" port="173">
      <Motor name="leftFront" port="0" />
      <Motor name="bad-name" port="1" />
      <Motor name="\\u0022x" port="2" />
    </LynxModule>
  </LynxUsbDevice>
</Robot>
`;
    await writeConfig(root, "weird", xml);
    const shown = await showHardwareMap(root, "weird");
    expect(shown.success).toBe(true);
    expect(shown.entries.find((e) => e.configName === "leftFront")?.includedInCodegen).toBe(true);
    expect(shown.entries.find((e) => e.configName === "bad-name")?.includedInCodegen).toBe(false);
    expect(shown.entries.find((e) => e.configName === "\\u0022x")?.includedInCodegen).toBe(false);
  });
});
