import type { SidebarState } from "@ftc-dev-tools/shared";
import { actionNode, leafNode, type RobotNode } from "./robot-node-types.js";

export function buildHomeNodes(state: SidebarState): RobotNode[] {
  const rows: RobotNode[] = [
    leafNode("home-status", state.statusHeadline, {
      description: state.statusDetail,
      tooltip: state.statusDetail,
      icon: phaseIcon(state.phase),
      contextValue: "ftc.sidebar.status",
    }),
  ];

  if (state.primaryAction) {
    const primary = state.primaryAction;
    rows.push(
      actionNode(`home-primary-${primary.id}`, primary.label, primary.commandId, {
        description: "Recommended next step",
        icon: "rocket",
        contextValue: "ftc.sidebar.primaryAction",
      }),
    );
  }

  for (const secondary of state.secondaryActions) {
    rows.push(
      actionNode(`home-secondary-${secondary.id}`, secondary.label, secondary.commandId, {
        contextValue: "ftc.sidebar.secondaryAction",
      }),
    );
  }

  return rows;
}

function phaseIcon(phase: SidebarState["phase"]): RobotNode["icon"] {
  switch (phase) {
    case "welcome-no-folder":
    case "welcome-no-project":
      return "folder-opened";
    case "connect-robot":
    case "select-device":
      return "plug";
    case "authorize-robot":
      return "warning";
    case "ready-to-build":
    case "ready-to-deploy":
      return "rocket";
    case "run-opmode":
      return "play";
    case "all-set":
      return "check";
    default:
      return "info";
  }
}
