import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import {
  INSTALL_DEPS_CONTRIBUTOR_COMMANDS,
  INSTALL_WITHOUT_ANDROID_STUDIO_DOCS_URL,
  NodeProcessRunner,
  OfficialFtcProjectAdapter,
  buildDoctorSections,
  buildInstallDepsCommand,
  listCliConsumerInstallCommands,
  fetchLatestCliGitHubRelease,
  formatDoctorCheckLine,
  runDoctor,
  parseJsonStrict,
  mergeExtensionsJson,
  formatJsonFile,
  backupFileBeforeWrite,
  listSetupBackups,
  restoreSetupBackup,
  FTC_PROJECT_RECOMMENDED_EXTENSIONS,
  discoverFtcCliOnPath,
  buildFtcProjectSetupPlans,
  refreshSetupPlanJsonContent,
  buildSetUpComputerDoctorOptions,
  analyzeMachineInstallNeeds,
} from "@ftc-dev-tools/shared";
import { ftcToolProcessEnv } from "./ftc-tool-env.js";
import { cacheMachineInstallNeeds } from "./machine-install-cache.js";

async function readExistingJsonFile(
  filePath: string,
): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  if (!fs.existsSync(filePath)) {
    return { ok: true, value: {} };
  }
  const raw = fs.readFileSync(filePath, "utf8");
  return parseJsonStrict(raw);
}

function refuseInvalidJson(output: vscode.OutputChannel, filePath: string, error: string): void {
  vscode.window.showErrorMessage(
    `Refusing to change ${path.basename(filePath)}: file is not valid JSON (${error}). Fix it manually or restore a backup.`,
  );
  output.appendLine(`Invalid JSON at ${filePath}: ${error}`);
  output.show(true);
}

export async function configureRecommendedExtensionsCommand(
  getWorkspaceRoot: () => string | undefined,
  output: vscode.OutputChannel,
): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage("Open an FTC project folder first.");
    return;
  }

  const vscodeDir = path.join(root, ".vscode");
  const target = path.join(vscodeDir, "extensions.json");
  const parsed = await readExistingJsonFile(target);
  if (!parsed.ok) {
    refuseInvalidJson(output, target, parsed.error);
    return;
  }
  const next = formatJsonFile(mergeExtensionsJson(parsed.value));

  output.clear();
  output.appendLine("FTC: Configure Recommended Extensions — preview");
  output.appendLine(`Target: ${target}`);
  output.appendLine(next);
  output.show(true);

  const confirm = await vscode.window.showWarningMessage(
    `Write recommended extensions to ${path.relative(root, target) || target}? A backup is created when the file already exists.`,
    { modal: true },
    "Write",
    "Cancel",
  );
  if (confirm !== "Write") {
    return;
  }

  await backupFileBeforeWrite(root, target);
  fs.mkdirSync(vscodeDir, { recursive: true });
  fs.writeFileSync(target, next, "utf8");
  vscode.window.showInformationMessage("Wrote .vscode/extensions.json with FTC recommendations.");
}

