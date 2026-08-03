import os from "node:os";
import { PACKAGE_VERSION } from "../constants.js";
import { discoverAdb, discoverAndroidSdk } from "../discovery/adb-discovery.js";
import { discoverFtcCliOnPath } from "../discovery/ftc-cli-discovery.js";
import { discoverJava } from "../discovery/java-discovery.js";
import { findGradleWrapper } from "../gradle/wrapper.js";
import { checkSdkStatus } from "../sdk/check-sdk-status.js";
import type { FetchLike } from "../sdk/types.js";
import { selectDeploymentDevice } from "../devices/selection.js";
import { discoverNearbyFtcProjectRoots } from "../project/discover-ftc-root.js";
import type { DeviceProvider } from "../types/device.js";
import type { ProcessRunner } from "../types/process.js";
import type { ProjectAdapter } from "../types/project.js";

export interface EnvironmentSnapshot {
  schemaVersion: "1.0.0";
  generatedAt: string;
  ftcDevToolsVersion: string;
  extensionVersion?: string;
  cliOnPath: {
    found: boolean;
    path?: string;
    version?: string;
    versionMatchesBundled?: boolean;
  };
  host: {
    platform: string;
    osRelease: string;
    nodeVersion: string;
  };
  java?: {
    found: boolean;
    versionLine?: string;
    major?: number;
    path?: string;
  };
  adb?: {
    found: boolean;
    versionLine?: string;
    path?: string;
  };
  androidSdk?: {
    found: boolean;
    path?: string;
  };
  gradle?: {
    wrapperFound: boolean;
    versionLine?: string;
  };
  ftcSdk?: {
    version?: string;
    freshness?: string;
    message?: string;
  };
  project?: {
    detected: boolean;
    root?: string;
    cwd: string;
    nearbyRoots?: string[];
  };
  robot?: {
    deviceCount?: number;
    selectedSerial?: string;
    selectedConnectionType?: string;
    selectionMessage?: string;
  };
  versionSkewWarnings: string[];
}

export interface CollectEnvironmentSnapshotOptions {
  cwd: string;
  runner: ProcessRunner;
  projectAdapter: ProjectAdapter;
  deviceProvider?: DeviceProvider;
  extensionVersion?: string;
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  fetchImpl?: FetchLike;
}

export async function collectEnvironmentSnapshot(
  options: CollectEnvironmentSnapshotOptions,
): Promise<EnvironmentSnapshot> {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const versionSkewWarnings: string[] = [];

  const cliOnPath = await discoverFtcCliOnPath(options.runner, platform);
  if (cliOnPath.found && cliOnPath.version && cliOnPath.version !== PACKAGE_VERSION) {
    versionSkewWarnings.push(
      `CLI on PATH (${cliOnPath.version}) differs from bundled shared version (${PACKAGE_VERSION}).`,
    );
  }
  if (options.extensionVersion && options.extensionVersion !== PACKAGE_VERSION) {
    versionSkewWarnings.push(
      `Extension version (${options.extensionVersion}) differs from CLI/shared version (${PACKAGE_VERSION}).`,
    );
  }

  const java = await discoverJava(options.runner, env);
  const adb = await discoverAdb(options.runner, env, platform);
  const sdkPath = await discoverAndroidSdk(env, platform);

  let gradle: EnvironmentSnapshot["gradle"];
  const wrapper = await findGradleWrapper(options.cwd, platform);
  if (wrapper.found && wrapper.wrapperPath) {
    const gradleResult = await options.runner.run(
      { command: wrapper.wrapperPath, args: ["--version"], cwd: options.cwd },
      { timeoutMs: 120_000 },
    );
    gradle = {
      wrapperFound: true,
      versionLine: gradleResult.stdout.split(/\r?\n/).find((line) => /Gradle/i.test(line)),
    };
  } else {
    gradle = { wrapperFound: false };
  }

  const projectDetected = await options.projectAdapter.detect(options.cwd);
  let project: EnvironmentSnapshot["project"] = {
    detected: projectDetected,
    cwd: options.cwd,
  };
  if (projectDetected) {
    project = { ...project, root: options.cwd };
  } else {
    const nearby = await discoverNearbyFtcProjectRoots(options.cwd, {
      adapter: options.projectAdapter,
    });
    project = {
      detected: false,
      cwd: options.cwd,
      nearbyRoots: nearby.length > 0 ? nearby : undefined,
    };
  }

  let ftcSdk: EnvironmentSnapshot["ftcSdk"];
  if (projectDetected || project.nearbyRoots?.[0]) {
    const sdkRoot = projectDetected ? options.cwd : project.nearbyRoots![0]!;
    try {
      const sdkReport = await checkSdkStatus({
        projectRoot: sdkRoot,
        fetchImpl: options.fetchImpl,
      });
      ftcSdk = {
        version: sdkReport.local.version,
        freshness: sdkReport.freshness,
        message: sdkReport.message,
      };
    } catch {
      ftcSdk = { message: "Could not read FTC SDK version from project." };
    }
  }

  let robot: EnvironmentSnapshot["robot"];
  if (options.deviceProvider) {
    try {
      const devices = await options.deviceProvider.listDevices();
      const selection = selectDeploymentDevice({ devices });
      robot = {
        deviceCount: devices.length,
        selectedSerial: selection.ok ? selection.device.serial : undefined,
        selectedConnectionType: selection.ok ? selection.device.connectionType : undefined,
        selectionMessage: selection.ok ? `Selected ${selection.device.serial}` : selection.message,
      };
    } catch (error) {
      robot = {
        deviceCount: 0,
        selectionMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  if (!java.found) {
    versionSkewWarnings.push("JDK 17 not detected — build will fail.");
  }
  if (!adb.found) {
    versionSkewWarnings.push("ADB not found — deploy and logs will fail.");
  }
  if (!projectDetected) {
    versionSkewWarnings.push("No FTC project detected at current working directory.");
  }
  if (!gradle.wrapperFound) {
    versionSkewWarnings.push("Gradle Wrapper not found in project.");
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    ftcDevToolsVersion: PACKAGE_VERSION,
    extensionVersion: options.extensionVersion,
    cliOnPath: {
      found: cliOnPath.found,
      path: cliOnPath.ftcPath,
      version: cliOnPath.version,
      versionMatchesBundled: cliOnPath.version ? cliOnPath.version === PACKAGE_VERSION : undefined,
    },
    host: {
      platform,
      osRelease: os.release(),
      nodeVersion: process.version,
    },
    java: java.found
      ? {
          found: true,
          versionLine: java.versionText?.split(/\r?\n/)[0],
          major: java.majorVersion,
          path: java.javaHome,
        }
      : { found: false },
    adb: adb.found
      ? { found: true, versionLine: adb.versionText, path: adb.adbPath }
      : { found: false },
    androidSdk: sdkPath ? { found: true, path: sdkPath } : { found: false },
    gradle,
    ftcSdk,
    project,
    robot,
    versionSkewWarnings,
  };
}
