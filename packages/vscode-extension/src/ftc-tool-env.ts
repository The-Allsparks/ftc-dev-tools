import * as vscode from "vscode";

/** Process env for shared services (doctor, Gradle), honoring `ftc.javaHome`. */
export function ftcToolProcessEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  const javaHome = vscode.workspace.getConfiguration("ftc").get<string>("javaHome")?.trim();
  if (javaHome) {
    env.FTC_JAVA_HOME = javaHome;
  }
  return env;
}
