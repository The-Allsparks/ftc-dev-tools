import * as vscode from "vscode";
import {
  OfficialFtcProjectAdapter,
  AdbDeviceProvider,
  NodeProcessRunner,
  discoverAdb,
  loadProjectConfig,
  selectDeploymentDevice,
  computeSidebarState,
  type LastSuccessfulBuildSnapshot,
  type SdkStatusReport,
  type StartHereStepId,
  type WifiStatusReport,
} from "@ftc-dev-tools/shared";
import type { MilestoneStepId } from "@ftc-dev-tools/shared";
import type { SidebarDeviceInfo, SidebarProjectInfo } from "@ftc-dev-tools/shared";
import { buildHomeNodes } from "./home-nodes.js";
import { buildJourneySectionNodes } from "./journey-nodes.js";
import { buildQuickActionNodes } from "./quick-action-nodes.js";
import { buildAdvancedNodes, buildDetailsNodes } from "./details-nodes.js";
import { sectionNode, type RobotNode } from "./robot-node-types.js";

export class FtcRobotTreeProvider implements vscode.TreeDataProvider<RobotNode> {
  private readonly emitter = new vscode.EventEmitter<RobotNode | undefined | void>();
  readonly onDidChangeTreeData = this.emitter.event;

  constructor(
    private readonly getRoot: () => string | undefined,
    private readonly getSelectedSerial: () => string | undefined,
    private readonly getSdkStatus: () => SdkStatusReport | undefined,
    private readonly getWifiStatus: () => WifiStatusReport | undefined,
    private readonly getStartHereCompleted: () => readonly StartHereStepId[],
    private readonly getMilestoneCompleted: () => readonly MilestoneStepId[],
    private readonly getLastSuccessfulBuild: () => LastSuccessfulBuildSnapshot | undefined,
  ) {}

  refresh(): void {
    this.emitter.fire();
  }

  getTreeItem(element: RobotNode): vscode.TreeItem {
    const collapsibleState = element.collapsible
      ? element.initiallyCollapsed
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.Expanded
      : vscode.TreeItemCollapsibleState.None;

    const item = new vscode.TreeItem(element.label, collapsibleState);
    item.description = element.description;
    item.id = element.id;
    item.command = element.command;
    item.tooltip = element.tooltip ?? element.description;
    item.contextValue = element.contextValue;

    if (element.icon) {
      item.iconPath = new vscode.ThemeIcon(element.icon);
    }

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
    const project = await this.inspectProject(root);
    const device = await this.inspectDevice(root);
    const milestones = this.getMilestoneCompleted();
    const startHereCompleted = this.getStartHereCompleted();
    const lastBuild = this.getLastSuccessfulBuild();
    const sdk = this.getSdkStatus();
    const wifi = this.getWifiStatus();

    const sidebarState = computeSidebarState({
      hasWorkspaceFolder: Boolean(root),
      project,
      device,
      milestones,
      hasSuccessfulBuild: Boolean(lastBuild?.completedAt),
    });

    const homeChildren = buildHomeNodes(sidebarState);
    const journeyChildren = buildJourneySectionNodes(startHereCompleted, milestones, {
      includeFocusedStartHere:
        sidebarState.phase === "welcome-no-folder" ||
        sidebarState.phase === "welcome-no-project" ||
        sidebarState.phase === "connect-robot",
    });
    const quickChildren = buildQuickActionNodes(sidebarState);
    const detailsChildren = buildDetailsNodes({
      project,
      device,
      sdk,
      wifi,
      milestones,
      moduleName: project.moduleName,
    });
    const advancedChildren = buildAdvancedNodes({ showProjectTools: project.detected });

    const journeyLabel =
      sidebarState.phase === "all-set" || sidebarState.phase === "run-opmode"
        ? "Ready to run"
        : "Getting started";

    return [
      sectionNode("section-home", "Current status", homeChildren),
      sectionNode("section-journey", journeyLabel, journeyChildren, {
        description: "Your progress",
      }),
      sectionNode("section-quick", "Quick actions", quickChildren),
      sectionNode("section-details", "Details", detailsChildren, { initiallyCollapsed: true }),
      sectionNode("section-advanced", "Advanced", advancedChildren, { initiallyCollapsed: true }),
    ];
  }

  private async inspectProject(root: string | undefined): Promise<SidebarProjectInfo> {
    if (!root) {
      return { detected: false };
    }
    try {
      const info = await new OfficialFtcProjectAdapter().inspect(root);
      return { detected: true, moduleName: info.moduleName };
    } catch {
      return { detected: false };
    }
  }

  private async inspectDevice(root: string | undefined): Promise<SidebarDeviceInfo> {
    try {
      const runner = new NodeProcessRunner();
      const adb = await discoverAdb(runner);
      if (!adb.found || !adb.adbPath) {
        return { phase: "adb-unavailable" };
      }

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
        return {
          phase: "connected",
          serial: device.serial,
          connectionType: device.connectionType,
          isControlHub: device.controlHubLikelihood === "probable",
        };
      }

      if (selection.code === "DEVICE_UNAUTHORIZED") {
        return { phase: "unauthorized" };
      }
      if (selection.code === "MULTIPLE_DEVICES") {
        return { phase: "multiple" };
      }
      if (selection.code === "NO_MATCHING_CONNECTION") {
        return { phase: "preference-mismatch" };
      }
      return { phase: "no-devices" };
    } catch {
      return { phase: "adb-unavailable" };
    }
  }
}
