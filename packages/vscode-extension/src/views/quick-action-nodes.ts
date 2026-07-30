import type { SidebarState } from "@ftc-dev-tools/shared";
import { actionNode, type RobotNode } from "./robot-node-types.js";

export function buildQuickActionNodes(state: SidebarState): RobotNode[] {
  const rows: RobotNode[] = [];

  if (state.showBuildActions) {
    if (state.primaryAction?.commandId === "ftc.buildAndDeploy") {
      rows.push(
        actionNode("quick-build-deploy", "Build and Deploy", "ftc.buildAndDeploy", {
          description: "Compile TeamCode and install on the robot",
          icon: "rocket",
          contextValue: "ftc.sidebar.primaryAction",
        }),
      );
    } else if (state.phase === "ready-to-deploy") {
      rows.push(
        actionNode("quick-deploy", "Deploy to Robot", "ftc.deploy", {
          description: "Install the latest build on your robot",
          icon: "rocket",
          contextValue: "ftc.sidebar.primaryAction",
        }),
      );
    } else if (state.phase === "run-opmode" || state.phase === "all-set") {
      rows.push(
        actionNode("quick-build-deploy", "Build and Deploy", "ftc.buildAndDeploy", {
          description: "Rebuild and redeploy after code changes",
          icon: "rocket",
        }),
      );
    }

    if (state.phase === "ready-to-build" || state.phase === "ready-to-deploy") {
      const secondaryIds = new Set(state.secondaryActions.map((a) => a.commandId));
      if (secondaryIds.has("ftc.build")) {
        rows.push(actionNode("quick-build", "Build only", "ftc.build"));
      }
      if (secondaryIds.has("ftc.deploy")) {
        rows.push(actionNode("quick-deploy-only", "Deploy only", "ftc.deploy"));
      }
    }
  }

  if (state.showDeviceActions) {
    rows.push(
      actionNode("quick-troubleshoot", "Troubleshoot Connection", "ftc.connectRobotUsb", {
        description: "USB connect, authorize, or pick a device",
        icon: "plug",
      }),
    );
  }

  if (state.showBuildActions || state.showDeviceActions) {
    rows.push(
      actionNode("quick-logs", "View Robot Logs", "ftc.viewLogs", {
        description: "Stream TeamCode logcat from the robot",
      }),
    );
  }

  if (rows.length === 0) {
    rows.push(
      actionNode("quick-start-here", "Start Here guide", "ftc.startHere", {
        description: "Step-by-step checklist for new teams",
        icon: "book",
      }),
      actionNode("quick-doctor", "Run Environment Check", "ftc.runDoctor", {
        description: "Verify Java, adb, SDK, and project setup",
        icon: "debug",
      }),
    );
  }

  return rows;
}