export async function setUpThisComputerCommand(
  getWorkspaceRoot: () => string | undefined,
  output: vscode.OutputChannel,
): Promise<void> {
  const runner = new NodeProcessRunner();
  const adapter = new OfficialFtcProjectAdapter();
  const cwd = getWorkspaceRoot() ?? process.cwd();

  output.clear();
  output.appendLine("FTC: Set Up This Computer");
  output.appendLine("Running non-destructive environment detection (doctor)…");
  output.show(true);

  const report = await runDoctor({
    ...buildSetUpComputerDoctorOptions(cwd, runner, adapter),
    env: ftcToolProcessEnv(),
  });

  for (const section of buildDoctorSections(report)) {
    output.appendLine("");
    output.appendLine(section.title);
    for (const check of section.checks) {
      output.appendLine(`  ${formatDoctorCheckLine(check)} [${check.status}]`);
    }
  }
  output.appendLine(report.summaryLine);
  output.appendLine("");
  output.appendLine("FTC Dev Tools will not silently install system software.");
  output.appendLine("Required: JDK for your FTC season, Android platform-tools (adb).");
  output.appendLine("Optional: Android Studio, dual-NIC Wi-Fi tooling, Control Hub OS helpers.");
  output.appendLine("Trusted install paths (re-run this command after each step):");
  output.appendLine("");
  output.appendLine("Extension / VSIX install (no ftc-dev-tools repo clone):");
  output.appendLine(
    "Run the command for your OS in PowerShell or a terminal. Each downloads the installer script",
  );
  output.appendLine(
    "and scripts/android-cmdline-tools.json into the same folder (required by the script).",
  );
  output.appendLine(`Guide: ${INSTALL_WITHOUT_ANDROID_STUDIO_DOCS_URL}`);
  output.appendLine("");
  output.appendLine("Windows (PowerShell):");
  output.appendLine(buildInstallDepsCommand("windows"));
  output.appendLine("");
  output.appendLine("macOS (bash):");
  output.appendLine(buildInstallDepsCommand("macos"));
  output.appendLine("");
  output.appendLine("Linux (bash):");
  output.appendLine(buildInstallDepsCommand("linux"));
  output.appendLine("");
  output.appendLine("Contributors with a cloned ftc-dev-tools repo (from repo root):");
  output.appendLine(`- Windows: ${INSTALL_DEPS_CONTRIBUTOR_COMMANDS.windows}`);
  output.appendLine(`- macOS: ${INSTALL_DEPS_CONTRIBUTOR_COMMANDS.macos}`);
  output.appendLine(`- Linux: ${INSTALL_DEPS_CONTRIBUTOR_COMMANDS.linux}`);

  const installNeeds = analyzeMachineInstallNeeds(report.checks);
  cacheMachineInstallNeeds(cwd, installNeeds);

  const missing = report.checks.filter((c) => c.status === "fail" || c.status === "warn");
  const summary =
    missing.length === 0
      ? "Readiness: no failing/warning doctor checks in this workspace context."
      : `Readiness: ${missing.length} check(s) need attention (see FTC Dev Tools output).`;

  const actions: string[] = [];
  if (!installNeeds.machineDepsSatisfied) {
    actions.push("Run trusted installer…");
  }
  actions.push(
    "Copy Windows install command",
    "Copy macOS install command",
    "Copy Linux install command",
    "Open install guide",
  );

  const copyAction = await vscode.window.showInformationMessage(summary, ...actions);
  if (copyAction === "Run trusted installer…") {
    await vscode.commands.executeCommand("ftc.runInstallDeps", { source: "set-up-computer" });
  } else if (copyAction === "Copy Windows install command") {
    await vscode.env.clipboard.writeText(buildInstallDepsCommand("windows"));
    vscode.window.showInformationMessage("Copied Windows install command to clipboard.");
  } else if (copyAction === "Copy macOS install command") {
    await vscode.env.clipboard.writeText(buildInstallDepsCommand("macos"));
    vscode.window.showInformationMessage("Copied macOS install command to clipboard.");
  } else if (copyAction === "Copy Linux install command") {
    await vscode.env.clipboard.writeText(buildInstallDepsCommand("linux"));
    vscode.window.showInformationMessage("Copied Linux install command to clipboard.");
  } else if (copyAction === "Open install guide") {
    await vscode.env.openExternal(vscode.Uri.parse(INSTALL_WITHOUT_ANDROID_STUDIO_DOCS_URL));
  }
}

export async function setUpThisFtcProjectCommand(
  getWorkspaceRoot: () => string | undefined,
  output: vscode.OutputChannel,
): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage("Open an FTC project folder first.");
    return;
  }

  const readIfExists = (filePath: string): string | null =>
    fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;

  const cliDiscovery = await discoverFtcCliOnPath(new NodeProcessRunner());
  const tasksMode = cliDiscovery.found ? "cli" : "extension";

  const planResult = buildFtcProjectSetupPlans({
    projectRoot: root,
    tasksMode,
    cliOnPath: cliDiscovery.found,
    ftcDevJson: readIfExists(path.join(root, ".ftc-dev.json")),
    extensionsJson: readIfExists(path.join(root, ".vscode", "extensions.json")),
    settingsJson: readIfExists(path.join(root, ".vscode", "settings.json")),
    tasksJson: readIfExists(path.join(root, ".vscode", "tasks.json")),
  });

  if (!planResult.ok) {
    refuseInvalidJson(output, planResult.invalidPath, planResult.error);
    return;
  }

  const plans = planResult.plans;

  output.clear();
  output.appendLine("FTC: Set Up This FTC Project — preview (nothing written yet)");
  for (const plan of plans) {
    output.appendLine("");
    output.appendLine(`## ${plan.description}`);
    output.appendLine(plan.path);
    output.appendLine(plan.content);
  }
  output.show(true);

  const confirm = await vscode.window.showWarningMessage(
    `Write ${plans.length} project setup file change(s)? Existing JSON files are backed up under .ftc-dev-tools/backups/setup/.`,
    { modal: true },
    "Write",
    "Cancel",
  );
  if (confirm !== "Write") {
    return;
  }

  for (const plan of plans) {
    if (plan.path.endsWith("extensions.json") || plan.path.endsWith("settings.json")) {
      const parsed = await readExistingJsonFile(plan.path);
      if (!parsed.ok) {
        refuseInvalidJson(output, plan.path, parsed.error);
        return;
      }
      const refreshed = refreshSetupPlanJsonContent(plan.path, parsed.value);
      if (refreshed !== undefined) {
        plan.content = refreshed;
      }
    }

    await backupFileBeforeWrite(root, plan.path);
    fs.mkdirSync(path.dirname(plan.path), { recursive: true });
    fs.writeFileSync(plan.path, plan.content, "utf8");
  }

  vscode.window.showInformationMessage(
    "FTC project setup files written. Install the Java Extension Pack (recommended in extensions.json) for editing.",
  );
}

