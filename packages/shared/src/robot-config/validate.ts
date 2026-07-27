import fs from "node:fs/promises";
import { interpretFromUnknown } from "../errors/interpret.js";
import { isValidAndroidXmlResourceName, isValidFtcDeviceName } from "./defaults.js";
import { resolveConfigPath } from "./list.js";
import { parseRobotConfigXml } from "./parse.js";
import type { RobotConfigValidateResult, RobotConfigValidationIssue } from "./types.js";

export async function validateRobotConfig(
  projectRoot: string,
  nameOrPath: string,
): Promise<RobotConfigValidateResult> {
  const issues: RobotConfigValidationIssue[] = [];
  try {
    const resolved = await resolveConfigPath(projectRoot, nameOrPath);
    if (!resolved) {
      return {
        success: false,
        issues: [{ severity: "error", message: `Robot config not found: ${nameOrPath}` }],
        message: `Robot config not found: ${nameOrPath}`,
        error: interpretFromUnknown(
          Object.assign(new Error(`Robot config not found: ${nameOrPath}`), {
            code: "CONFIG_NOT_FOUND",
          }),
        ),
      };
    }

    if (!isValidAndroidXmlResourceName(resolved.name)) {
      issues.push({
        severity: "warning",
        message: `File base name "${resolved.name}" is not a valid Android res/xml resource name (use [a-z0-9_]+).`,
      });
    }

    const xml = await fs.readFile(resolved.absolutePath, "utf8");
    if (!/<Robot\b/i.test(xml)) {
      issues.push({ severity: "error", message: "Missing root <Robot> element." });
    }

    const parsed = parseRobotConfigXml(xml);
    if (!parsed.rootType) {
      issues.push({
        severity: "warning",
        message: 'Root <Robot> has no type="..." attribute.',
      });
    }

    const names = new Map<string, number>();
    for (const device of parsed.devices) {
      names.set(device.name, (names.get(device.name) ?? 0) + 1);
      if (!isValidFtcDeviceName(device.name)) {
        issues.push({
          severity: "warning",
          message: `Device name "${device.name}" (${device.type}) is not a simple identifier; hardwareMap lookups are case-sensitive.`,
        });
      }
    }
    for (const [name, count] of names) {
      if (count > 1) {
        issues.push({
          severity: "error",
          message: `Duplicate device/module name "${name}" appears ${count} times.`,
        });
      }
    }

    if (parsed.devices.length === 0) {
      issues.push({
        severity: "warning",
        message: "No named devices/modules found in this config.",
      });
    }

    const errors = issues.filter((i) => i.severity === "error");
    return {
      success: errors.length === 0,
      configName: resolved.name,
      path: resolved.relativePath,
      issues,
      message:
        errors.length === 0
          ? `Config "${resolved.name}" looks valid (${parsed.devices.length} named entries, ${issues.length} warning(s)).`
          : `Config "${resolved.name}" has ${errors.length} error(s).`,
    };
  } catch (error) {
    return {
      success: false,
      issues,
      message: "Failed to validate robot config.",
      error: interpretFromUnknown(error),
    };
  }
}
