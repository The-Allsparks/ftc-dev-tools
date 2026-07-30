import {
  INSTALL_WITHOUT_ANDROID_STUDIO_DOCS_URL,
  installDepsOsForPlatform,
} from "../install-deps-urls.js";
import type { DoctorCheck, DoctorReport } from "../types/errors.js";

export type DoctorFixActionKind = "vscode-command" | "open-url" | "terminal" | "reload-window";

export interface DoctorFixAction {
  id: string;
  label: string;
  kind: DoctorFixActionKind;
  command?: string;
  /** Arguments passed to `vscode.commands.executeCommand` for vscode-command actions. */
  commandArgs?: unknown[];
  url?: string;
  terminalCommand?: string;
}

export interface DoctorCheckUiItem {
  checkId: string;
  label: string;
  status: DoctorCheck["status"];
  /** Plain-language explanation for students. */
  summary: string;
  friendlyError?: DoctorCheck["friendlyError"];
  primaryAction?: DoctorFixAction;
  secondaryActions: DoctorFixAction[];
}

function vscodeCommand(
  id: string,
  label: string,
  command: string,
  commandArgs?: unknown[],
): DoctorFixAction {
  return { id, label, kind: "vscode-command", command, commandArgs };
}

function openUrl(id: string, label: string, url: string): DoctorFixAction {
  return { id, label, kind: "open-url", url };
}

function terminal(id: string, label: string, terminalCommand: string): DoctorFixAction {
  return { id, label, kind: "terminal", terminalCommand };
}

function reloadWindowAction(): DoctorFixAction {
  return {
    id: "reload-window",
    label: "Reload window",
    kind: "reload-window",
  };
}

function installDepsPrimary(platform: NodeJS.Platform): DoctorFixAction | undefined {
  if (!installDepsOsForPlatform(platform)) {
    return undefined;
  }
  return vscodeCommand(
    "install-deps",
    "Install missing tools (from doctor)",
    "ftc.runInstallDeps",
    [{ source: "doctor" }],
  );
}

const INSTALL_GUIDE = openUrl(
  "open-install-guide",
  "Open install guide",
  INSTALL_WITHOUT_ANDROID_STUDIO_DOCS_URL,
);

const RUN_DOCTOR_AGAIN = vscodeCommand(
  "run-doctor",
  "Run environment check again",
  "ftc.runDoctor",
);

