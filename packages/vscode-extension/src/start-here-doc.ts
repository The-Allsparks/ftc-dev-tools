import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import {
  renderStartHereMarkdown,
  type StartHereMachineScan,
  type StartHereStepId,
} from "@ftc-dev-tools/shared";

const REL = path.join(".ftc-dev-tools", "start-here.md");

function docUri(context: vscode.ExtensionContext): vscode.Uri {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (folder) {
    return vscode.Uri.file(path.join(folder.uri.fsPath, REL));
  }
  return vscode.Uri.file(path.join(context.globalStorageUri.fsPath, "start-here.md"));
}

export async function syncStartHereDoc(
  context: vscode.ExtensionContext,
  completed: readonly StartHereStepId[],
  activeStepId?: StartHereStepId,
  machineScan?: StartHereMachineScan,
): Promise<vscode.Uri> {
  const uri = docUri(context);
  const md = renderStartHereMarkdown({ completed, activeStepId, machineScan });
  fs.mkdirSync(path.dirname(uri.fsPath), { recursive: true });
  fs.writeFileSync(uri.fsPath, md, "utf8");
  return uri;
}

export async function openStartHereDocPreview(uri: vscode.Uri): Promise<void> {
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc, { preview: true, viewColumn: vscode.ViewColumn.One });
  await vscode.commands.executeCommand("markdown.showPreviewToSide", uri);
}
