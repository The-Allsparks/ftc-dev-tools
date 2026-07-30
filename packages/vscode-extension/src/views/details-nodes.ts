import {
  isMilestoneComplete,
  type MilestoneStepId,
  type SdkStatusReport,
  type WifiStatusReport,
  type SidebarDeviceInfo,
  type SidebarProjectInfo,
} from "@ftc-dev-tools/shared";
import { actionNode, leafNode, type RobotNode } from "./robot-node-types.js";

export type DetailsContext = {
  project: SidebarProjectInfo;
  device: SidebarDeviceInfo;
  sdk?: SdkStatusReport;
  wifi?: WifiStatusReport;
  milestones: readonly MilestoneStepId[];
  moduleName?: string;
};

function formatSdk(sdk?: SdkStatusReport): string {
  if (!sdk) {
    return "Not checked yet";
  }
  if (sdk.local.version && sdk.remote) {
    return `${sdk.local.version} → ${sdk.remote.version} (${sdk.freshness})`;
  }
  if (sdk.local.version) {
    return `${sdk.local.version} (${sdk.freshness})`;
  }
  return sdk.freshness;
}

function formatWifi(wifi?: WifiStatusReport): string {
  if (!wifi) {
    return "Not checked yet";
  }
  const consolePart = wifi.console.reachable ? "RC console reachable" : "RC console unreachable";
  const nicPart = wifi.selectedInterface
    ? `Robot NIC: ${wifi.selectedInterface.name}`
    : "No robot NIC selected";
  return `${consolePart}; ${nicPart}`;
}

function formatDevice(device: SidebarDeviceInfo): { title: string; connection: string; auth: string } {
  switch (device.phase) {
    case "adb-unavailable":
      return {
        title: "Android tools not ready",
        connection: "adb not available",
        auth: "Connect after adb is installed",
      };
    case "no-devices":
      return {
        title: "No robot connected",
        connection: "Not connected",
        auth: "Not authorized yet",
      };
    case "unauthorized":
      return {
        title: "Robot connected — needs authorization",
        connection: device.connectionType ?? "USB",
        auth: "Waiting for USB debugging approval",
      };
    case "multiple":
      return {
        title: "Multiple devices connected",
        connection: "Select one device to deploy",
        auth: "Varies by device",
      };
    case "preference-mismatch":
      return {
        title: "Device connection mismatch",
        connection: "Does not match preferred connection",
        auth: "Check deployment settings",
      };
    case "connected":
      return {
        title: device.isControlHub ? "Control Hub connected" : "Robot connected",
        connection: device.connectionType
          ? `${device.connectionType}${device.serial ? ` · ${device.serial}` : ""}`
          : (device.serial ?? "Connected"),
        auth: "Authorized for deploy",
      };
    default:
      return {
        title: "Robot status unknown",
        connection: "Unknown",
        auth: "Unknown",
      };
  }
}

export function buildDetailsNodes(ctx: DetailsContext): RobotNode[] {
  const rows: RobotNode[] = [];
  const deviceInfo = formatDevice(ctx.device);

  if (ctx.project.detected) {
    rows.push(
      leafNode("details-project-name", ctx.moduleName ?? "FTC project", {
        description: "Official FTC SDK project detected",
        tooltip: "Official FTC SDK project detected",
        icon: "check",
      }),
      leafNode("details-project-sdk", `SDK: ${formatSdk(ctx.sdk)}`, {
        tooltip: formatSdk(ctx.sdk),
        command: { command: "ftc.checkSdk", title: "Check SDK Version" },
      }),
    );
  } else if (ctx.project.moduleName !== undefined) {
    rows.push(
      leafNode("details-project-unrecognized", "Unrecognized project layout", {
        description: "Open the folder that contains TeamCode",
        tooltip: "Open the folder that contains TeamCode and build.gradle",
        icon: "warning",
        command: { command: "ftc.obtainProject", title: "Get or Open FTC Project" },
      }),
    );
  }

  rows.push(
    leafNode("details-robot", deviceInfo.title, {
      description: deviceInfo.connection,
      tooltip: `${deviceInfo.connection}. ${deviceInfo.auth}`,
      icon: ctx.device.phase === "connected" ? "check" : "plug",
    }),
  );

  if (ctx.project.detected) {
    rows.push(
      leafNode("details-wifi", formatWifi(ctx.wifi), {
        tooltip: formatWifi(ctx.wifi),
        command: { command: "ftc.wifiStatus", title: "Wi-Fi Status" },
      }),
    );
  }

  const opmodeDone = isMilestoneComplete(ctx.milestones, "opmode-on-driver-station");
  const deployDone = isMilestoneComplete(ctx.milestones, "deploy-ok");
  rows.push(
    leafNode("details-driver-station", "Driver Station / OpMode", {
      description: opmodeDone
        ? "OpMode milestone complete"
        : deployDone
          ? "Deploy done — run an OpMode on Driver Station"
          : "Deploy TeamCode first",
      tooltip: opmodeDone
        ? "You marked an OpMode running on Driver Station."
        : "After deploy, open Driver Station, select your OpMode, and tap Init then Start.",
      icon: opmodeDone ? "check" : deployDone ? "play" : "circle-outline",
      command: deployDone
        ? { command: "ftc.firstOpModeJourney", title: "First OpMode Journey" }
        : undefined,
    }),
  );

  return rows;
}

