import * as vscode from "vscode";
import {
  OfficialFtcProjectAdapter,
  AdbDeviceProvider,
  NodeProcessRunner,
  discoverAdb,
  loadProjectConfig,
  selectDeploymentDevice,
} from "@ftc-dev-tools/shared";
import type { SdkStatusReport, WifiStatusReport } from "@ftc-dev-tools/shared";

type RobotNode = {
  id: string;
  label: string;
  description?: string;
  collapsible: boolean;
  children?: RobotNode[];
  command?: vscode.Command;
};

export class FtcRobotTreeProvider implements vscode.TreeDataProvider<RobotNode> {
  private readonly emitter = new vscode.EventEmitter<RobotNode | undefined | void>();
  readonly onDidChangeTreeData = this.emitter.event;

  constructor(
    private readonly getRoot: () => string | undefined,
    private readonly getSelectedSerial: () => string | undefined,
    private readonly getSdkStatus: () => SdkStatusReport | undefined,
    private readonly getWifiStatus: () => WifiStatusReport | undefined,
  ) {}

  refresh(): void {
    this.emitter.fire();
  }

  getTreeItem(element: RobotNode): vscode.TreeItem {
    const item = new vscode.TreeItem(
      element.label,
      element.collapsible
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.None,
    );
    item.description = element.description;
    item.id = element.id;
    item.command = element.command;
    return item;
  }

  async getChildren(element?: RobotNode): Promise<RobotNode[]> {
    if (element) {
      return element.children ?? [];
    }
    return this.buildRoot();
  }

