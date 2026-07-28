import * as vscode from "vscode";
import {
  buildInstallDepsCommand,
  describeInstallDepsConsentMessage,
  installDepsOsForPlatform,
  type BuildInstallDepsOptions,
} from "@ftc-dev-tools/shared";

export interface RunInstallDepsArgs extends BuildInstallDepsOptions {
  /** Telemetry / logging hint (e.g. doctor, set-up-computer). */
  source?: string;
  /** When true, skip the skip-JDK/SDK quick pick (args already set). */
  skipOptionsPick?: boolean;
}

type SkipPick =
  | { kind: "full" }
  | { kind: "custom"; skipJdk: boolean; skipSdk: boolean };

async function pickInstallDepsScope(args: RunInstallDepsArgs): Promise<SkipPick | undefined> {
  if (args.skipOptionsPick || args.skipJdk !== undefined || args.skipSdk !== undefined) {
    return {
      kind: "custom",
      skipJdk: args.skipJdk === true,
      skipSdk: args.skipSdk === true,
    };
  }

  const choice = await vscode.window.showQuickPick(
    [
      {
        label: "Install JDK and Android SDK",
        description: "Recommended for new machines",
        pick: { kind: "full" } as SkipPick,
      },
      {
        label: "Skip JDK (Android SDK / adb only)",
        description: "Use when Java is already installed correctly",
        pick: { kind: "custom", skipJdk: true, skipSdk: false } satisfies SkipPick,
      },
      {
        label: "Skip Android SDK (JDK only)",
        description: "Use when adb and ANDROID_HOME are already set up",
        pick: { kind: "custom", skipJdk: false, skipSdk: true } satisfies SkipPick,
      },
    ],
    { placeHolder: "Choose what the trusted installer should install" },
  );
  return choice?.pick;
}

async function promptPostInstallActions(): Promise<void> {
  const choice = await vscode.window.showInformationMessage(
    "When the installer finishes, reload the window so PATH and ANDROID_HOME updates apply, then re-run the environment check.",
    "Reload window",
    "Run environment check",
    "Later",
  );
  if (choice === "Reload window") {
    await vscode.commands.executeCommand("workbench.action.reloadWindow");
  } else if (choice === "Run environment check") {
    await vscode.commands.executeCommand("ftc.runDoctor");
  }
}

export async function runInstallDepsWithConsent(
  output: vscode.OutputChannel,
  args: RunInstallDepsArgs = {},
): Promise<void> {
  const os = installDepsOsForPlatform(process.platform);
  if (!os) {
    vscode.window.showErrorMessage(
      "Install-deps is only supported on Windows, macOS, and Linux.",
    );
    return;
  }

  const scope = await pickInstallDepsScope(args);
  if (!scope) {
    return;
  }

  const options: BuildInstallDepsOptions =
    scope.kind === "full" ? {} : { skipJdk: scope.skipJdk, skipSdk: scope.skipSdk };

  if (options.skipJdk && options.skipSdk) {
    vscode.window.showWarningMessage("Select at least JDK or Android SDK to install.");
    return;
  }

  const consentBody = describeInstallDepsConsentMessage(os, options);
  const confirm = await vscode.window.showWarningMessage(
    consentBody,
    { modal: true },
    "Run trusted installer",
    "Cancel",
  );
  if (confirm !== "Run trusted installer") {
    return;
  }

  const command = buildInstallDepsCommand(os, options);
  output.appendLine("");
  output.appendLine("FTC: Run install-deps (user confirmed)");
  if (args.source) {
    output.appendLine(`Source: ${args.source}`);
  }
  output.appendLine(`Platform: ${os}`);
  if (options.skipJdk) {
    output.appendLine("Options: skip JDK");
  }
  if (options.skipSdk) {
    output.appendLine("Options: skip Android SDK");
  }
  output.appendLine("Full command:");
  output.appendLine(command);
  output.show(true);

  const terminal = vscode.window.createTerminal("FTC install-deps");
  terminal.show();
  terminal.sendText(command, true);

  await promptPostInstallActions();
}
