import { PACKAGE_VERSION } from "../constants.js";
import { discoverAdb, discoverAndroidSdk } from "../discovery/adb-discovery.js";
import { discoverJava } from "../discovery/java-discovery.js";
import { findGradleWrapper } from "../gradle/wrapper.js";
import { isSupportedPlatform } from "../paths/os-paths.js";
import { checkSdkStatus } from "../sdk/check-sdk-status.js";
import type { FetchLike } from "../sdk/types.js";
import { getWifiStatus } from "../wifi/status.js";
import { loadWifiPreference } from "../wifi/interface-preference.js";
import { listNetworkInterfaces, findInterfaceByNameOrIndex } from "../wifi/list-interfaces.js";
import type { DeviceProvider } from "../types/device.js";
import type {
  DoctorCheck,
  DoctorReadiness,
  DoctorReport,
  DoctorReportSection,
  DoctorReportSections,
} from "../types/errors.js";
import type { ProcessRunner } from "../types/process.js";
import type { ProjectAdapter } from "../types/project.js";
import { interpretError } from "../errors/interpret.js";
import {
  DOCTOR_CHECK_LABELS,
  DOCTOR_SKIP_DETAILS,
  summaryLines,
  wifiConsoleSkipDetail,
} from "./doctor-copy.js";
import { buildDoctorSections, categoryForCheckId } from "./doctor-sections.js";
import { notAnFtcProjectRootError, projectNotDetectedWrapperError } from "./wrong-folder-errors.js";

export interface DoctorOptions {
  cwd: string;
  runner: ProcessRunner;
  projectAdapter: ProjectAdapter;
  deviceProvider?: DeviceProvider;
  nodeVersion?: string;
  platform?: NodeJS.Platform;
  /** Injected for tests; used by the optional FTC SDK freshness check. */
  fetchImpl?: FetchLike;
  /** When false, skip network FTC SDK freshness check. Default true. */
  checkFtcSdkVersion?: boolean;
  /** When false, skip Wi-Fi console / robot-interface checks. Default true. */
  checkWifi?: boolean;
}