/** Maps doctor fail/warn checks to labeled Fix actions for VS Code UI. */
export function buildDoctorCheckUiItem(
  check: DoctorCheck,
  platform: NodeJS.Platform = process.platform,
): DoctorCheckUiItem | undefined {
  if (check.status !== "fail" && check.status !== "warn") {
    return undefined;
  }

  const code = check.friendlyError?.code;
  const suggestedRoots =
    check.suggestedProjectRoots ?? check.friendlyError?.suggestedProjectRoots ?? [];
  const summary =
    check.friendlyError?.summary ??
    check.detail ??
    `${check.label} needs attention before you can build or deploy reliably.`;

  const secondary: DoctorFixAction[] = [];
  let primary: DoctorFixAction | undefined;

  const machineInstallIds = new Set(["java", "android-sdk", "adb"]);
  if (
    machineInstallIds.has(check.id) ||
    code === "INCOMPATIBLE_JAVA" ||
    code === "ANDROID_SDK_NOT_FOUND" ||
    code === "ADB_NOT_FOUND"
  ) {
    primary = installDepsPrimary(platform) ?? INSTALL_GUIDE;
    secondary.push(
      INSTALL_GUIDE,
      vscodeCommand("set-up-computer", "Set up this computer", "ftc.setUpComputer"),
    );
    if (primary.id !== "install-deps") {
      secondary.unshift(primary);
    }
  } else if (check.id === "node" || code === "NODE_VERSION_UNSUPPORTED") {
    primary = openUrl("nodejs-download", "Install Node.js 20+", "https://nodejs.org/");
    secondary.push(RUN_DOCTOR_AGAIN);
  } else if (check.id === "os") {
    primary = INSTALL_GUIDE;
    secondary.push(RUN_DOCTOR_AGAIN);
  } else if (
    check.id === "ftc-project" ||
    (check.id === "gradle-wrapper" && code === "UNSUPPORTED_PROJECT_LAYOUT")
  ) {
    if (suggestedRoots.length === 1) {
      primary = vscodeCommand(
        "open-suggested-root",
        "Open correct FTC folder",
        "ftc.openSuggestedProjectRoot",
        [suggestedRoots[0]],
      );
      secondary.push(
        vscodeCommand(
          "add-suggested-root",
          "Add FTC project root to workspace",
          "ftc.addSuggestedProjectRootToWorkspace",
          [suggestedRoots[0]],
        ),
      );
    } else if (suggestedRoots.length > 1) {
      primary = vscodeCommand(
        "open-suggested-root",
        "Open correct FTC folder",
        "ftc.openSuggestedProjectRoot",
        [suggestedRoots],
      );
      secondary.push(
        vscodeCommand(
          "add-suggested-root",
          "Add FTC project root to workspace",
          "ftc.addSuggestedProjectRootToWorkspace",
          [suggestedRoots],
        ),
      );
    } else {
      primary = vscodeCommand(
        "select-project-root",
        "Select FTC project root",
        "ftc.selectProjectRoot",
      );
    }
    secondary.push(INSTALL_GUIDE);
  } else if (code === "GRADLE_WRAPPER_MISSING" || check.id === "gradle-wrapper") {
    primary = vscodeCommand(
      "select-project-root",
      "Select FTC project root",
      "ftc.selectProjectRoot",
    );
    secondary.push(vscodeCommand("set-up-project", "Set up this FTC project", "ftc.setUpProject"));
  } else if (code === "GRADLE_PERMISSION_DENIED") {
    primary = terminal("chmod-gradlew", "Fix gradlew permissions", "chmod +x gradlew");
    secondary.push(RUN_DOCTOR_AGAIN);
  } else if (check.id === "gradle-init") {
    primary = vscodeCommand("set-up-project", "Set up this FTC project", "ftc.setUpProject");
    secondary.push(RUN_DOCTOR_AGAIN, vscodeCommand("build", "Try build", "ftc.build"));
  } else if (
    check.id === "devices" ||
    code === "NO_DEVICES" ||
    code === "DEVICE_UNAUTHORIZED" ||
    code === "DEVICE_OFFLINE" ||
    code === "MULTIPLE_DEVICES"
  ) {
    primary = vscodeCommand("show-devices", "Show connected devices", "ftc.showDevices");
    secondary.push(vscodeCommand("select-device", "Select deployment device", "ftc.selectDevice"));
  } else if (
    check.id === "ftc-sdk-version" ||
    code === "SDK_VERSION_MISMATCH" ||
    code === "SDK_DEPS_MISSING"
  ) {
    primary = vscodeCommand("check-sdk", "Check FTC SDK version", "ftc.checkSdk");
    secondary.push(vscodeCommand("update-sdk", "Update FTC SDK", "ftc.updateSdk"));
  } else if (check.id === "wifi-console" || code === "WIFI_CONSOLE_UNREACHABLE") {
    primary = vscodeCommand(
      "wifi-open-console",
      "Open Robot Controller Console",
      "ftc.wifiOpenConsole",
    );
    secondary.push(
      vscodeCommand("wifi-connect", "Connect Wi-Fi ADB", "ftc.wifiConnect"),
      vscodeCommand("wifi-join", "Join robot Wi-Fi", "ftc.wifiJoin"),
    );
  } else if (check.id === "wifi-robot-interface" || code?.startsWith("WIFI_")) {
    primary = vscodeCommand(
      "wifi-select-interface",
      "Select robot network interface",
      "ftc.wifiSelectInterface",
    );
    secondary.push(vscodeCommand("wifi-status", "Wi-Fi status", "ftc.wifiStatus"));
  } else if (
    check.id === "vision-workspace" ||
    check.id === "vision-network" ||
    check.id === "vision-artifacts" ||
    code?.startsWith("VISION_")
  ) {
    if (
      code === "VISION_ENDPOINT_AMBIGUOUS" ||
      code === "VISION_LIMELIGHT_HOST_UNRESOLVED" ||
      code === "VISION_SELECTION_REQUIRED" ||
      check.id === "vision-network"
    ) {
      primary = terminal("vision-devices", "List vision endpoints", "ftc vision devices");
      secondary.push(
        terminal("vision-diagnostics", "Run vision diagnostics", "ftc vision diagnostics"),
      );
    } else if (code === "VISION_BRIDGE_NOT_SCAFFOLDED" || check.id === "vision-artifacts") {
      primary = terminal(
        "vision-bridge-scaffold",
        "Scaffold vision diagnostic bridge",
        "ftc vision bridge scaffold --yes",
      );
      secondary.push(
        terminal("vision-bridge-status", "Vision bridge status", "ftc vision bridge status"),
      );
    } else if (code === "VISION_NO_LIBRARIES") {
      primary = terminal("vision-codegen", "Scaffold vision starter code", "ftc vision codegen");
      secondary.push(
        terminal("vision-discover", "Discover vision libraries", "ftc vision discover"),
      );
    } else {
      primary = terminal("vision-diagnostics", "Run vision diagnostics", "ftc vision diagnostics");
      secondary.push(terminal("vision-status", "Vision Lab status", "ftc vision status"));
    }
  } else if (code === "UNSUPPORTED_PROJECT_LAYOUT") {
    primary = vscodeCommand(
      "select-project-root",
      "Select FTC project root",
      "ftc.selectProjectRoot",
    );
  }

  if (!primary) {
    primary = vscodeCommand("set-up-computer", "Set up this computer", "ftc.setUpComputer");
    if (check.friendlyError) {
      secondary.push(
        openUrl(
          "open-install-guide-fallback",
          "Open install guide",
          INSTALL_WITHOUT_ANDROID_STUDIO_DOCS_URL,
        ),
      );
    }
  }

  secondary.push(RUN_DOCTOR_AGAIN);

  const dedupedSecondary = secondary.filter(
    (action, index, list) =>
      action.id !== primary?.id && list.findIndex((other) => other.id === action.id) === index,
  );

  return {
    checkId: check.id,
    label: check.label,
    status: check.status,
    summary,
    friendlyError: check.friendlyError,
    primaryAction: primary,
    secondaryActions: dedupedSecondary,
  };
}

