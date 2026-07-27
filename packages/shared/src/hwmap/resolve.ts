import fs from "node:fs/promises";
import { listRobotConfigs, resolveConfigPath } from "../robot-config/list.js";
import { parseRobotConfigXml } from "../robot-config/parse.js";
import type { RobotConfigInfo } from "../robot-config/types.js";
import { resolveXmlTypeMapping, toJavaFieldName } from "./map-types.js";
import type { HardwareMapEntry } from "./types.js";

export async function resolveConfigForHwMap(
  projectRoot: string,
  configName?: string,
): Promise<{ config?: RobotConfigInfo; errorMessage?: string; code?: string }> {
  if (configName?.trim()) {
    const resolved = await resolveConfigPath(projectRoot, configName.trim());
    if (!resolved) {
      return {
        errorMessage: `Robot config not found: ${configName}`,
        code: "CONFIG_NOT_FOUND",
      };
    }
    return { config: resolved };
  }

  const listed = await listRobotConfigs(projectRoot);
  if (listed.error) {
    return {
      errorMessage: listed.message,
      code: listed.error.code,
    };
  }
  if (listed.configs.length === 0) {
    return {
      errorMessage: "No robot config XML found. Pull one with `ftc config pull --yes` or add under TeamCode/src/main/res/xml.",
      code: "HWMAP_NO_CONFIG",
    };
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
      includedInCodegen: mapping.includedInCodegen,
    });
  }

  return entries;
}
