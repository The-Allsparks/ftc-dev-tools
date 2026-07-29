import * as vscode from "vscode";
import { discoverJava, suggestFtcJavaHomeSetting, REQUIRED_JDK_MAJOR } from "@ftc-dev-tools/shared";
import type { NodeProcessRunner } from "@ftc-dev-tools/shared";

/** When JDK 17 is installed but `java` on PATH is older, set `ftc.javaHome` so doctor, Gradle, and MCP agree. */
export async function ensureFtcJavaHomeForBuilds(
  runner: NodeProcessRunner,
  output?: vscode.OutputChannel,
): Promise<boolean> {
  const config = vscode.workspace.getConfiguration("ftc");
  const current = config.get<string>("javaHome")?.trim();
  if (current) {
    return false;
  }

  const java = await discoverJava(runner, process.env);
  const suggested = suggestFtcJavaHomeSetting(java, current);
  if (!suggested) {
    return false;
  }

  // JDK install path is machine-local; user settings (not workspace folder scope).
  await config.update("javaHome", suggested, vscode.ConfigurationTarget.Global);

  const pathNote =
    java.pathMajorVersion !== undefined ? ` (java on PATH was ${java.pathMajorVersion})` : "";
  const message = `Set ftc.javaHome to JDK ${REQUIRED_JDK_MAJOR} at ${suggested}${pathNote}.`;
  output?.appendLine(message);
  vscode.window.showInformationMessage(message);
  return true;
}
