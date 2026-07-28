import * as vscode from "vscode";
import path from "node:path";
import { OfficialFtcProjectAdapter, discoverNearbyFtcProjectRoots } from "@ftc-dev-tools/shared";

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
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("ftc.projectRoot")) {
        void refreshWorkspaceRoot(context, { promptIfMultiple: false });
      }
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

export async function openSuggestedProjectRootCommand(
  context: vscode.ExtensionContext,
  rootsArg?: string | string[],
): Promise<void> {
  const roots = normalizeRootsArg(rootsArg);
  if (roots.length === 0) {
    vscode.window.showWarningMessage("No suggested FTC project root to open.");
    return;
  }
  const picked =
    roots.length === 1
      ? roots[0]
      : (
          await vscode.window.showQuickPick(
            roots.map((root) => ({
              label: vscode.workspace.asRelativePath(root) || root,
              description: root,
              root,
            })),
            { placeHolder: "Choose the FTC project root to open" },
          )
        )?.root;
  if (!picked) {
    return;
  }
  resolvedRoot = picked;
  await context.workspaceState.update(STORAGE_KEY, picked);
  const uri = vscode.Uri.file(picked);
  const choice = await vscode.window.showInformationMessage(
    `Open FTC project root: ${picked}`,
    "Open Folder",
    "Add to Workspace",
    "Cancel",
  );
  if (choice === "Open Folder") {
    await vscode.commands.executeCommand("vscode.openFolder", uri, false);
  } else if (choice === "Add to Workspace") {
    await addFolderToWorkspace(picked);
  }
}

export async function addSuggestedProjectRootToWorkspaceCommand(
  rootsArg?: string | string[],
): Promise<void> {
  const roots = normalizeRootsArg(rootsArg);
  if (roots.length === 0) {
    vscode.window.showWarningMessage("No suggested FTC project root to add.");
    return;
  }
  const picked =
    roots.length === 1
      ? roots[0]
      : (
          await vscode.window.showQuickPick(
            roots.map((root) => ({
              label: vscode.workspace.asRelativePath(root) || root,
              description: root,
              root,
            })),
            { placeHolder: "Choose the FTC project root to add to this workspace" },
          )
        )?.root;
  if (!picked) {
    return;
  }
  await addFolderToWorkspace(picked);
}

async function addFolderToWorkspace(folderPath: string): Promise<void> {
  const uri = vscode.Uri.file(folderPath);
  const existing = vscode.workspace.workspaceFolders?.some(
    (folder) => path.resolve(folder.uri.fsPath) === path.resolve(folderPath),
  );
  if (existing) {
    vscode.window.showInformationMessage("That folder is already in the workspace.");
    return;
  }
  const success = vscode.workspace.updateWorkspaceFolders(
    vscode.workspace.workspaceFolders?.length ?? 0,
    null,
    { uri, name: path.basename(folderPath) },
  );
  if (success) {
    vscode.window.showInformationMessage(`Added FTC project root to workspace: ${folderPath}`);
  }
}

function normalizeRootsArg(rootsArg?: string | string[]): string[] {
  if (!rootsArg) {
    return [];
  }
  return (Array.isArray(rootsArg) ? rootsArg : [rootsArg]).map((root) => path.resolve(root));
}

function readConfiguredProjectRoot(): string | undefined {
  const raw = vscode.workspace.getConfiguration("ftc").get<string>("projectRoot")?.trim();
  if (!raw) {
    return undefined;
  }
  const folders = vscode.workspace.workspaceFolders;
  const absolute = path.isAbsolute(raw)
    ? raw
    : folders?.[0]
      ? path.join(folders[0].uri.fsPath, raw)
      : raw;
  return path.resolve(absolute);
}

async function refreshWorkspaceRoot(
  context: vscode.ExtensionContext,
  options: { promptIfMultiple: boolean },
): Promise<void> {
  const configured = readConfiguredProjectRoot();
  if (configured) {
    const adapter = new OfficialFtcProjectAdapter();
    if (await adapter.detect(configured)) {
      resolvedRoot = configured;
      await context.workspaceState.update(STORAGE_KEY, configured);
      return;
    }
  }

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
  const seen = new Set<string>();
  for (const folder of folders) {
    const root = folder.uri.fsPath;
    if (await adapter.detect(root)) {
      if (!seen.has(root)) {
        seen.add(root);
        roots.push(root);
      }
      continue;
    }
    const nearby = await discoverNearbyFtcProjectRoots(root, { adapter });
    for (const candidate of nearby) {
      if (!seen.has(candidate)) {
        seen.add(candidate);
        roots.push(candidate);
      }
    }
  }
  return roots;
}
