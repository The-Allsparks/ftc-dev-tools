import { isMilestoneComplete, type MilestoneStepId } from "../onboarding/milestone-checklist.js";

/** How the robot connection looks from the sidebar's perspective. */
export type DeviceConnectionPhase =
  | "adb-unavailable"
  | "no-devices"
  | "unauthorized"
  | "multiple"
  | "preference-mismatch"
  | "connected";

/** High-level student journey phase for the FTC Robot sidebar. */
export type SidebarPhase =
  | "welcome-no-folder"
  | "welcome-no-project"
  | "connect-robot"
  | "authorize-robot"
  | "select-device"
  | "ready-to-build"
  | "ready-to-deploy"
  | "run-opmode"
  | "all-set";

export interface SidebarDeviceInfo {
  phase: DeviceConnectionPhase;
  serial?: string;
  connectionType?: string;
  isControlHub?: boolean;
}

export interface SidebarProjectInfo {
  detected: boolean;
  moduleName?: string;
}

export interface SidebarAction {
  id: string;
  label: string;
  commandId: string;
  commandTitle: string;
  emphasis?: "primary" | "secondary";
}

export interface SidebarState {
  phase: SidebarPhase;
  statusHeadline: string;
  statusDetail?: string;
  primaryAction?: SidebarAction;
  secondaryActions: SidebarAction[];
  /** When false, hide build/deploy quick actions (no project or no device). */
  showBuildActions: boolean;
  /** When false, hide device troubleshooting rows. */
  showDeviceActions: boolean;
  /** When false, hide project-specific detail rows. */
  showProjectDetails: boolean;
}

export interface ComputeSidebarStateInput {
  hasWorkspaceFolder: boolean;
  project: SidebarProjectInfo;
  device: SidebarDeviceInfo;
  milestones: readonly MilestoneStepId[];
  hasSuccessfulBuild: boolean;
}

function action(
  id: string,
  label: string,
  commandId: string,
  commandTitle: string,
  emphasis?: "primary" | "secondary",
): SidebarAction {
  return { id, label, commandId, commandTitle, emphasis };
}

