import { afterEach, describe, expect, it } from "vitest";
import {
  VISION_BRIDGE_CODE_VERSION,
  VISION_DIAGNOSTIC_LOG_PREFIX,
  VISION_DIAGNOSTIC_SCHEMA_VERSION,
} from "../src/vision/bridge/constants.js";
import { renderVisionDiagnosticBridgeSource } from "../src/vision/bridge/templates.js";
import {
  extractVisionDiagnosticJson,
  parseVisionDiagnosticLine,
  validateVisionDiagnosticPayload,
} from "../src/vision/bridge/validate.js";
import { getVisionBridgeStatus } from "../src/vision/bridge/status.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

async function writeMinimalFtcProject(root: string): Promise<void> {
  await fs.writeFile(
    path.join(root, "settings.gradle"),
    "include ':FtcRobotController', ':TeamCode'\n",
  );
  await fs.writeFile(path.join(root, "build.common.gradle"), "// common\n");
  await fs.mkdir(path.join(root, "FtcRobotController"), { recursive: true });
  await fs.mkdir(
    path.join(root, "TeamCode", "src", "main", "java", "org", "firstinsparks", "ftc", "teamcode"),
    { recursive: true },
  );
  await fs.writeFile(path.join(root, "build.dependencies.gradle"), "dependencies {\n}\n");
}

describe("vision diagnostic bridge validation", () => {
  it("parses logcat line with prefix", () => {
    const payload = {
      schemaVersion: VISION_DIAGNOSTIC_SCHEMA_VERSION,
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      sequence: 0,
      timestampMs: 1000,
      bridgeVersion: VISION_BRIDGE_CODE_VERSION,
    };
    const line = `I/FtcVisionBridge: ${VISION_DIAGNOSTIC_LOG_PREFIX}${JSON.stringify(payload)}`;
    const json = extractVisionDiagnosticJson(line);
    expect(json).toBe(JSON.stringify(payload));
    const result = parseVisionDiagnosticLine(line);
    expect(result.valid).toBe(true);
    expect(result.payload?.sequence).toBe(0);
  });

  it("rejects malformed payload", () => {
    const result = validateVisionDiagnosticPayload({ schemaVersion: "9.9.9" });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("warns on bridge version mismatch", () => {
    const result = validateVisionDiagnosticPayload({
      schemaVersion: VISION_DIAGNOSTIC_SCHEMA_VERSION,
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      sequence: 1,
      timestampMs: 2000,
      bridgeVersion: "0.0.1",
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => /Bridge version mismatch/i.test(error))).toBe(true);
  });
});

describe("vision bridge status", () => {
  it("reports missing scaffold on minimal project", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-bridge-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(root);
    const report = await getVisionBridgeStatus(root);
    expect(report.bridgeUtility.present).toBe(false);
    expect(report.capabilities.scaffoldSupported).toBe(true);
    expect(report.preferredTransports).toContain("logcat");
  });
});

describe("vision bridge templates", () => {
  it("embeds version constants in Java source", () => {
    const source = renderVisionDiagnosticBridgeSource({
      packageName: "org.firstinspires.ftc.teamcode.vision",
    });
    expect(source).toContain(`BRIDGE_VERSION = "${VISION_BRIDGE_CODE_VERSION}"`);
    expect(source).toContain(VISION_DIAGNOSTIC_LOG_PREFIX);
  });
});
