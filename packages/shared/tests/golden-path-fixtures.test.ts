import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseAdbDevicesOutput } from "../src/devices/adb-device-provider.js";
import {
  detectAdbInstallErrorCode,
  parseAdbInstallOutput,
} from "../src/devices/parse-adb-install.js";
import { interpretError } from "../src/errors/interpret.js";
import { parseLogcatLine } from "../src/logcat/parse.js";
import { readGoldenPathFixture } from "./helpers/official-ftc-project-fixture.js";

describe("golden-path fixtures", () => {
  it("parses Control Hub adb devices -l output from fixture", async () => {
    const output = await readGoldenPathFixture("adb-devices-control-hub.txt");
    const devices = parseAdbDevicesOutput(output);
    expect(devices).toHaveLength(1);
    expect(devices[0]?.serial).toBe("AH7A12CD");
    expect(devices[0]?.state).toBe("device");
    expect(devices[0]?.model).toBe("Control_Hub");
  });

  it("parses multiple-device adb output from fixture", async () => {
    const output = await readGoldenPathFixture("adb-devices-multiple.txt");
    const devices = parseAdbDevicesOutput(output);
    expect(devices).toHaveLength(2);
    expect(devices.every((d) => d.state === "device")).toBe(true);
  });

  it("parses successful adb install from fixture", async () => {
    const output = await readGoldenPathFixture("adb-install-success.txt");
    expect(parseAdbInstallOutput(output)).toEqual({ success: true });
    expect(detectAdbInstallErrorCode(output)).toBeUndefined();
  });

  it("parses signature-conflict adb install from fixture", async () => {
    const output = await readGoldenPathFixture("adb-install-signature-failure.txt");
    expect(parseAdbInstallOutput(output)).toEqual({
      success: false,
      code: "INSTALL_SIGNATURE_CONFLICT",
      message: "Installation signature conflict.",
    });
  });

  it("interprets Gradle compile failure from fixture", async () => {
    const output = await readGoldenPathFixture("gradle-compile-failure.txt");
    const friendly = interpretError(output);
    expect(friendly.code).not.toBe("UNKNOWN_ERROR");
    expect(friendly.summary.toLowerCase()).toMatch(/compile|build|symbol|failed/i);
  });

  it("parses TeamCode logcat lines from fixture", async () => {
    const output = await readGoldenPathFixture("logcat-teamcode-sample.txt");
    const lines = output.trim().split(/\r?\n/).filter(Boolean);
    expect(lines.length).toBeGreaterThanOrEqual(3);
    const entry = parseLogcatLine(lines[0]!);
    expect(entry.tag).toBe("TeamCode");
    expect(entry.message).toContain("TeleOpDrive");
  });
});

describe("official FTC project fixture helper", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    for (const dir of tempDirs.splice(0)) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it("writes detectable project without wrapper when requested", async () => {
    const { writeMinimalOfficialFtcProject } =
      await import("./helpers/official-ftc-project-fixture.js");
    const { OfficialFtcProjectAdapter } =
      await import("../src/adapters/official-ftc-project-adapter.js");
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-fixture-"));
    tempDirs.push(dir);
    await writeMinimalOfficialFtcProject(dir, { includeWrapper: false });
    const adapter = new OfficialFtcProjectAdapter();
    expect(await adapter.detect(dir)).toBe(true);
    const wrapper = await import("../src/gradle/wrapper.js");
    expect((await wrapper.findGradleWrapper(dir)).found).toBe(false);
  });
});
