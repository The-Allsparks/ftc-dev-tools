import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { NodeProcessRunner, OfficialFtcProjectAdapter, runDoctor, listCliConsumerInstallCommands } from "@ftc-dev-tools/shared";

const FTC_PROJECT_RECOMMENDED_EXTENSIONS = [
  "vscjava.vscode-java-pack",
  "vscjava.vscode-java-test",
  "redhat.vscode-xml",
];

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
  let existing: { recommendations?: string[] } = {};
  if (fs.existsSync(target)) {
    try {
      existing = JSON.parse(fs.readFileSync(target, "utf8")) as { recommendations?: string[] };
    } catch {
      existing = {};
    }
  }
  const merged = [
    ...new Set([...(existing.recommendations ?? []), ...FTC_PROJECT_RECOMMENDED_EXTENSIONS]),
  ].sort();
  const next = `${JSON.stringify({ recommendations: merged }, null, 2)}\n`;

  output.clear();
  output.appendLine("FTC: Configure Recommended Extensions — preview");
  output.appendLine(`Target: ${target}`);
  output.appendLine(next);
  output.show(true);

  const confirm = await vscode.window.showWarningMessage(
    `Write recommended extensions to ${path.relative(root, target) || target}?`,
    { modal: true },
    "Write",
    "Cancel",
  );
  if (confirm !== "Write") {
    return;
  }

  fs.mkdirSync(vscodeDir, { recursive: true });
  fs.writeFileSync(target, next, "utf8");
  vscode.window.showInformationMessage("Wrote .vscode/extensions.json with FTC recommendations.");
}

export async function setUpThisComputerCommand(output: vscode.OutputChannel): Promise<void> {
  const runner = new NodeProcessRunner();
  const adapter = new OfficialFtcProjectAdapter();
  const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();

  output.clear();
  output.appendLine("FTC: Set Up This Computer");
  output.appendLine("Running non-destructive environment detection (doctor)…");
  output.show(true);

  const report = await runDoctor({
    cwd,
    runner,
    projectAdapter: adapter,
    checkWifi: false,
  });

  for (const check of report.checks) {
    output.appendLine(
      `[${check.status}] ${check.id}: ${check.label}${check.detail ? ` — ${check.detail}` : ""}`,
    );
  }
  output.appendLine(report.summaryLine);
  output.appendLine("");
  output.appendLine("FTC Dev Tools will not silently install system software.");
  output.appendLine("Required: JDK for your FTC season, Android platform-tools (adb).");
  output.appendLine("Optional: Android Studio, dual-NIC Wi-Fi tooling, Control Hub OS helpers.");
  output.appendLine("Trusted install paths (re-run this command after each step):");
  output.appendLine("- Windows: npm run install-deps:windows");
  output.appendLine("- macOS: npm run install-deps:macos");
  output.appendLine("- Linux: npm run install-deps:linux");
  output.appendLine("- Docs: docs/install-without-android-studio.md");

  const missing = report.checks.filter((c) => c.status === "fail" || c.status === "warn");
  const summary =
    missing.length === 0
      ? "Readiness: no failing/warning doctor checks in this workspace context."
      : `Readiness: ${missing.length} check(s) need attention (see FTC Dev Tools output).`;
  vscode.window.showInformationMessage(summary);
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

  const plans: Array<{ path: string; content: string; description: string }> = [];

  const configPath = path.join(root, ".ftc-dev.json");
  if (!fs.existsSync(configPath)) {
    plans.push({
      path: configPath,
      description: "Create .ftc-dev.json (no device serials)",
      content: `${JSON.stringify(
        {
          $schema:
            "https://raw.githubusercontent.com/The-Allsparks/ftc-dev-tools/main/packages/shared/schemas/ftc-dev.schema.json",
          module: "TeamCode",
          deployment: {
            preferredConnection: "any",
          },
          logs: {
            defaultFilter: "teamcode",
          },
        },
        null,
        2,
      )}\n`,
    });
  }

  const extensionsPath = path.join(root, ".vscode", "extensions.json");
  plans.push({
    path: extensionsPath,
    description: "Add/merge .vscode/extensions.json recommendations",
    content: `${JSON.stringify({ recommendations: FTC_PROJECT_RECOMMENDED_EXTENSIONS }, null, 2)}\n`,
  });

  const settingsPath = path.join(root, ".vscode", "settings.json");
  let settings: Record<string, unknown> = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, "utf8")) as Record<string, unknown>;
    } catch {
      settings = {};
    }
  }
  const nextSettings: Record<string, unknown> = {
    ...settings,
    "java.configuration.updateBuildConfiguration":
      settings["java.configuration.updateBuildConfiguration"] ?? "automatic",
    "files.exclude": {
      ...((settings["files.exclude"] as Record<string, unknown> | undefined) ?? {}),
      "**/.gradle": true,
      "**/build": true,
    },
  };
  delete nextSettings["ftc.preferredDeviceSerial"];
  plans.push({
    path: settingsPath,
    description: "Add safe shared workspace settings (no device serials)",
    content: `${JSON.stringify(nextSettings, null, 2)}\n`,
  });

  const tasksPath = path.join(root, ".vscode", "tasks.json");
  if (!fs.existsSync(tasksPath)) {
    plans.push({
      path: tasksPath,
      description: "Create FTC helper tasks file",
      content: `${JSON.stringify(
        {
          version: "2.0.0",
          tasks: [
            {
              label: "FTC: Remind — use Command Palette Build",
              type: "shell",
              command:
                "echo Use Command Palette: FTC Build Robot Code (or ftc build in a terminal)",
              problemMatcher: [],
            },
          ],
        },
        null,
        2,
      )}\n`,
    });
  }

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
    `Write ${plans.length} project setup file change(s)? Review the FTC Dev Tools output preview first.`,
    { modal: true },
    "Write",
    "Cancel",
  );
  if (confirm !== "Write") {
    return;
  }

  for (const plan of plans) {
    fs.mkdirSync(path.dirname(plan.path), { recursive: true });
    if (plan.path.endsWith("extensions.json") && fs.existsSync(plan.path)) {
      let existing: { recommendations?: string[] } = {};
      try {
        existing = JSON.parse(fs.readFileSync(plan.path, "utf8")) as {
          recommendations?: string[];
        };
      } catch {
        existing = {};
      }
      const merged = [
        ...new Set([...(existing.recommendations ?? []), ...FTC_PROJECT_RECOMMENDED_EXTENSIONS]),
      ].sort();
      fs.writeFileSync(
        plan.path,
        `${JSON.stringify({ recommendations: merged }, null, 2)}\n`,
        "utf8",
      );
    } else {
      fs.writeFileSync(plan.path, plan.content, "utf8");
    }
  }

  vscode.window.showInformationMessage(
    "FTC project setup files written. Prefer Java Extension Pack for editing.",
  );
}

export async function installFtcCliCommand(output: vscode.OutputChannel): Promise<void> {
  const options = listCliConsumerInstallCommands();

  output.clear();
  output.appendLine("FTC: Install FTC CLI — preview");
  output.appendLine("");
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