  private async buildRoot(): Promise<RobotNode[]> {
    const root = this.getRoot();
    let projectLabel = "No folder open";
    let moduleLabel = "Module: unknown";
    if (root) {
      try {
        const info = await new OfficialFtcProjectAdapter().inspect(root);
        projectLabel = "Official FTC project detected";
        moduleLabel = `Module: ${info.moduleName}`;
      } catch {
        projectLabel = "Not an official FTC project (or unsupported layout)";
      }
    }

    const sdk = this.getSdkStatus();
    let sdkLabel = "SDK: not checked yet";
    if (sdk?.local.version && sdk.remote) {
      sdkLabel = `SDK: ${sdk.local.version} → ${sdk.remote.version} (${sdk.freshness})`;
    } else if (sdk?.local.version) {
      sdkLabel = `SDK: ${sdk.local.version} (${sdk.freshness})`;
    } else if (sdk) {
      sdkLabel = `SDK: ${sdk.freshness}`;
    }

    const wifi = this.getWifiStatus();
    let wifiLabel = "Wi-Fi: not checked yet";
    if (wifi) {
      const consolePart = wifi.console.reachable ? "console OK" : "console down";
      const nicPart = wifi.selectedInterface
        ? `NIC ${wifi.selectedInterface.name}`
        : "no robot NIC";
      wifiLabel = `Wi-Fi: ${consolePart}; ${nicPart}`;
    }

    let deviceTitle = "No Android device";
    let connection = "Connection status: unknown";
    let authorization = "Authorization status: unknown";
    try {
      const runner = new NodeProcessRunner();
      const adb = await discoverAdb(runner);
      if (adb.found && adb.adbPath) {
        const provider = new AdbDeviceProvider(runner, adb.adbPath);
        const devices = await provider.listDevices();
        const config = root ? await loadProjectConfig(root) : undefined;
        const selection = selectDeploymentDevice({
          devices,
          explicitSerial: this.getSelectedSerial(),
          preferredSerial:
            vscode.workspace.getConfiguration("ftc").get<string>("preferredDeviceSerial") ||
            undefined,
          preferredConnection: config?.config.deployment?.preferredConnection ?? "any",
        });
        if (selection.ok) {
          const device = selection.device;
          deviceTitle =
            device.controlHubLikelihood === "probable"
              ? "Probable Control Hub (not guaranteed)"
              : "Android device";
          connection = `Connection: ${device.connectionType} (${device.state})`;
          authorization = `Authorization: ${device.authorization}`;
          deviceTitle = `${deviceTitle} — ${device.serial}`;
        } else if (selection.code === "MULTIPLE_DEVICES") {
          deviceTitle = "Multiple devices — select one";
          connection = "Connection status: multiple";
        } else if (selection.code === "DEVICE_UNAUTHORIZED") {
          deviceTitle = "Unauthorized device";
          authorization = "Authorization: unauthorized";
        } else if (selection.code === "NO_MATCHING_CONNECTION") {
          deviceTitle = "No device matches preferred connection";
          connection = "Connection status: preference mismatch";
        } else {
          deviceTitle = "No usable Android device";
        }
      }
    } catch {
      deviceTitle = "adb unavailable";
    }

    return [
      {
        id: "header",
        label: "FTC ROBOT",
        collapsible: true,
        children: [
          {
            id: "project",
            label: "Project",
            collapsible: true,
            children: [
              { id: "project-detect", label: projectLabel, collapsible: false },
              { id: "project-module", label: moduleLabel, collapsible: false },
              {
                id: "project-sdk",
                label: sdkLabel,
                collapsible: false,
                command: { command: "ftc.checkSdk", title: "Check SDK Version" },
              },
              {
                id: "project-wifi",
                label: wifiLabel,
                collapsible: false,
                command: { command: "ftc.wifiStatus", title: "Wi-Fi Status" },
              },
            ],
          },
          {
            id: "device",
            label: "Device",
            collapsible: true,
            children: [
              { id: "device-title", label: deviceTitle, collapsible: false },
              { id: "device-connection", label: connection, collapsible: false },
              { id: "device-auth", label: authorization, collapsible: false },
            ],
          },
          {
            id: "actions",
            label: "Actions",
            collapsible: true,
            children: [
              actionNode("build", "Build", "ftc.build"),
              actionNode("deploy", "Deploy", "ftc.deploy"),
              actionNode("build-deploy", "Build and Deploy", "ftc.buildAndDeploy"),
              actionNode("logs", "View Logs", "ftc.viewLogs"),
              actionNode("stop-logs", "Stop Logs", "ftc.stopLogs"),
              actionNode("check-sdk", "Check SDK Version", "ftc.checkSdk"),
              actionNode("update-sdk", "Update FTC SDK", "ftc.updateSdk"),
              actionNode("wifi-status", "Wi-Fi Status", "ftc.wifiStatus"),
              actionNode("wifi-nic", "Select Robot NIC", "ftc.wifiSelectInterface"),
              actionNode("wifi-connect", "Connect Wi-Fi ADB", "ftc.wifiConnect"),
              actionNode("wifi-join", "Join Robot Wi-Fi", "ftc.wifiJoin"),
              actionNode("wifi-manage", "Get Hub Wi-Fi Settings", "ftc.wifiManageGet"),
              actionNode("wifi-prefer-inet", "Prefer Internet Interface", "ftc.wifiPreferInternet"),
              actionNode("wifi-prefer-robot", "Prefer Robot Interface", "ftc.wifiPreferRobot"),
              actionNode("hub-status", "Control Hub Status", "ftc.hubStatus"),
              actionNode("hub-os-check", "Check Hub OS Update", "ftc.hubUpdateCheck"),
              actionNode("pedro-status", "Pedro Pathing Status", "ftc.pedroStatus"),
              actionNode("pedro-add", "Add Pedro Pathing", "ftc.pedroAdd"),
              actionNode("opmode-list", "List OpModes", "ftc.opmodeList"),
              actionNode("opmode-create", "Create OpMode", "ftc.opmodeCreate"),
              actionNode("config-list", "List Robot Configs", "ftc.configList"),
              actionNode("config-show", "Show Robot Config", "ftc.configShow"),
              actionNode("config-validate", "Validate Robot Config", "ftc.configValidate"),
              actionNode("config-pull", "Pull Robot Configs", "ftc.configPull"),
              actionNode("wifi-console", "Open RC Console", "ftc.wifiOpenConsole"),
              actionNode("doctor", "Run Environment Check", "ftc.runDoctor"),
            ],
          },
        ],
      },
    ];
  }
}

function actionNode(id: string, label: string, command: string): RobotNode {
  return {
    id: `action-${id}`,
    label,
    collapsible: false,
    command: { command, title: label },
  };
}
