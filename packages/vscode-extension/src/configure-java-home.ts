import * as vscode from "vscode";
import {
  NodeProcessRunner,
  discoverJava,
  suggestFtcJavaHomeSetting,
  REQUIRED_JDK_MAJOR,
} from "@ftc-dev-tools/shared";

/** When JDK 17 is installed but `java` on PATH is older, set `ftc.javaHome` so doctor, Gradle, and MCP agree. */
export async function ensureFtcJavaHomeForBuilds(
  runner: NodeProcessRunner,
  output?: vscode.OutputChannel,
): Promise<boolean> {
  const scope = vscode.workspace.workspaceFolders?.[0];
  const config = vscode.workspace.getConfiguration("ftc", scope?.uri);
  const current = config.get<string>("javaHome")?.trim();
  if (current) {
    return false;
  }

  const java = await discoverJava(runner, process.env);
  const suggested = suggestFtcJavaHomeSetting(java, current);
  if (!suggested) {
    return false;
  }

  const target = scope
    ? vscode.ConfigurationTarget.WorkspaceFolder
    : vscode.ConfigurationTarget.Global;
  await config.update("javaHome", suggested, target);

  const pathNote =
    java.pathMajorVersion !== undefined
      ? ` (java on PATH was ${java.pathMajorVersion})`
      : "";
  const message = `Set ftc.javaHome to JDK ${REQUIRED_JDK_MAJOR} at ${suggested}${pathNote}.`;
  output?.appendLine(message);
  vscode.window.showInformationMessage(message);
  return true;
}
