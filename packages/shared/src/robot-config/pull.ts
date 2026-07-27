import fs from "node:fs/promises";
import path from "node:path";
import { discoverAdb } from "../discovery/adb-discovery.js";
import { selectDeploymentDevice } from "../devices/selection.js";
import { interpretFromUnknown } from "../errors/interpret.js";
import type { DeviceProvider } from "../types/device.js";
import type { ProcessRunner } from "../types/process.js";
import { HUB_CONFIG_REMOTE_DIR, TEAMCODE_RES_XML_RELATIVE } from "./defaults.js";
import { getTeamCodeResXmlDir } from "./list.js";
import type { RobotConfigPullResult } from "./types.js";

export interface PullRobotConfigOptions {
  projectRoot: string;
  runner: ProcessRunner;
  deviceProvider?: DeviceProvider;
  deviceSerial?: string;
  /** Pull a single remote file name (with or without .xml). Default: all *.xml */
  remoteName?: string;
  dryRun?: boolean;
  yes?: boolean;
}

export async function pullRobotConfigs(
  options: PullRobotConfigOptions,
): Promise<RobotConfigPullResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const dryRun = options.dryRun === true;
  const plannedFiles: string[] = [];
  const pulledFiles: string[] = [];

  try {
    const destDir = await getTeamCodeResXmlDir(projectRoot);
    if (!destDir) {
      return {
        success: false,
        dryRun,
        plannedFiles,
        pulledFiles,
        message: "Not an official FTC project with TeamCode.",
        error: interpretFromUnknown(
          Object.assign(new Error("Unsupported project layout"), {
            code: "CONFIG_PROJECT_UNSUPPORTED",
          }),
        ),
      };
    }

    const adb = await discoverAdb(options.runner);
    if (!adb.found || !adb.adbPath) {
      return {
        success: false,
        dryRun,
        plannedFiles,
        pulledFiles,
        destDir,
        message: "adb not found.",
        error: interpretFromUnknown(
          Object.assign(new Error("adb not found"), { code: "ADB_NOT_FOUND" }),
        ),
      };
    }

    let serial = options.deviceSerial;
    if (!serial && options.deviceProvider) {
      const devices = await options.deviceProvider.listDevices();
      const selection = selectDeploymentDevice({
        devices,
        explicitSerial: options.deviceSerial,
      });
      if (!selection.ok) {
        return {
          success: false,
          dryRun,
          plannedFiles,
          pulledFiles,
          destDir,
          message: selection.message,
          error: interpretFromUnknown(
            Object.assign(new Error(selection.message), { code: selection.code }),
          ),
        };
      }
      serial = selection.device.serial;
    }

    if (!serial) {
      return {
        success: false,
        dryRun,
        plannedFiles,
        pulledFiles,
        destDir,
        message: "No device selected. Connect a hub/phone or pass --device SERIAL.",
        error: interpretFromUnknown(
          Object.assign(new Error("No device for config pull"), { code: "NO_DEVICES" }),
        ),
      };
    }

    const remoteFiles = await listRemoteConfigFiles(
      options.runner,
      adb.adbPath,
      serial,
      options.remoteName,
    );
    if (remoteFiles.length === 0) {
      return {
        success: false,
        dryRun,
        deviceSerial: serial,
        plannedFiles,
        pulledFiles,
        destDir,
        message: `No config XML found under ${HUB_CONFIG_REMOTE_DIR} on ${serial}.`,
        error: interpretFromUnknown(
          Object.assign(new Error("No remote robot configs"), { code: "CONFIG_REMOTE_EMPTY" }),
        ),
      };
    }

    for (const remote of remoteFiles) {
      plannedFiles.push(remote);
    }

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        deviceSerial: serial,
        plannedFiles,
        pulledFiles,
        destDir,
        message: `Dry run: would pull ${plannedFiles.length} file(s) from ${HUB_CONFIG_REMOTE_DIR} → ${TEAMCODE_RES_XML_RELATIVE}.`,
      };
    }

    if (!options.yes) {
      return {
        success: false,
        dryRun: true,
        deviceSerial: serial,
        plannedFiles,
        pulledFiles,
        destDir,
        message: "Refusing to pull robot configs without --yes.",
        error: interpretFromUnknown(
          Object.assign(new Error("Config pull requires --yes."), { code: "CONFIG_ABORTED" }),
        ),
      };
    }

    await fs.mkdir(destDir, { recursive: true });
    for (const remote of remoteFiles) {
      const base = path.posix.basename(remote);
      const local = path.join(destDir, base);
      const result = await options.runner.run(
        {
          command: adb.adbPath,
          args: ["-s", serial, "pull", remote, local],
        },
        { timeoutMs: 60_000 },
      );
      if (result.exitCode !== 0) {
        return {
          success: false,
          dryRun: false,
          deviceSerial: serial,
          plannedFiles,
          pulledFiles,
          destDir,
          message: `adb pull failed for ${remote}.`,
          error: interpretFromUnknown(
            Object.assign(new Error(result.stderr || result.stdout || "adb pull failed"), {
              code: "CONFIG_PULL_FAILED",
              technicalDetails: `${result.stdout}\n${result.stderr}`,
            }),
          ),
        };
      }
      pulledFiles.push(path.relative(projectRoot, local).replace(/\\/g, "/"));
    }

    return {
      success: true,
      dryRun: false,
      deviceSerial: serial,
      plannedFiles,
      pulledFiles,
      destDir,
      message: `Pulled ${pulledFiles.length} config file(s) into ${TEAMCODE_RES_XML_RELATIVE}.`,
    };
  } catch (error) {
    return {
      success: false,
      dryRun,
      plannedFiles,
      pulledFiles,
      message: "Failed to pull robot configs.",
      error: interpretFromUnknown(error),
    };
  }
}

async function listRemoteConfigFiles(
  runner: ProcessRunner,
  adbPath: string,
  serial: string,
  remoteName?: string,
): Promise<string[]> {
  if (remoteName) {
    const base = remoteName.toLowerCase().endsWith(".xml") ? remoteName : `${remoteName}.xml`;
    return [`${HUB_CONFIG_REMOTE_DIR}/${base}`];
  }

  const result = await runner.run(
    {
      command: adbPath,
      args: ["-s", serial, "shell", "ls", HUB_CONFIG_REMOTE_DIR],
    },
    { timeoutMs: 20_000 },
  );
  if (result.exitCode !== 0) {
    throw Object.assign(new Error(result.stderr || "Failed to list remote FIRST configs"), {
      code: "CONFIG_PULL_FAILED",
      technicalDetails: `${result.stdout}\n${result.stderr}`,
    });
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.toLowerCase().endsWith(".xml"))
    .filter((line) => line.toLowerCase() !== "teamwebcamcalibrations.xml")
    .map((line) => `${HUB_CONFIG_REMOTE_DIR}/${line}`);
}