export function computeSidebarState(input: ComputeSidebarStateInput): SidebarState {
  const { hasWorkspaceFolder, project, device, milestones, hasSuccessfulBuild } = input;
  const deployDone = isMilestoneComplete(milestones, "deploy-ok");
  const opmodeDone = isMilestoneComplete(milestones, "opmode-on-driver-station");
  const buildDone = isMilestoneComplete(milestones, "build-ok") || hasSuccessfulBuild;

  if (!hasWorkspaceFolder) {
    return {
      phase: "welcome-no-folder",
      statusHeadline: "Welcome to FTC Dev Tools",
      statusDetail:
        "Open your team's FTC SDK project folder to connect a robot, build TeamCode, and deploy.",
      primaryAction: action(
        "open-project",
        "Open a Project",
        "ftc.obtainProject",
        "Get or Open FTC Project",
        "primary",
      ),
      secondaryActions: [
        action("start-here", "Start Here guide", "ftc.startHere", "Start Here", "secondary"),
        action(
          "setup-computer",
          "Set Up This Computer",
          "ftc.setUpComputer",
          "Set Up This Computer",
          "secondary",
        ),
      ],
      showBuildActions: false,
      showDeviceActions: false,
      showProjectDetails: false,
    };
  }

  if (!project.detected) {
    return {
      phase: "welcome-no-project",
      statusHeadline: "Open an FTC project folder",
      statusDetail:
        "This workspace is not a recognized FTC SDK layout. Open the folder that contains TeamCode and build.gradle.",
      primaryAction: action(
        "open-project",
        "Open FTC Project",
        "ftc.obtainProject",
        "Get or Open FTC Project",
        "primary",
      ),
      secondaryActions: [
        action("start-here", "Start Here guide", "ftc.startHere", "Start Here", "secondary"),
        action(
          "doctor",
          "Run Environment Check",
          "ftc.runDoctor",
          "Run Environment Check",
          "secondary",
        ),
      ],
      showBuildActions: false,
      showDeviceActions: false,
      showProjectDetails: true,
    };
  }

  const moduleHint = project.moduleName ? ` (${project.moduleName})` : "";

  if (device.phase === "adb-unavailable") {
    return {
      phase: "connect-robot",
      statusHeadline: "Install Android tools to connect your robot",
      statusDetail:
        "adb is not available yet. Run Set Up This Computer or the environment check to install Android platform tools.",
      primaryAction: action(
        "setup-computer",
        "Set Up This Computer",
        "ftc.setUpComputer",
        "Set Up This Computer",
        "primary",
      ),
      secondaryActions: [
        action(
          "doctor",
          "Run Environment Check",
          "ftc.runDoctor",
          "Run Environment Check",
          "secondary",
        ),
        action(
          "connections-doc",
          "Connection guide",
          "ftc.openDeviceConnectionsDoc",
          "Open Device Connections Doc",
          "secondary",
        ),
      ],
      showBuildActions: false,
      showDeviceActions: true,
      showProjectDetails: true,
    };
  }

  if (device.phase === "unauthorized") {
    return {
      phase: "authorize-robot",
      statusHeadline: "Authorize this computer on your robot",
      statusDetail:
        "Your Control Hub or Driver Hub is connected but has not trusted this computer yet. Accept the USB debugging prompt on the robot screen.",
      primaryAction: action(
        "authorize",
        "Authorize This Computer",
        "ftc.connectRobotUsb",
        "Connect My Robot (USB First)",
        "primary",
      ),
      secondaryActions: [
        action(
          "connections-doc",
          "Connection guide",
          "ftc.openDeviceConnectionsDoc",
          "Open Device Connections Doc",
          "secondary",
        ),
        action(
          "show-devices",
          "Show connected devices",
          "ftc.showDevices",
          "Show Devices",
          "secondary",
        ),
      ],
      showBuildActions: false,
      showDeviceActions: true,
      showProjectDetails: true,
    };
  }

  if (device.phase === "multiple") {
    return {
      phase: "select-device",
      statusHeadline: "Choose which robot to use",
      statusDetail:
        "More than one Android device is connected. Pick the Control Hub you want to deploy to.",
      primaryAction: action(
        "select-device",
        "Select Robot Device",
        "ftc.selectDevice",
        "Select Device",
        "primary",
      ),
      secondaryActions: [
        action(
          "connections-doc",
          "Connection guide",
          "ftc.openDeviceConnectionsDoc",
          "Open Device Connections Doc",
          "secondary",
        ),
      ],
      showBuildActions: false,
      showDeviceActions: true,
      showProjectDetails: true,
    };
  }

  if (device.phase === "no-devices" || device.phase === "preference-mismatch") {
    const detail =
      device.phase === "preference-mismatch"
        ? "A device is connected but does not match your preferred connection type. Adjust settings or connect over USB."
        : "Plug in your Control Hub with USB, or connect over Wi‑Fi once your network is set up.";
    return {
      phase: "connect-robot",
      statusHeadline: `Connect your robot${moduleHint}`,
      statusDetail: detail,
      primaryAction: action(
        "connect",
        "Connect the Control Hub",
        "ftc.connectRobotUsb",
        "Connect My Robot (USB First)",
        "primary",
      ),
      secondaryActions: [
        action(
          "connections-doc",
          "Connection guide",
          "ftc.openDeviceConnectionsDoc",
          "Open Device Connections Doc",
          "secondary",
        ),
        action(
          "wifi-connect",
          "Connect over Wi‑Fi",
          "ftc.wifiConnect",
          "Connect Wi-Fi ADB",
          "secondary",
        ),
      ],
      showBuildActions: false,
      showDeviceActions: true,
      showProjectDetails: true,
    };
  }

  // Device connected and authorized
  const robotLabel = device.isControlHub ? "Control Hub" : "Robot";
  const serialHint = device.serial ? ` (${device.serial})` : "";

  if (deployDone && !opmodeDone) {
    return {
      phase: "run-opmode",
      statusHeadline: "Code deployed — run your OpMode",
      statusDetail: `TeamCode is on your ${robotLabel}${serialHint}. Open the Driver Station app, select your OpMode, and tap Init then Start.`,
      primaryAction: action(
        "first-opmode",
        "First OpMode Journey",
        "ftc.firstOpModeJourney",
        "First OpMode Journey",
        "primary",
      ),
      secondaryActions: [
        action("view-logs", "View Robot Logs", "ftc.viewLogs", "View Logs", "secondary"),
        action(
          "mark-opmode",
          "Mark OpMode running",
          "ftc.markOpModeOnDriverStation",
          "Mark OpMode on Driver Station",
          "secondary",
        ),
      ],
      showBuildActions: true,
      showDeviceActions: true,
      showProjectDetails: true,
    };
  }

  if (deployDone && opmodeDone) {
    return {
      phase: "all-set",
      statusHeadline: "Your robot is ready to run",
      statusDetail: `Project${moduleHint} is connected to your ${robotLabel}${serialHint}. Build and deploy again when you change code.`,
      primaryAction: action(
        "build-deploy",
        "Build and Deploy",
        "ftc.buildAndDeploy",
        "Build and Deploy",
        "primary",
      ),
      secondaryActions: [
        action("view-logs", "View Robot Logs", "ftc.viewLogs", "View Logs", "secondary"),
        action("start-here", "Review Start Here", "ftc.startHere", "Start Here", "secondary"),
      ],
      showBuildActions: true,
      showDeviceActions: true,
      showProjectDetails: true,
    };
  }

  if (buildDone && !deployDone) {
    return {
      phase: "ready-to-deploy",
      statusHeadline: "Build succeeded — deploy to your robot",
      statusDetail: `Your project${moduleHint} compiled. Deploy the APK to your ${robotLabel}${serialHint}.`,
      primaryAction: action("deploy", "Deploy to Robot", "ftc.deploy", "Deploy", "primary"),
      secondaryActions: [
        action(
          "build-deploy",
          "Build and Deploy",
          "ftc.buildAndDeploy",
          "Build and Deploy",
          "secondary",
        ),
        action("build", "Build only", "ftc.build", "Build", "secondary"),
      ],
      showBuildActions: true,
      showDeviceActions: true,
      showProjectDetails: true,
    };
  }

  return {
    phase: "ready-to-build",
    statusHeadline: `Ready to build and deploy${moduleHint}`,
    statusDetail: `Your ${robotLabel}${serialHint} is connected and authorized. Build TeamCode, then deploy to the robot.`,
    primaryAction: action(
      "build-deploy",
      "Build and Deploy",
      "ftc.buildAndDeploy",
      "Build and Deploy",
      "primary",
    ),
    secondaryActions: [
      action("build", "Build only", "ftc.build", "Build", "secondary"),
      action("deploy", "Deploy only", "ftc.deploy", "Deploy", "secondary"),
    ],
    showBuildActions: true,
    showDeviceActions: true,
    showProjectDetails: true,
  };
}
