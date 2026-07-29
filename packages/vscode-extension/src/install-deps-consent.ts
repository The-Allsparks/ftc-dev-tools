import * as vscode from "vscode";
import {
  analyzeMachineInstallNeeds,
  buildInstallDepsOptionsFromNeeds,
  buildInstallDepsTerminalCommand,
  buildSetUpComputerDoctorOptions,
  describeInstallDepsConsentMessage,
  describeMachineInstallPlan,
  estimateInstallDepsSetupTime,
  findFtcDevToolsRepoRoot,
  installDepsOsForPlatform,
  macPackageArchFromNode,
  OfficialFtcProjectAdapter,
  NodeProcessRunner,
  runDoctor,
  type BuildInstallDepsOptions,
  type MachineInstallNeeds,
} from "@ftc-dev-tools/shared";
import { cacheMachineInstallNeeds, getCachedMachineInstallNeeds } from "./machine-install-cache.js";
import { maybeOfferStartHereMachineComplete } from "./start-here.js";

export interface RunInstallDepsArgs extends BuildInstallDepsOptions {
  source?: string;
  skipOptionsPick?: boolean;
}

async function loadMachineInstallNeeds(
  getWorkspaceRoot?: () => string | undefined,
): Promise<MachineInstallNeeds> {
  const cwd = getWorkspaceRoot?.() ?? process.cwd();
  const cached = getCachedMachineInstallNeeds(cwd);
  if (cached) {
    return cached;
  }
  const runner = new NodeProcessRunner();
  const adapter = new OfficialFtcProjectAdapter();
  const report = await runDoctor({
    ...buildSetUpComputerDoctorOptions(cwd, runner, adapter),
  });
  const needs = analyzeMachineInstallNeeds(report.checks);
  cacheMachineInstallNeeds(cwd, needs);
  return needs;
}

async function resolveInstallPlan(
  args: RunInstallDepsArgs,
  getWorkspaceRoot?: () => string | undefined,
): Promise<{ options: BuildInstallDepsOptions; planLine: string } | undefined> {
  if (args.skipOptionsPick || args.skipJdk !== undefined || args.skipSdk !== undefined) {
    return {
      options: { skipJdk: args.skipJdk === true, skipSdk: args.skipSdk === true },
      planLine: "Using install scope from command options.",
    };
  }

  const needs = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "FTC: Checking what needs to be installed…",
      cancellable: true,
    },
    async (_progress, token) => {
      if (token.isCancellationRequested) {
        return undefined;
      }
      return loadMachineInstallNeeds(getWorkspaceRoot);
    },
  );

  if (!needs) {
    return undefined;
  }
  if (needs.machineDepsSatisfied) {
    vscode.window.showInformationMessage(
      "Environment check: Java, Android SDK, and adb already look good. Nothing to install.",
    );
    return undefined;
  }

  return {
    options: buildInstallDepsOptionsFromNeeds(needs),
    planLine: describeMachineInstallPlan(needs),
  };
}

async function promptPostInstallActions(
  context: vscode.ExtensionContext,
  getWorkspaceRoot?: () => string | undefined,
): Promise<void> {
  const choice = await vscode.window.showInformationMessage(
    "When the installer finishes, reload the window so PATH updates apply, then re-run the environment check.",
    "Reload window",
    "Run environment check",
    "Later",
  );
  if (choice === "Reload window") {
    await vscode.commands.executeCommand("workbench.action.reloadWindow");
  } else if (choice === "Run environment check") {
    await vscode.commands.executeCommand("ftc.runDoctor");
    await maybeOfferStartHereMachineComplete(context, getWorkspaceRoot ?? (() => undefined));
  }
}

export async function runInstallDepsWithConsent(
  output: vscode.OutputChannel,
  context: vscode.ExtensionContext,
  args: RunInstallDepsArgs = {},
  getWorkspaceRoot?: () => string | undefined,
): Promise<void> {
  const os = installDepsOsForPlatform(process.platform);
  if (!os) {
    vscode.window.showErrorMessage("Install-deps is only supported on Windows, macOS, and Linux.");
    return;
  }

  const plan = await resolveInstallPlan(args, getWorkspaceRoot);
  if (!plan) {
    return;
  }

  const { options, planLine } = plan;
  if (options.skipJdk && options.skipSdk) {
    vscode.window.showWarningMessage("Nothing to install for JDK or SDK.");
    return;
  }

  const cwd = getWorkspaceRoot?.() ?? process.cwd();
  const timeEstimate = await estimateInstallDepsSetupTime(os, options, macPackageArchFromNode());
  const repo = findFtcDevToolsRepoRoot(cwd);
  const repoNote = repo
    ? "Using cloned ftc-dev-tools repo scripts (no GitHub script download)."
    : undefined;

  const consentBody = [
    planLine,
    `Estimated setup time: ${timeEstimate.summaryLine}`,
    repoNote,
    describeInstallDepsConsentMessage(os, options),
  ]
    .filter(Boolean)
    .join("\n\n");

  const confirm = await vscode.window.showWarningMessage(
    consentBody,
    { modal: true },
    "Run trusted installer",
    "Cancel",
  );
  if (confirm !== "Run trusted installer") {
    return;
  }

  const command = buildInstallDepsTerminalCommand(os, options, cwd);
  output.appendLine("");
  output.appendLine("FTC: Run install-deps (user confirmed)");
  if (args.source) {
    output.appendLine(`Source: ${args.source}`);
  }
  output.appendLine(planLine);
  output.appendLine(`Time estimate: ${timeEstimate.summaryLine}`);
  if (repo) {
    output.appendLine(`Repo: ${repo}`);
  }
  output.appendLine(`Platform: ${os}`);
  output.appendLine("Full command:");
  output.appendLine(command);
  output.show(true);

  const terminal = vscode.window.createTerminal("FTC install-deps");
  terminal.show();
  terminal.sendText(command, true);

  await promptPostInstallActions(context, getWorkspaceRoot);
}