export function listActionableDoctorChecks(
  report: DoctorReport,
  platform: NodeJS.Platform = process.platform,
): DoctorCheckUiItem[] {
  return report.checks
    .map((check) => buildDoctorCheckUiItem(check, platform))
    .filter((item): item is DoctorCheckUiItem => item !== undefined);
}

/** Suggested wizard step after a fully passing doctor run. */
export function resolveDoctorSuccessNextStep(report: DoctorReport): DoctorFixAction | undefined {
  if (!report.ready) {
    return undefined;
  }
  if (!report.readiness.projectReadyToBuild) {
    return vscodeCommand("set-up-project", "Set up this FTC project", "ftc.setUpProject");
  }
  if (!report.readiness.computerReady) {
    return vscodeCommand("set-up-computer", "Set up this computer", "ftc.setUpComputer");
  }
  if (!report.readiness.robotReadyToDeploy) {
    return vscodeCommand("show-devices", "Show connected devices", "ftc.showDevices");
  }
  return vscodeCommand("build", "Build robot code", "ftc.build");
}

/** After partial success (no required failures), suggest what unlocks next. */
export function resolveDoctorProgressNextStep(report: DoctorReport): DoctorFixAction | undefined {
  if (report.ready) {
    return resolveDoctorSuccessNextStep(report);
  }
  if (!report.readiness.computerReady) {
    return installDepsPrimary(process.platform) ?? INSTALL_GUIDE;
  }
  if (!report.readiness.projectReadyToBuild) {
    return vscodeCommand("select-project-root", "Select FTC project root", "ftc.selectProjectRoot");
  }
  if (!report.readiness.robotReadyToDeploy) {
    return vscodeCommand("show-devices", "Show connected devices", "ftc.showDevices");
  }
  return RUN_DOCTOR_AGAIN;
}

export { reloadWindowAction };