export async function restoreProjectSetupCommand(
  getWorkspaceRoot: () => string | undefined,
  output: vscode.OutputChannel,
): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showErrorMessage("Open an FTC project folder first.");
    return;
  }

  const backups = await listSetupBackups(root);
  if (backups.length === 0) {
    vscode.window.showInformationMessage("No project setup backups found.");
    return;
  }

  const pick = await vscode.window.showQuickPick(
    backups.map((b) => ({
      label: b.id,
      description: `${b.files.length} file(s) — ${b.createdAt}`,
      backup: b,
    })),
    { placeHolder: "Select a setup backup to restore" },
  );
  if (!pick) {
    return;
  }

  const confirm = await vscode.window.showWarningMessage(
    `Restore ${pick.backup.files.length} file(s) from backup ${pick.label}? This overwrites current files.`,
    { modal: true },
    "Restore",
    "Cancel",
  );
  if (confirm !== "Restore") {
    return;
  }

  const result = await restoreSetupBackup(root, pick.label);
  output.clear();
  output.appendLine(result.message);
  for (const p of result.restoredPaths) {
    output.appendLine(`  ${p}`);
  }
  output.show(true);
  vscode.window.showInformationMessage(result.message);
}

export async function installFtcCliCommand(output: vscode.OutputChannel): Promise<void> {
  const discovery = await discoverFtcCliOnPath(new NodeProcessRunner());
  if (discovery.found) {
    const again = await vscode.window.showInformationMessage(
      `FTC CLI is already on PATH${discovery.ftcPath ? ` (${discovery.ftcPath})` : ""}.`,
      "Show install options",
      "Cancel",
    );
    if (again !== "Show install options") {
      return;
    }
  }

  let options = listCliConsumerInstallCommands();
  let latestReleaseNote: string | undefined;
  try {
    const latest = await fetchLatestCliGitHubRelease();
    options = listCliConsumerInstallCommands(undefined, process.platform, {
      version: latest.version,
      tarballUrl: latest.tarballUrl,
    });
    latestReleaseNote = `Resolved latest release: ${latest.tagName} (${latest.assetName})`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    latestReleaseNote = `Could not resolve latest GitHub Release (${message}). Using bundled version fallback.`;
  }

  output.clear();
  output.appendLine("FTC: Install FTC CLI — preview");
  output.appendLine("");
  if (latestReleaseNote) {
    output.appendLine(latestReleaseNote);
    output.appendLine("");
  }
  output.appendLine("The extension does not install the CLI automatically.");
  output.appendLine("Pick an option below after reviewing these commands.");
  output.appendLine("");
  for (const option of options) {
    output.appendLine(`## ${option.label}`);
    if (option.notes) {
      output.appendLine(option.notes);
    }
    output.appendLine(option.command);
    output.appendLine("");
  }
  output.appendLine("Docs: docs/cli-install.md");
  output.show(true);

  const primary = options[0]?.command;
  if (!primary) {
    vscode.window.showErrorMessage("No install commands are configured.");
    return;
  }

  const choice = await vscode.window.showWarningMessage(
    "Install the ftc CLI globally? You must run the command yourself in a terminal.",
    { modal: true },
    "Copy install command",
    "Open terminal with command",
    "Cancel",
  );

  if (choice === "Copy install command") {
    await vscode.env.clipboard.writeText(primary);
    vscode.window.showInformationMessage("Copied GitHub Release install command to clipboard.");
    return;
  }

  if (choice === "Open terminal with command") {
    const term = vscode.window.createTerminal({ name: "FTC CLI install" });
    term.show();
    term.sendText(primary, true);
    vscode.window.showInformationMessage(
      "Sent install command to terminal — review and press Enter to run.",
    );
  }
}

export { FTC_PROJECT_RECOMMENDED_EXTENSIONS };
