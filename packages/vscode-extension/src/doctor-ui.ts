import * as vscode from "vscode";
import type { DoctorCheckUiItem, DoctorFixAction, DoctorReport } from "@ftc-dev-tools/shared";
import { listActionableDoctorChecks, resolveDoctorSuccessNextStep } from "@ftc-dev-tools/shared";

type QuickPickDoctorItem = vscode.QuickPickItem & { uiItem: DoctorCheckUiItem };

export async function executeDoctorFixAction(
  action: DoctorFixAction,
  output: vscode.OutputChannel,
): Promise<void> {
  switch (action.kind) {
    case "vscode-command":
      if (action.command) {
        if (action.commandArgs?.length) {
          await vscode.commands.executeCommand(action.command, ...action.commandArgs);
        } else {
          await vscode.commands.executeCommand(action.command);
        }
      }
      break;
    case "open-url":
      if (action.url) {
        await vscode.env.openExternal(vscode.Uri.parse(action.url));
      }
      break;
    case "terminal":
      if (action.id === "install-deps") {
        await vscode.commands.executeCommand("ftc.runInstallDeps", { source: "doctor" });
        break;
      }
      if (action.terminalCommand) {
        output.appendLine(`Opened terminal with: ${action.terminalCommand}`);
        const terminal = vscode.window.createTerminal("FTC Dev Tools");
        terminal.show();
        terminal.sendText(action.terminalCommand, true);
      }
      break;
    case "reload-window":
      await vscode.commands.executeCommand("workbench.action.reloadWindow");
      break;
  }
}

async function presentDoctorCheckFixes(
  uiItem: DoctorCheckUiItem,
  output: vscode.OutputChannel,
): Promise<void> {
  if (uiItem.friendlyError) {
    output.appendLine("");
    output.appendLine(`${uiItem.friendlyError.title} (${uiItem.friendlyError.code})`);
    output.appendLine(uiItem.friendlyError.summary);
    for (const step of uiItem.friendlyError.suggestedActions) {
      output.appendLine(`- ${step}`);
    }
    if (uiItem.friendlyError.technicalDetails) {
      output.appendLine("Technical details:");
      output.appendLine(uiItem.friendlyError.technicalDetails);
    }
  }

  const actions: DoctorFixAction[] = [];
  if (uiItem.primaryAction) {
    actions.push(uiItem.primaryAction);
  }
  for (const secondary of uiItem.secondaryActions) {
    if (!actions.some((existing) => existing.id === secondary.id)) {
      actions.push(secondary);
    }
  }
  actions.push({
    id: "open-output",
    label: "Open technical output",
    kind: "vscode-command",
    command: "ftc.openTechnicalOutput",
  });

  const title = uiItem.friendlyError?.title ?? uiItem.label;
  const message = `${title}: ${uiItem.summary}`;
  const choice = await vscode.window.showErrorMessage(
    message,
    { modal: false },
    ...actions.map((action) => action.label),
  );
  if (!choice) {
    return;
  }
  const picked = actions.find((action) => action.label === choice);
  if (picked) {
    await executeDoctorFixAction(picked, output);
  }
}

export async function showDoctorResultsUi(
  report: DoctorReport,
  output: vscode.OutputChannel,
): Promise<void> {
  const actionable = listActionableDoctorChecks(report);
  if (actionable.length === 0) {
    const next = resolveDoctorSuccessNextStep(report);
    if (next) {
      const choice = await vscode.window.showInformationMessage(
        report.summaryLine,
        next.label,
        "Run environment check again",
      );
      if (choice === next.label) {
        await executeDoctorFixAction(next, output);
      } else if (choice === "Run environment check again") {
        await vscode.commands.executeCommand("ftc.runDoctor");
      }
    }
    return;
  }

  const statusPrefix = (status: DoctorCheckUiItem["status"]): string =>
    status === "fail" ? "$(error)" : "$(warning)";

  const items: QuickPickDoctorItem[] = actionable.map((uiItem) => ({
    label: `${statusPrefix(uiItem.status)} ${uiItem.label}`,
    description: uiItem.status === "fail" ? "Needs fix" : "Warning",
    detail: uiItem.summary,
    uiItem,
  }));

  const pick = await vscode.window.showQuickPick(items, {
    placeHolder: `${actionable.length} check(s) need attention — pick one for Fix actions`,
    matchOnDescription: true,
    matchOnDetail: true,
  });
  if (!pick) {
    return;
  }

  await presentDoctorCheckFixes(pick.uiItem, output);
}
