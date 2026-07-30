import type * as vscode from "vscode";

/** Codicon id for TreeItem.iconPath — never embed $() in labels. */
export type RobotNodeIcon =
  | "check"
  | "circle-outline"
  | "book"
  | "rocket"
  | "plug"
  | "warning"
  | "info"
  | "debug"
  | "play"
  | "folder-opened"
  | "server-environment";

export type RobotNode = {
  id: string;
  label: string;
  description?: string;
  tooltip?: string;
  icon?: RobotNodeIcon;
  collapsible: boolean;
  initiallyCollapsed?: boolean;
  children?: RobotNode[];
  command?: vscode.Command;
  contextValue?: string;
};

export function leafNode(
  id: string,
  label: string,
  options?: {
    description?: string;
    tooltip?: string;
    icon?: RobotNodeIcon;
    command?: vscode.Command;
    contextValue?: string;
  },
): RobotNode {
  return {
    id,
    label,
    collapsible: false,
    description: options?.description,
    tooltip: options?.tooltip,
    icon: options?.icon,
    command: options?.command,
    contextValue: options?.contextValue,
  };
}

export function sectionNode(
  id: string,
  label: string,
  children: RobotNode[],
  options?: { description?: string; initiallyCollapsed?: boolean },
): RobotNode {
  return {
    id,
    label,
    description: options?.description,
    collapsible: true,
    initiallyCollapsed: options?.initiallyCollapsed,
    children,
  };
}

export function actionNode(
  id: string,
  label: string,
  command: string,
  options?: { description?: string; icon?: RobotNodeIcon; contextValue?: string },
): RobotNode {
  return leafNode(id, label, {
    description: options?.description,
    tooltip: options?.description,
    icon: options?.icon,
    contextValue: options?.contextValue,
    command: { command, title: label },
  });
}