export async function runDoctor(options: DoctorOptions): Promise<DoctorReport> {
  const checks: DoctorCheck[] = [];
  const platform = options.platform ?? process.platform;
  const nodeVersion = options.nodeVersion ?? process.versions.node;

  checks.push(checkOs(platform));
  checks.push(checkNode(nodeVersion));
  checks.push(await checkJava(options.runner));
  checks.push(await checkAndroidSdk());
  checks.push(await checkAdb(options.runner));

  const projectCheck = await checkProject(options.projectAdapter, options.cwd);
  checks.push(projectCheck);

  const wrapperCheck = await checkWrapper(options.cwd, platform, projectCheck.status === "pass");
  checks.push(wrapperCheck);

  if (options.deviceProvider) {
    checks.push(await checkDevices(options.deviceProvider));
  } else {
    checks.push({
      id: "devices",
      label: DOCTOR_CHECK_LABELS.devicesGeneric,
      status: "skip",
      required: false,
      detail: DOCTOR_SKIP_DETAILS.devicesNoProvider,
    });
  }

  if (projectCheck.status === "pass" && wrapperCheck.status === "pass") {
    checks.push(await checkGradleInit(options));
  } else {
    checks.push({
      id: "gradle-init",
      label: DOCTOR_CHECK_LABELS.gradleInit,
      status: "skip",
      required: false,
      detail: DOCTOR_SKIP_DETAILS.gradleInitBlocked,
    });
  }

  if (options.checkFtcSdkVersion === false) {
    checks.push({
      id: "ftc-sdk-version",
      label: DOCTOR_CHECK_LABELS.ftcSdkVersion,
      status: "skip",
      required: false,
      detail: DOCTOR_SKIP_DETAILS.ftcSdkDisabled,
    });
  } else if (projectCheck.status === "pass") {
    checks.push(await checkFtcSdkVersion(options));
  } else {
    checks.push({
      id: "ftc-sdk-version",
      label: DOCTOR_CHECK_LABELS.ftcSdkVersion,
      status: "skip",
      required: false,
      detail: DOCTOR_SKIP_DETAILS.ftcSdkNoProject,
    });
  }

  if (options.checkWifi === false) {
    checks.push({
      id: "wifi-console",
      label: DOCTOR_CHECK_LABELS.wifiConsole,
      status: "skip",
      required: false,
      detail: DOCTOR_SKIP_DETAILS.wifiChecksDisabled,
    });
    checks.push({
      id: "wifi-robot-interface",
      label: DOCTOR_CHECK_LABELS.wifiRobotInterface,
      status: "skip",
      required: false,
      detail: DOCTOR_SKIP_DETAILS.wifiChecksDisabled,
    });
  } else {
    checks.push(await checkWifiConsole(options));
    checks.push(await checkWifiRobotInterface(options));
  }

  const requiredFailed = checks.some((check) => check.required && check.status === "fail");

  const computerIds = new Set(["os", "node", "java", "android-sdk", "adb"]);
  const projectIds = new Set(["ftc-project", "gradle-wrapper", "gradle-init"]);
  const robotIds = new Set(["devices"]);

  const computerReady = !checks.some(
    (c) => computerIds.has(c.id) && (c.status === "fail" || c.status === "warn"),
  );
  const projectReadyToBuild = !checks.some(
    (c) => projectIds.has(c.id) && (c.status === "fail" || c.status === "warn"),
  );
  const robotReadyToDeploy = !checks.some(
    (c) => robotIds.has(c.id) && (c.status === "fail" || c.status === "warn"),
  );

  const readiness: DoctorReadiness = {
    computerReady,
    projectReadyToBuild,
    robotReadyToDeploy,
  };
  const ready = !requiredFailed && computerReady && projectReadyToBuild && robotReadyToDeploy;

  const summaries = summaryLines();
  let summaryLine: string;
  if (ready) {
    summaryLine = summaries.ready;
  } else if (requiredFailed) {
    summaryLine = summaries.requiredFailed;
  } else {
    const parts: string[] = [];
    if (!computerReady) {
      parts.push("computer setup needs attention");
    }
    if (!projectReadyToBuild) {
      parts.push("FTC project setup needs attention");
    }
    if (!robotReadyToDeploy) {
      parts.push("robot connection needs attention (often OK at home without the hub plugged in)");
    }
    summaryLine = `${summaries.notReadyPrefix} ${parts.join("; ")}.`;
  }

  const checksWithCategory = checks.map((check) => ({
    ...check,
    category: categoryForCheckId(check.id),
  }));

  const sectionList = buildDoctorSections({
    checks: checksWithCategory,
    readiness,
  });
  const sections = sectionsRecordFromList(sectionList);

  return {
    ready,
    readiness,
    checks: checksWithCategory,
    sections,
    summaryLine,
    generatedAt: new Date().toISOString(),
    version: PACKAGE_VERSION,
  };
}

function sectionsRecordFromList(sectionList: DoctorReportSection[]): DoctorReportSections {
  const machine = sectionList.find((s) => s.id === "machine");
  const project = sectionList.find((s) => s.id === "project");
  if (!machine || !project) {
    throw new Error("Doctor report must include machine and project sections");
  }
  const robot = sectionList.find((s) => s.id === "robot");
  const other = sectionList.find((s) => s.id === "other");
  return {
    machine,
    project,
    ...(robot ? { robot } : {}),
    ...(other ? { other } : {}),
  };
}

function checkOs(platform: NodeJS.Platform): DoctorCheck {
  if (isSupportedPlatform(platform)) {
    return {
      id: "os",
      label: DOCTOR_CHECK_LABELS.os,
      status: "pass",
      required: true,
      detail: platform,
    };
  }
  return {
    id: "os",
    label: DOCTOR_CHECK_LABELS.os,
    status: "fail",
    required: true,
    detail: platform,
    friendlyError: interpretError({
      text: `Unsupported platform: ${platform}`,
      codeHint: "UNSUPPORTED_PROJECT_LAYOUT",
    }),
  };
}

function checkNode(version: string): DoctorCheck {
  const major = Number.parseInt(version.split(".")[0] ?? "0", 10);
  if (major >= 20) {
    return {
      id: "node",
      label: DOCTOR_CHECK_LABELS.node,
      status: "pass",
      required: true,
      detail: `v${version}`,
    };
  }
  return {
    id: "node",
    label: DOCTOR_CHECK_LABELS.node,
    status: "fail",
    required: true,
    detail: `v${version}`,
    friendlyError: {
      code: "NODE_VERSION",
      title: "Node.js version too old",
      summary: "FTC Dev Tools requires Node.js 20 or newer.",
      suggestedActions: ["Install Node.js 20 LTS or newer from https://nodejs.org/"],
      technicalDetails: version,
    },
  };
}

