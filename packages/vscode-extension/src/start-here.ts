import * as vscode from "vscode";
import {
  START_HERE_PROGRESS_KEY,
  START_HERE_STEPS,
  countStartHereCompleted,
  getFtcCommandTitle,
  getNextStartHereStep,
  isStartHereStepComplete,
  normalizeStartHereProgress,
  serializeStartHereProgress,
  type StartHereStep,
  type StartHereStepId,
  type StartHereMachineScan,
} from "@ftc-dev-tools/shared";
import { openStartHereDocPreview, syncStartHereDoc } from "./start-here-doc.js";
import type { StartHereDockProvider } from "./start-here-dock.js";
import { scanMachineForStartHere } from "./start-here-machine-scan.js";

export const START_HERE_PROMPTED_KEY = "ftc.startHere.prompted";

function commandTitle(commandId: string): string {
  return getFtcCommandTitle(commandId);
}

function loadCompleted(context: vscode.ExtensionContext): StartHereStepId[] {
  return normalizeStartHereProgress(context.globalState.get(START_HERE_PROGRESS_KEY));
}

const startHereProgressEmitter = new vscode.EventEmitter<void>();
export const onStartHereProgressChanged = startHereProgressEmitter.event;

async function saveCompleted(
  context: vscode.ExtensionContext,
  completed: StartHereStepId[],
): Promise<void> {
  await context.globalState.update(START_HERE_PROGRESS_KEY, serializeStartHereProgress(completed));
  startHereProgressEmitter.fire();
}

function markComplete(completed: StartHereStepId[], id: StartHereStepId): StartHereStepId[] {
  if (completed.includes(id)) {
    return completed;
  }
  return serializeStartHereProgress([...completed, id]);
}

async function refreshSurfaces(
  context: vscode.ExtensionContext,
  dock: StartHereDockProvider,
  completed: readonly StartHereStepId[],
  activeStepId?: StartHereStepId,
  machineScan?: StartHereMachineScan,
  openPreview = false,
): Promise<void> {
  const uri = await syncStartHereDoc(context, completed, activeStepId, machineScan);
  dock.update({ completed, activeStepId, machineScan });
  dock.reveal();
  if (openPreview) {
    await openStartHereDocPreview(uri);
  }
}

export async function maybeOfferStartHereMachineComplete(
  context: vscode.ExtensionContext,
  getWorkspaceRoot: () => string | undefined,
): Promise<void> {
  const completed = loadCompleted(context);
  if (isStartHereStepComplete(completed, "machine-checks")) {
    return;
  }
  const scan = await scanMachineForStartHere(getWorkspaceRoot);
  if (!scan.installNeeds.machineDepsSatisfied) {
    return;
  }
  const choice = await vscode.window.showInformationMessage(
    "Environment check passed for Java, SDK, and adb. Mark “Prepare this computer” complete in Start Here?",
    "Mark complete",
    "Not yet",
  );
  if (choice === "Mark complete") {
    await saveCompleted(context, markComplete(completed, "machine-checks"));
  }
}

export async function promptStartHereOnFirstOpen(context: vscode.ExtensionContext): Promise<void> {
  if (context.globalState.get(START_HERE_PROMPTED_KEY) === true) {
    return;
  }
  if (!vscode.workspace.workspaceFolders?.length) {
    return;
  }
  await context.globalState.update(START_HERE_PROMPTED_KEY, true);
  const choice = await vscode.window.showInformationMessage(
    "New to FTC Dev Tools? Start Here walks you from setup to your first deploy.",
    "Start Here",
    "Not now",
  );
  if (choice === "Start Here") {
    await vscode.commands.executeCommand("ftc.startHere");
  }
}

