import fs from "node:fs/promises";
import { isValidFtcDeviceName } from "../robot-config/defaults.js";
import { listRobotConfigs } from "../robot-config/list.js";
import { parseRobotConfigXml } from "../robot-config/parse.js";
import type { RobotConfigInfo } from "../robot-config/types.js";
import { resolveXmlTypeMapping, toJavaFieldName } from "./map-types.js";
import type { HardwareMapEntry } from "./types.js";

/** True when --config looks like a path rather than a res/xml base name. */
function isPathLikeConfigRef(name: string): boolean {
  return (
    name.includes("/") ||
    name.includes("\\") ||
    name.includes("..") ||
    /^[A-Za-z]:/.test(name)
  );
}

/**
 * Resolve a robot config for hwmap. Only TeamCode res/xml entries from
 * listRobotConfigs — never arbitrary filesystem paths.
 */
export async function resolveConfigForHwMap(
  projectRoot: string,
  configName?: string,
): Promise<{ config?: RobotConfigInfo; errorMessage?: string; code?: string }> {
  const listed = await listRobotConfigs(projectRoot);
  if (listed.error) {
    return {
      errorMessage: listed.message,
      code: listed.error.code,
    };
  }
  if (listed.configs.length === 0) {
    return {
      errorMessage:
        "No robot config XML found. Pull one with `ftc config pull --yes` or add under TeamCode/src/main/res/xml.",
      code: "HWMAP_NO_CONFIG",
    };
  }

  if (configName?.trim()) {
    const raw = configName.trim();
    if (isPathLikeConfigRef(raw)) {
      return {
        errorMessage: `Robot config not found: ${configName}`,
        code: "CONFIG_NOT_FOUND",
      };
    }
    const base = raw.replace(/\.xml$/i, "");
    const match = listed.configs.find((c) => c.name === base);
    if (!match) {
      return {
        errorMessage: `Robot config not found: ${configName}`,
        code: "CONFIG_NOT_FOUND",
      };
    }
    return { config: match };
  }

  if (listed.configs.length > 1) {
    return {
      errorMessage: `Multiple robot configs found; pass --config NAME (${listed.configs.map((c) => c.name).join(", ")}).`,
      code: "HWMAP_CONFIG_AMBIGUOUS",
    };
  }
  return { config: listed.configs[0] };
}

export async function buildHardwareMapEntries(
  absoluteConfigPath: string,
): Promise<HardwareMapEntry[]> {
  const xml = await fs.readFile(absoluteConfigPath, "utf8");
  const parsed = parseRobotConfigXml(xml);
  const usedNames = new Set<string>();
  const entries: HardwareMapEntry[] = [];

  for (const device of parsed.devices) {
    const mapping = resolveXmlTypeMapping(device.type);
    const fieldName = toJavaFieldName(device.name, usedNames);
    const nameOk = isValidFtcDeviceName(device.name);

    if (!mapping) {
      entries.push({
        configName: device.name,
        xmlType: device.type,
        fieldName,
        port: device.port,
        category: "unknown",
        includedInCodegen: false,
      });
      continue;
    }

    if (mapping.category === "module") {
      entries.push({
        configName: device.name,
        xmlType: device.type,
        fieldName,
        port: device.port,
        category: "module",
        includedInCodegen: false,
      });
      continue;
    }

    entries.push({
      configName: device.name,
      xmlType: device.type,
      javaType: mapping.javaType,
      javaImport: mapping.javaImport,
      fieldName,
      port: device.port,
      category: mapping.category,
      // Only emit hardwareMap.get for simple FTC identifiers (blocks string breakout).
      includedInCodegen: mapping.includedInCodegen && nameOk,
    });
  }

  return entries;
}