async function checkJava(runner: ProcessRunner): Promise<DoctorCheck> {
  const java = await discoverJava(runner);
  if (!java.found) {
    return {
      id: "java",
      label: DOCTOR_CHECK_LABELS.java,
      status: "fail",
      required: true,
      friendlyError: interpretError({ text: "java not found", codeHint: "INCOMPATIBLE_JAVA" }),
    };
  }
  return {
    id: "java",
    label: DOCTOR_CHECK_LABELS.java,
    status: "pass",
    required: true,
    detail: java.versionText?.split(/\r?\n/)[0],
  };
}

async function checkAndroidSdk(): Promise<DoctorCheck> {
  const sdk = await discoverAndroidSdk();
  if (!sdk) {
    return {
      id: "android-sdk",
      label: DOCTOR_CHECK_LABELS.androidSdk,
      status: "fail",
      required: true,
      friendlyError: interpretError({
        text: "Android SDK not found",
        codeHint: "ANDROID_SDK_NOT_FOUND",
      }),
    };
  }
  return {
    id: "android-sdk",
    label: DOCTOR_CHECK_LABELS.androidSdk,
    status: "pass",
    required: true,
    detail: sdk,
  };
}

async function checkFtcSdkVersion(options: DoctorOptions): Promise<DoctorCheck> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const report = await checkSdkStatus({
      projectRoot: options.cwd,
      fetchImpl: options.fetchImpl,
      signal: controller.signal,
    });

    if (!report.local.version) {
      return {
        id: "ftc-sdk-version",
        label: DOCTOR_CHECK_LABELS.ftcSdkVersion,
        status: "skip",
        required: false,
        detail: report.message,
        friendlyError: report.error,
      };
    }

    if (report.freshness === "behind") {
      return {
        id: "ftc-sdk-version",
        label: DOCTOR_CHECK_LABELS.ftcSdkVersion,
        status: "warn",
        required: false,
        detail: report.message,
      };
    }

    if (report.freshness === "unknown" && report.error) {
      return {
        id: "ftc-sdk-version",
        label: DOCTOR_CHECK_LABELS.ftcSdkVersion,
        status: "skip",
        required: false,
        detail: report.message,
        friendlyError: report.error,
      };
    }

    return {
      id: "ftc-sdk-version",
      label: DOCTOR_CHECK_LABELS.ftcSdkVersion,
      status: "pass",
      required: false,
      detail: report.message,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function checkWifiConsole(options: DoctorOptions): Promise<DoctorCheck> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5_000);
  try {
    const report = await getWifiStatus({
      runner: options.runner,
      deviceProvider: options.deviceProvider,
      fetchImpl: options.fetchImpl,
      platform: options.platform,
      signal: controller.signal,
    });
    if (report.console.reachable) {
      return {
        id: "wifi-console",
        label: DOCTOR_CHECK_LABELS.wifiConsole,
        status: "pass",
        required: false,
        detail: report.console.message,
      };
    }
    if (report.wifiAdbDevices.length > 0) {
      return {
        id: "wifi-console",
        label: DOCTOR_CHECK_LABELS.wifiConsole,
        status: "warn",
        required: false,
        detail: report.console.message,
        friendlyError: interpretError({
          text: report.console.message,
          codeHint: "WIFI_CONSOLE_UNREACHABLE",
        }),
      };
    }
    return {
      id: "wifi-console",
      label: DOCTOR_CHECK_LABELS.wifiConsole,
      status: "skip",
      required: false,
      detail: wifiConsoleSkipDetail(report.console.message),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function checkWifiRobotInterface(options: DoctorOptions): Promise<DoctorCheck> {
  const { preference } = await loadWifiPreference();
  const selected = preference.robotNetworkInterface;
  if (!selected) {
    const report = await getWifiStatus({
      runner: options.runner,
      deviceProvider: options.deviceProvider,
      platform: options.platform,
    });
    if (report.console.reachable || report.wifiAdbDevices.length > 0) {
      return {
        id: "wifi-robot-interface",
        label: DOCTOR_CHECK_LABELS.wifiRobotInterface,
        status: "warn",
        required: false,
        detail:
          "No robot Wi‑Fi adapter chosen yet. At the shop with two Wi‑Fi cards, run `ftc wifi use-interface`.",
      };
    }
    return {
      id: "wifi-robot-interface",
      label: DOCTOR_CHECK_LABELS.wifiRobotInterface,
      status: "skip",
      required: false,
      detail: `${DOCTOR_SKIP_DETAILS.wifiNicAtHome}No robot Wi‑Fi adapter is configured yet.`,
    };
  }

  try {
    const interfaces = await listNetworkInterfaces({
      runner: options.runner,
      platform: options.platform,
    });
    const hit = findInterfaceByNameOrIndex(interfaces, selected.name);
    if (!hit && selected.index !== undefined) {
      const byIndex = findInterfaceByNameOrIndex(interfaces, String(selected.index));
      if (!byIndex) {
        return {
          id: "wifi-robot-interface",
          label: DOCTOR_CHECK_LABELS.wifiRobotInterface,
          status: "warn",
          required: false,
          detail: `Saved interface ${selected.name} is not present. Re-run \`ftc wifi use-interface\`.`,
        };
      }
    } else if (!hit) {
      return {
        id: "wifi-robot-interface",
        label: DOCTOR_CHECK_LABELS.wifiRobotInterface,
        status: "warn",
        required: false,
        detail: `Saved interface ${selected.name} is not present. Re-run \`ftc wifi use-interface\`.`,
      };
    }
    return {
      id: "wifi-robot-interface",
      label: DOCTOR_CHECK_LABELS.wifiRobotInterface,
      status: "pass",
      required: false,
      detail: `${selected.name}${selected.index !== undefined ? ` (#${selected.index})` : ""}`,
    };
  } catch {
    return {
      id: "wifi-robot-interface",
      label: DOCTOR_CHECK_LABELS.wifiRobotInterface,
      status: "warn",
      required: false,
      detail: `${selected.name} (could not re-list interfaces to verify)`,
    };
  }
}

async function checkAdb(runner: ProcessRunner): Promise<DoctorCheck> {
  const adb = await discoverAdb(runner);
  if (!adb.found || !adb.adbPath) {
    return {
      id: "adb",
      label: DOCTOR_CHECK_LABELS.adb,
      status: "fail",
      required: true,
      friendlyError: interpretError({ text: "adb not found", codeHint: "ADB_NOT_FOUND" }),
    };
  }
  return {
    id: "adb",
    label: DOCTOR_CHECK_LABELS.adb,
    status: "pass",
    required: true,
    detail: adb.versionText?.split(/\r?\n/)[0] ?? adb.adbPath,
  };
}

async function checkProject(adapter: ProjectAdapter, cwd: string): Promise<DoctorCheck> {
  try {
    const detected = await adapter.detect(cwd);
    if (!detected) {
      return {
        id: "ftc-project",
        label: DOCTOR_CHECK_LABELS.ftcProject,
        status: "fail",
        required: true,
        detail: cwd,
        friendlyError: notAnFtcProjectRootError(`Working directory: ${cwd}`),
      };
    }
    const info = await adapter.inspect(cwd);
    return {
      id: "ftc-project",
      label: DOCTOR_CHECK_LABELS.ftcProject,
      status: "pass",
      required: true,
      detail: `${info.kind}; module ${info.moduleName}`,
    };
  } catch (error) {
    return {
      id: "ftc-project",
      label: DOCTOR_CHECK_LABELS.ftcProject,
      status: "fail",
      required: true,
      friendlyError: interpretError({
        text: error instanceof Error ? error.message : String(error),
        codeHint: "UNSUPPORTED_PROJECT_LAYOUT",
      }),
    };
  }
}

async function checkWrapper(
  cwd: string,
  platform: NodeJS.Platform,
  projectOk: boolean,
): Promise<DoctorCheck> {
  if (!projectOk) {
    return {
      id: "gradle-wrapper",
      label: DOCTOR_CHECK_LABELS.gradleWrapper,
      status: "fail",
      required: true,
      friendlyError: projectNotDetectedWrapperError(),
    };
  }
  const wrapper = await findGradleWrapper(cwd, platform);
  if (!wrapper.found) {
    return {
      id: "gradle-wrapper",
      label: DOCTOR_CHECK_LABELS.gradleWrapper,
      status: "fail",
      required: true,
      friendlyError: interpretError({
        text: "Gradle Wrapper missing",
        codeHint: "GRADLE_WRAPPER_MISSING",
      }),
    };
  }
  if (platform !== "win32" && wrapper.executableOnUnix === false) {
    return {
      id: "gradle-wrapper",
      label: DOCTOR_CHECK_LABELS.gradleWrapper,
      status: "fail",
      required: true,
      detail: wrapper.wrapperPath,
      friendlyError: interpretError({
        text: "gradlew permission denied",
        codeHint: "GRADLE_PERMISSION_DENIED",
      }),
    };
  }
  return {
    id: "gradle-wrapper",
    label: DOCTOR_CHECK_LABELS.gradleWrapper,
    status: "pass",
    required: true,
    detail: wrapper.wrapperPath,
  };
}

async function checkDevices(provider: DeviceProvider): Promise<DoctorCheck> {
  try {
    const devices = await provider.listDevices();
    if (devices.length === 0) {
      return {
        id: "devices",
        label: DOCTOR_CHECK_LABELS.devicesHub,
        status: "fail",
        required: false,
        friendlyError: interpretError({ text: "no devices", codeHint: "NO_DEVICES" }),
      };
    }
    const usable = devices.filter((d) => d.state === "device" && d.authorization === "authorized");
    if (usable.length === 0) {
      if (devices.some((d) => d.state === "unauthorized")) {
        return {
          id: "devices",
          label: DOCTOR_CHECK_LABELS.devicesHub,
          status: "fail",
          required: false,
          friendlyError: interpretError({ text: "unauthorized", codeHint: "DEVICE_UNAUTHORIZED" }),
        };
      }
      return {
        id: "devices",
        label: DOCTOR_CHECK_LABELS.devicesHub,
        status: "fail",
        required: false,
        friendlyError: interpretError({ text: "offline", codeHint: "DEVICE_OFFLINE" }),
      };
    }
    const probableHub = usable.find((d) => d.controlHubLikelihood === "probable");
    return {
      id: "devices",
      label: probableHub
        ? DOCTOR_CHECK_LABELS.devicesHub
        : DOCTOR_CHECK_LABELS.devicesAndroid,
      status: "pass",
      required: false,
      detail: probableHub
        ? `${probableHub.serial} (probable Control Hub)`
        : `${usable.length} authorized device(s)`,
    };
  } catch (error) {
    return {
      id: "devices",
      label: DOCTOR_CHECK_LABELS.devicesGeneric,
      status: "fail",
      required: false,
      friendlyError: interpretError(error instanceof Error ? error.message : String(error)),
    };
  }
}

async function checkGradleInit(options: DoctorOptions): Promise<DoctorCheck> {
  try {
    const project = await options.projectAdapter.inspect(options.cwd);
    if (!project.gradleWrapperPath) {
      return {
        id: "gradle-init",
        label: DOCTOR_CHECK_LABELS.gradleInit,
        status: "fail",
        required: false,
        friendlyError: interpretError({
          text: "wrapper missing",
          codeHint: "GRADLE_WRAPPER_MISSING",
        }),
      };
    }
    const result = await options.runner.run(
      {
        command: project.gradleWrapperPath,
        args: ["--version"],
        cwd: project.rootDirectory,
      },
      { timeoutMs: 120_000 },
    );
    if (result.exitCode === 0) {
      return {
        id: "gradle-init",
        label: DOCTOR_CHECK_LABELS.gradleInit,
        status: "pass",
        required: false,
        detail: result.stdout.split(/\r?\n/).find((line) => /Gradle/i.test(line)),
      };
    }
    return {
      id: "gradle-init",
      label: DOCTOR_CHECK_LABELS.gradleInit,
      status: "warn",
      required: false,
      detail:
        "Gradle did not report its version successfully (gradlew --version failed). Check JDK and project setup.",
      friendlyError: interpretError(`${result.stdout}\n${result.stderr}`),
    };
  } catch (error) {
    return {
      id: "gradle-init",
      label: DOCTOR_CHECK_LABELS.gradleInit,
      status: "warn",
      required: false,
      friendlyError: interpretError(error instanceof Error ? error.message : String(error)),
    };
  }
}