export async function startHereCommand(
  context: vscode.ExtensionContext,
  dock: StartHereDockProvider,
  getWorkspaceRoot: () => string | undefined,
): Promise<void> {
  let completed = loadCompleted(context);
  let machineScan: StartHereMachineScan | undefined;

  await refreshSurfaces(
    context,
    dock,
    completed,
    getNextStartHereStep(completed)?.id,
    machineScan,
    true,
  );

  for (;;) {
    const nextStep = getNextStartHereStep(completed);
    const doneCount = countStartHereCompleted(completed);
    const total = START_HERE_STEPS.length;
    const header =
      doneCount === total
        ? "All steps complete — reopen any step to run commands again."
        : nextStep
          ? `Next up: ${nextStep.title} (${doneCount}/${total} done)`
          : `${doneCount}/${total} steps done`;

    type StepPick = vscode.QuickPickItem & { step?: StartHereStep; action?: "reset" | "exit" };

    const items: StepPick[] = START_HERE_STEPS.map((step) => {
      const check = isStartHereStepComplete(completed, step.id)
        ? "$(check) "
        : "$(circle-outline) ";
      const isNext = nextStep?.id === step.id ? " — suggested next" : "";
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
      action: "reset",
    });
    items.push({ label: "$(close) Close", action: "exit" });

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
        machineScan = undefined;
        await saveCompleted(context, completed);
        await refreshSurfaces(
          context,
          dock,
          completed,
          getNextStartHereStep(completed)?.id,
          undefined,
          true,
        );
      }
      continue;
    }

    if (picked.step) {
      await refreshSurfaces(context, dock, completed, picked.step.id, machineScan, true);
      const result = await runStepActions(
        context,
        dock,
        picked.step,
        completed,
        getWorkspaceRoot,
        (s) => {
          machineScan = s;
        },
        () => machineScan,
      );
      completed = result.completed;
      await refreshSurfaces(context, dock, completed, picked.step.id, machineScan, false);
    }
  }
}

async function runStepActions(
  context: vscode.ExtensionContext,
  dock: StartHereDockProvider,
  step: StartHereStep,
  completed: StartHereStepId[],
  getWorkspaceRoot: () => string | undefined,
  setMachineScan: (scan: StartHereMachineScan) => void,
  getMachineScan: () => StartHereMachineScan | undefined,
): Promise<{ completed: StartHereStepId[] }> {
  for (;;) {
    type ActionPick = vscode.QuickPickItem & {
      runCommandId?: string;
      markComplete?: boolean;
      back?: boolean;
      scanInstall?: boolean;
      installMissing?: boolean;
    };

    const actions: ActionPick[] = [];

    if (step.id === "machine-checks") {
      actions.push({
        label: "$(cloud-download) Check & install what's missing",
        description: "Environment check, then trusted installer for only what failed",
        scanInstall: true,
      });
      actions.push({
        label: "$(search) Scan what's installed",
        description: "Refresh checklist without installing",
        installMissing: true,
      });
    }

    for (const commandId of step.commandIds ?? []) {
      if (step.id === "machine-checks" && commandId === "ftc.setUpComputer") {
        continue;
      }
      actions.push({
        label: `$(play) Run: ${commandTitle(commandId)}`,
        runCommandId: commandId,
      });
    }

    if (step.id === "machine-checks") {
      actions.push({
        label: `$(play) Run: ${commandTitle("ftc.setUpComputer")}`,
        description: "Detailed output and copy-ready commands",
        runCommandId: "ftc.setUpComputer",
      });
    }

    const scan = getMachineScan();
    if (
      step.id === "machine-checks" &&
      scan?.installNeeds.machineDepsSatisfied &&
      !isStartHereStepComplete(completed, "machine-checks")
    ) {
      actions.push({
        label: "$(check) Mark step complete",
        description: "Computer setup checks pass",
        markComplete: true,
      });
    } else if (step.allowManualComplete && !isStartHereStepComplete(completed, step.id)) {
      actions.push({
        label: "$(check) Mark step complete",
        description: "I finished this step manually",
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

    if (choice.scanInstall) {
      const s = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: "Checking this computer…" },
        () => scanMachineForStartHere(getWorkspaceRoot),
      );
      setMachineScan(s);
      dock.update({ completed, activeStepId: step.id, machineScan: s });
      await syncStartHereDoc(context, completed, step.id, s);
      if (s.installNeeds.machineDepsSatisfied) {
        vscode.window.showInformationMessage("Nothing missing — Java, SDK, and adb look good.");
        continue;
      }
      await vscode.commands.executeCommand("ftc.runInstallDeps", { source: "start-here" });
      continue;
    }

    if (choice.installMissing) {
      const s = await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: "Scanning…" },
        () => scanMachineForStartHere(getWorkspaceRoot),
      );
      setMachineScan(s);
      dock.update({ completed, activeStepId: step.id, machineScan: s });
      await syncStartHereDoc(context, completed, step.id, s);
      if (s.installTimeEstimateSummary) {
        vscode.window.showInformationMessage(`Setup estimate: ${s.installTimeEstimateSummary}`);
      }
      continue;
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
