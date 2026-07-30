import fs from "node:fs/promises";
import path from "node:path";
import { OfficialFtcProjectAdapter } from "../adapters/official-ftc-project-adapter.js";
import { interpretFromUnknown } from "../errors/interpret.js";
import { TEAMCODE_RES_XML_RELATIVE, isValidAndroidXmlResourceName } from "./defaults.js";
import { parseRobotConfigXml } from "./parse.js";
import type {
  RobotConfigDetail,
  RobotConfigInfo,
  RobotConfigListResult,
  RobotConfigShowResult,
} from "./types.js";

export async function getTeamCodeResXmlDir(projectRoot: string): Promise<string | undefined> {
  const adapter = new OfficialFtcProjectAdapter();
  const info = await adapter.inspect(path.resolve(projectRoot));
  if (info.kind !== "official-ftc") {
    return undefined;
  }
  const dir = path.join(info.rootDirectory, ...TEAMCODE_RES_XML_RELATIVE.split("/"));
  try {
    const stat = await fs.stat(dir);
    if (stat.isDirectory()) {
      return dir;
    }
  } catch {
    // may not exist yet
  }
  return dir;
}

export async function listRobotConfigs(projectRoot: string): Promise<RobotConfigListResult> {
  const root = path.resolve(projectRoot);
  try {
    const resXmlPath = await getTeamCodeResXmlDir(root);
    if (!resXmlPath) {
      return {
        projectRoot: root,
        configs: [],
        message: "Not an official FTC project.",
        error: interpretFromUnknown(
          Object.assign(new Error("Unsupported project layout"), {
            code: "CONFIG_PROJECT_UNSUPPORTED",
          }),
        ),
      };
    }

    await fs.mkdir(resXmlPath, { recursive: true });
    const entries = await fs.readdir(resXmlPath);
    const configs: RobotConfigInfo[] = [];

    for (const entry of entries) {
      if (!entry.toLowerCase().endsWith(".xml")) {
        continue;
      }
      // Skip known non-robot-config resources commonly present
      if (entry.toLowerCase() === "teamwebcamcalibrations.xml") {
        continue;
      }
      const absolutePath = path.join(resXmlPath, entry);
      const relativePath = path.relative(root, absolutePath).replace(/\\/g, "/");
      const name = entry.replace(/\.xml$/i, "");
      let deviceCount = 0;
      try {
        const xml = await fs.readFile(absolutePath, "utf8");
        if (!/<Robot\b/i.test(xml)) {
          continue;
        }
        deviceCount = parseRobotConfigXml(xml).devices.length;
      } catch {
        continue;
      }
      configs.push({
        name,
        relativePath,
        absolutePath,
        source: "project-res-xml",
        deviceCount,
      });
    }

    configs.sort((a, b) => a.name.localeCompare(b.name));
    return {
      projectRoot: root,
      resXmlPath,
      configs,
      message:
        configs.length === 0
          ? `No robot config XML found under ${TEAMCODE_RES_XML_RELATIVE}.`
          : `Found ${configs.length} robot config(s) under ${TEAMCODE_RES_XML_RELATIVE}.`,
    };
  } catch (error) {
    return {
      projectRoot: root,
      configs: [],
      message: "Failed to list robot configs.",
      error: interpretFromUnknown(error),
    };
  }
}

function isMissingConfigName(nameOrPath: string | null | undefined): boolean {
  return nameOrPath == null || nameOrPath.trim() === "";
}

export async function showRobotConfig(
  projectRoot: string,
  nameOrPath: string,
): Promise<RobotConfigShowResult> {
  try {
    if (isMissingConfigName(nameOrPath)) {
      return {
        success: false,
        message: "Robot config name or path is required.",
        error: interpretFromUnknown(
          Object.assign(new Error("Robot config name or path is required."), {
            code: "MISSING_CONFIG_NAME",
          }),
        ),
      };
    }

    const resolved = await resolveConfigPath(projectRoot, nameOrPath);
    if (!resolved) {
      return {
        success: false,
        message: `Robot config not found: ${nameOrPath}`,
        error: interpretFromUnknown(
          Object.assign(new Error(`Robot config not found: ${nameOrPath}`), {
            code: "CONFIG_NOT_FOUND",
          }),
        ),
      };
    }

    const xml = await fs.readFile(resolved.absolutePath, "utf8");
    const parsed = parseRobotConfigXml(xml);
    const detail: RobotConfigDetail = {
      ...resolved,
      rootType: parsed.rootType,
      devices: parsed.devices,
      rawXml: xml,
    };
    return {
      success: true,
      config: detail,
      message: `Config "${detail.name}" has ${detail.devices.length} named device/module entr(y/ies).`,
    };
  } catch (error) {
    return {
      success: false,
      message: "Failed to show robot config.",
      error: interpretFromUnknown(error),
    };
  }
}

export async function resolveConfigPath(
  projectRoot: string,
  nameOrPath: string,
): Promise<RobotConfigInfo | undefined> {
  if (isMissingConfigName(nameOrPath)) {
    return undefined;
  }

  const root = path.resolve(projectRoot);
  const trimmed = nameOrPath.trim();
  const asPath = path.isAbsolute(trimmed) ? trimmed : path.join(root, trimmed);

  const tryPaths: string[] = [];
  if (trimmed.toLowerCase().endsWith(".xml") || trimmed.includes("/") || trimmed.includes("\\")) {
    tryPaths.push(asPath);
  } else {
    const resXml = await getTeamCodeResXmlDir(root);
    if (resXml) {
      tryPaths.push(path.join(resXml, `${trimmed}.xml`));
      tryPaths.push(path.join(resXml, trimmed));
    }
  }

  for (const candidate of tryPaths) {
    try {
      const stat = await fs.stat(candidate);
      if (!stat.isFile()) {
        continue;
      }
      const xml = await fs.readFile(candidate, "utf8");
      if (!/<Robot\b/i.test(xml)) {
        continue;
      }
      const base = path.basename(candidate).replace(/\.xml$/i, "");
      return {
        name: base,
        relativePath: path.relative(root, candidate).replace(/\\/g, "/"),
        absolutePath: candidate,
        source: "project-res-xml",
        deviceCount: parseRobotConfigXml(xml).devices.length,
      };
    } catch {
      // continue
    }
  }
  return undefined;
}

export function warnIfInvalidResourceFileName(fileBaseName: string): string | undefined {
  if (!isValidAndroidXmlResourceName(fileBaseName)) {
    return `Android res/xml names should be lowercase a-z, 0-9, underscore only (got "${fileBaseName}").`;
  }
  return undefined;
}
