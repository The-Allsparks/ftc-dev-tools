import * as vscode from "vscode";
import {
  START_HERE_PROGRESS_KEY,
  START_HERE_STEPS,
  countStartHereCompleted,
  getNextStartHereStep,
  isStartHereStepComplete,
  normalizeStartHereProgress,
  serializeStartHereProgress,
  type StartHereStep,
  type StartHereStepId,
} from "@ftc-dev-tools/shared";

/** Palette titles from package.json contributes.commands (for quick-pick labels). */
const FTC_COMMAND_TITLES: Record<string, string> = {
  "ftc.configureRecommendedExtensions": "FTC: Configure Recommended Extensions",
  "ftc.setUpComputer": "FTC: Set Up This Computer",
  "ftc.installCli": "FTC: Install FTC CLI",
  "ftc.runDoctor": "FTC: Run Environment Check",
  "ftc.selectProjectRoot": "FTC: Select Project Root",
  "ftc.setUpProject": "FTC: Set Up This FTC Project",
  "ftc.showDevices": "FTC: Show Devices",
  "ftc.selectDevice": "FTC: Select Deployment Device",
  "ftc.wifiConnect": "FTC: Connect Wi-Fi ADB",
  "ftc.build": "FTC: Build Robot Code",
  "ftc.deploy": "FTC: Deploy to Robot",
  "ftc.buildAndDeploy": "FTC: Build and Deploy",
  "ftc.viewLogs": "FTC: View Robot Logs",
};

function commandTitle(commandId: string): string {
  return FTC_COMMAND_TITLES[commandId] ?? commandId;
}

function loadCompleted(context: vscode.ExtensionContext): StartHereStepId[] {
  return normalizeStartHereProgress(context.globalState.get(START_HERE_PROGRESS_KEY));
}

async function saveCompleted(
  context: vscode.ExtensionContext,
  completed: StartHereStepId[],
): Promise<void> {
  await context.globalState.update(START_HERE_PROGRESS_KEY, serializeStartHereProgress(completed));
}

function markComplete(completed: StartHereStepId[], id: StartHereStepId): StartHereStepId[] {
  if (completed.includes(id)) {
    return completed;
  }
  return serializeStartHereProgress([...completed, id]);
}

export async function startHereCommand(context: vscode.ExtensionContext): Promise<void> {
  let completed = loadCompleted(context);

  for (;;) {
    const next = getNextStartHereStep(completed);
    const doneCount = countStartHereCompleted(completed);
    const total = START_HERE_STEPS.length;
    const header =
      doneCount === total
        ? "All steps complete — reopen any step to run commands again."
        : next
          ? `Next up: ${next.title} (${doneCount}/${total} done)`
          : `${doneCount}/${total} steps done`;

    type StepPick = vscode.QuickPickItem & { step?: StartHereStep; action?: "reset" | "exit" };

    const items: StepPick[] = START_HERE_STEPS.map((step) => {
      const check = isStartHereStepComplete(completed, step.id)
        ? "$(check) "
        : "$(circle-outline) ";
      const isNext = next?.id === step.id ? " — suggested next" : "";
      return {
        label: `${check}${step.title}${isNext}`,
        description: step.id,
        detail: step.description.split(".")[0] + ".",
        step,
      };
    });

    items.push({ kind: vscode.QuickPickItemKind.Separator, label: "Wizard" });
    items.push({
      label: "$(refresh) Reset Start Here progress",
      description: "Clear completed checkmarks",
      action: "reset",
    });
    items.push({
      label: "$(close) Close",
      action: "exit",
    });

    const picked = await vscode.window.showQuickPick(items, {
      title: "FTC: Start Here",
      placeHolder: header,
      ignoreFocusOut: true,
    });

    if (!picked || picked.action === "exit") {
      return;
    }

    if (picked.action === "reset") {
      const confirm = await vscode.window.showWarningMessage(
        "Clear all Start Here progress on this machine?",
        { modal: true },
        "Reset",
        "Cancel",
      );
      if (confirm === "Reset") {
        completed = [];
        await saveCompleted(context, completed);
        vscode.window.showInformationMessage("Start Here progress reset.");
      }
      continue;
    }

    if (picked.step) {
      const stay = await runStepActions(context, picked.step, completed);
      completed = stay.completed;
    }
  }
}

async function runStepActions(
  context: vscode.ExtensionContext,
  step: StartHereStep,
  completed: StartHereStepId[],
): Promise<{ completed: StartHereStepId[] }> {
  for (;;) {
    type ActionPick = vscode.QuickPickItem & {
      runCommandId?: string;
      markComplete?: boolean;
      back?: boolean;
    };

    const actions: ActionPick[] = [];

    for (const commandId of step.commandIds ?? []) {
      actions.push({
        label: `$(play) Run: ${commandTitle(commandId)}`,
        description: commandId,
        runCommandId: commandId,
      });
    }

    if (step.allowManualComplete && !isStartHereStepComplete(completed, step.id)) {
      actions.push({
        label: "$(check) Mark step complete",
        description: "I finished this step",
        markComplete: true,
      });
    }

    actions.push({ kind: vscode.QuickPickItemKind.Separator, label: "" });
    actions.push({ label: "$(arrow-left) Back to all steps", back: true });

    const choice = await vscode.window.showQuickPick(actions, {
      title: `FTC: Start Here — ${step.title}`,
      placeHolder: step.description,
      ignoreFocusOut: true,
    });

    if (!choice || choice.back) {
      return { completed };
    }

    if (choice.runCommandId) {
      await vscode.commands.executeCommand(choice.runCommandId);
      continue;
    }

    if (choice.markComplete) {
      completed = markComplete(completed, step.id);
      await saveCompleted(context, completed);
      vscode.window.showInformationMessage(`Marked complete: ${step.title}`);
      return { completed };
    }
  }
}
