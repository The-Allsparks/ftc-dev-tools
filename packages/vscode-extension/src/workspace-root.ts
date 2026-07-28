import * as vscode from "vscode";
import { OfficialFtcProjectAdapter } from "@ftc-dev-tools/shared";

const STORAGE_KEY = "ftc.selectedProjectRoot";

let resolvedRoot: string | undefined;

export function getWorkspaceRoot(): string | undefined {
  return resolvedRoot ?? vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

export function initWorkspaceRoot(context: vscode.ExtensionContext): void {
  void refreshWorkspaceRoot(context, { promptIfMultiple: true });
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      void refreshWorkspaceRoot(context, { promptIfMultiple: false });
    }),
  );
}

export async function selectFtcProjectRootCommand(context: vscode.ExtensionContext): Promise<void> {
  const candidates = await findFtcProjectRoots();
  if (candidates.length === 0) {
    vscode.window.showWarningMessage("No FTC project roots found in this workspace.");
    return;
  }
  const pick = await vscode.window.showQuickPick(
    candidates.map((root) => ({
      label: vscode.workspace.asRelativePath(root) || root,
      description: root,
      root,
    })),
    { placeHolder: "Select FTC project root for commands" },
  );
  if (!pick) {
    return;
  }
  resolvedRoot = pick.root;
  await context.workspaceState.update(STORAGE_KEY, pick.root);
  vscode.window.showInformationMessage(`FTC project root: ${pick.label}`);
}

async function refreshWorkspaceRoot(
  context: vscode.ExtensionContext,
  options: { promptIfMultiple: boolean },
): Promise<void> {
  const candidates = await findFtcProjectRoots();
  if (candidates.length === 0) {
    resolvedRoot = undefined;
    return;
  }
  if (candidates.length === 1) {
    resolvedRoot = candidates[0];
    await context.workspaceState.update(STORAGE_KEY, candidates[0]);
    return;
  }

  const saved = context.workspaceState.get<string>(STORAGE_KEY);
  if (saved && candidates.includes(saved)) {
    resolvedRoot = saved;
    return;
  }

  if (options.promptIfMultiple) {
    const pick = await vscode.window.showQuickPick(
      candidates.map((root) => ({
        label: vscode.workspace.asRelativePath(root) || root,
        description: root,
        root,
      })),
      {
        placeHolder: "Multiple FTC projects — choose which one FTC Dev Tools should use",
        ignoreFocusOut: true,
      },
    );
    if (pick) {
      resolvedRoot = pick.root;
      await context.workspaceState.update(STORAGE_KEY, pick.root);
      return;
    }
  }

  resolvedRoot = saved ?? candidates[0];
}

async function findFtcProjectRoots(): Promise<string[]> {
  const adapter = new OfficialFtcProjectAdapter();
  const folders = vscode.workspace.workspaceFolders ?? [];
  const roots: string[] = [];
  for (const folder of folders) {
    const root = folder.uri.fsPath;
    if (await adapter.detect(root)) {
      roots.push(root);
    }
  }
  return roots;
}
