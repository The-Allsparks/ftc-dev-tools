import * as vscode from "vscode";
import { formatDriverStationInitStartMessage } from "@ftc-dev-tools/shared";

export type FirstOpModeJourneyDeps = {
  executeCommand: (commandId: string) => Thenable<unknown>;
  hasWorkspaceRoot: () => boolean;
};

/**
 * Rookie "hello robot" path (#42): create OpMode, optional config validate, build+deploy, logs, DS guidance.
 */
export async function firstOpModeJourneyCommand(deps: FirstOpModeJourneyDeps): Promise<void> {
  if (!deps.hasWorkspaceRoot()) {
    vscode.window.showWarningMessage(
      "Open your FTC project folder first, then run First OpMode Journey.",
    );
    return;
  }

  const begin = await vscode.window.showInformationMessage(
    "First OpMode Journey walks you through creating a simple TeleOp, deploying it, and running it from Driver Station.",
    "Start",
    "Cancel",
  );
  if (begin !== "Start") {
    return;
  }

  await vscode.window.showInformationMessage(
    [
      "You will:",
      "• Create a new OpMode (TeleOp is a good first choice)",
      "• Optionally validate robot configuration",
      "• Build and deploy to your selected robot",
      "• Optionally stream TeamCode logs",
      "• Get a short Driver Station Init / Start checklist",
    ].join("\n"),
    { modal: true },
    "Continue",
  );

  await deps.executeCommand("ftc.opmodeCreate");

  const validate = await vscode.window.showInformationMessage(
    "Validate robot configuration now? (Skip if you have not edited hardware config yet.)",
    "Validate config",
    "Skip",
  );
  if (validate === "Validate config") {
    await deps.executeCommand("ftc.configValidate");
  }

  const deployReady = await vscode.window.showInformationMessage(
    "Build and install the APK on your selected deployment device?",
    "Build and deploy",
    "Not yet",
  );
  if (deployReady === "Build and deploy") {
    await deps.executeCommand("ftc.buildAndDeploy");
  } else {
    return;
  }

  const logs = await vscode.window.showInformationMessage(
    "Stream TeamCode logs while you test on Driver Station? (Stop later with FTC: Stop Robot Logs.)",
    "View logs",
    "Skip",
  );
  if (logs === "View logs") {
    await deps.executeCommand("ftc.viewLogs");
  }

  await vscode.window.showInformationMessage(formatDriverStationInitStartMessage(), {
    modal: true,
  });
}