export function buildAdvancedNodes(options?: { showProjectTools?: boolean }): RobotNode[] {
  const showProject = options?.showProjectTools ?? true;
  const rows: RobotNode[] = [
    actionNode("advanced-doctor", "Run Environment Check", "ftc.runDoctor", { icon: "debug" }),
    actionNode("advanced-stop-logs", "Stop Logs", "ftc.stopLogs"),
  ];

  if (showProject) {
    rows.push(
      actionNode("advanced-build", "Build", "ftc.build"),
      actionNode("advanced-deploy", "Deploy", "ftc.deploy"),
      actionNode("advanced-build-deploy", "Build and Deploy", "ftc.buildAndDeploy"),
      actionNode("advanced-check-sdk", "Check SDK Version", "ftc.checkSdk"),
      actionNode("advanced-update-sdk", "Update FTC SDK", "ftc.updateSdk"),
    );
  }

  rows.push(
    actionNode("advanced-wifi-status", "Wi-Fi Status", "ftc.wifiStatus"),
    actionNode("advanced-wifi-nic", "Select Robot NIC", "ftc.wifiSelectInterface"),
    actionNode("advanced-wifi-connect", "Connect Wi-Fi ADB", "ftc.wifiConnect"),
    actionNode("advanced-wifi-join", "Join Robot Wi-Fi", "ftc.wifiJoin"),
    actionNode("advanced-wifi-manage", "Get Hub Wi-Fi Settings", "ftc.wifiManageGet"),
    actionNode("advanced-wifi-prefer-inet", "Prefer Internet Interface", "ftc.wifiPreferInternet"),
    actionNode("advanced-wifi-prefer-robot", "Prefer Robot Interface", "ftc.wifiPreferRobot"),
    actionNode("advanced-wifi-console", "Open RC Console", "ftc.wifiOpenConsole"),
    actionNode("advanced-hub-status", "Control Hub Status", "ftc.hubStatus"),
    actionNode("advanced-hub-os-check", "Check Hub OS Update", "ftc.hubUpdateCheck"),
  );

  if (showProject) {
    rows.push(
      actionNode("advanced-pedro-status", "Pedro Pathing Status", "ftc.pedroStatus"),
      actionNode("advanced-pedro-add", "Add Pedro Pathing", "ftc.pedroAdd"),
      actionNode("advanced-opmode-list", "List OpModes", "ftc.opmodeList"),
      actionNode("advanced-opmode-create", "Create OpMode", "ftc.opmodeCreate"),
      actionNode("advanced-config-list", "List Robot Configs", "ftc.configList"),
      actionNode("advanced-config-show", "Show Robot Config", "ftc.configShow"),
      actionNode("advanced-config-validate", "Validate Robot Config", "ftc.configValidate"),
      actionNode("advanced-config-pull", "Pull Robot Configs", "ftc.configPull"),
      actionNode("advanced-hwmap-show", "Show Hardware Map", "ftc.hwmapShow"),
      actionNode("advanced-hwmap-codegen", "Generate OpMode from Config", "ftc.hwmapCodegen"),
    );
  }

  return rows;
}
