import * as vscode from "vscode";
import path from "node:path";
import {
  OfficialFtcProjectAdapter,
  OFFICIAL_FTC_ROBOT_CONTROLLER_GIT_URL,
  buildGitCloneCommand,
  deriveCloneDirectoryName,
  normalizeGitCloneUrl,
} from "@ftc-dev-tools/shared";

type ObtainChoice = "open" | "clone-team" | "clone-official";

export async function obtainOrOpenFtcProjectCommand(output: vscode.OutputChannel): Promise<void> {
  const adapter = new OfficialFtcProjectAdapter();
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (workspaceRoot && (await adapter.detect(workspaceRoot))) {
    const next = await vscode.window.showInformationMessage(
      "This workspace already looks like an official FTC project.",
      "Set Up This FTC Project",
      "Run Environment Check",
      "Close",
    );
    if (next === "Set Up This FTC Project") {
      await vscode.commands.executeCommand("ftc.setUpProject");
    } else if (next === "Run Environment Check") {
      await vscode.commands.executeCommand("ftc.runDoctor");
    }
    return;
  }

  const choice = await vscode.window.showQuickPick<vscode.QuickPickItem & { id: ObtainChoice }>(
    [
      {
        id: "open",
        label: "$(folder-opened) Open a project folder I already have",
        description: "Pick the Android Studio project root (settings.gradle + TeamCode)",
      },
      {
        id: "clone-team",
        label: "$(repo-clone) Clone my team's GitHub repository",
        description: "Uses git in a terminal — you choose where it is saved",
      },
      {
        id: "clone-official",
        label: "$(cloud-download) Clone the official FIRST SDK template",
        description: "FtcRobotController from GitHub (same layout as Android Studio)",
      },
    ],
    {
      title: "FTC: Get or Open FTC Project",
      placeHolder: "How do you want to get your FTC project on this computer?",
    },
  );
  if (!choice) {
    return;
  }

  if (choice.id === "open") {
    await openExistingProjectFolder(output, adapter);
    return;
  }

  const cloneUrl =
    choice.id === "clone-official"
      ? OFFICIAL_FTC_ROBOT_CONTROLLER_GIT_URL
      : await promptTeamCloneUrl();
  if (!cloneUrl) {
    return;
  }
  await cloneProjectInTerminal(output, cloneUrl);
}

async function promptTeamCloneUrl(): Promise<string | undefined> {
  for (;;) {
    const raw = await vscode.window.showInputBox({
      title: "Team repository URL",
      prompt: "Paste an https://github.com/… or git@github.com:… clone URL",
      placeHolder: "https://github.com/my-team/our-robot.git",
      ignoreFocusOut: true,
      validateInput: (value) =>
        normalizeGitCloneUrl(value) ? undefined : "Enter a GitHub https or git@github.com URL",
    });
    if (!raw) {
      return undefined;
    }
    const normalized = normalizeGitCloneUrl(raw);
    if (normalized) {
      return normalized;
    }
  }
}

async function pickParentDirectory(): Promise<string | undefined> {
  const picked = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: "Clone project here",
    title: "Choose where to save the cloned FTC project",
  });
  return picked?.[0]?.fsPath;
}

async function cloneProjectInTerminal(
  output: vscode.OutputChannel,
  cloneUrl: string,
): Promise<void> {
  const parentDir = await pickParentDirectory();
  if (!parentDir) {
    return;
  }
  const dirName = deriveCloneDirectoryName(cloneUrl);
  const clonePath = path.join(parentDir, dirName);
  const command = buildGitCloneCommand(cloneUrl, dirName);

  output.appendLine("");
  output.appendLine("FTC: Get or Open FTC Project — git clone");
  output.appendLine(`  ${command}`);
  output.appendLine(`  Target: ${clonePath}`);
  output.show(true);

  const term = vscode.window.createTerminal({
    name: "FTC: Clone FTC project",
    cwd: parentDir,
  });
  term.show();
  term.sendText(command, true);

  const whenDone = await vscode.window.showInformationMessage(
    `Cloning into ${dirName}. When git finishes, open that folder in VS Code.`,
    "Open cloned project",
    "Later",
  );
  if (whenDone === "Open cloned project") {
    await openAndValidateProject(output, clonePath, new OfficialFtcProjectAdapter());
  }
}

async function openExistingProjectFolder(
  output: vscode.OutputChannel,
  adapter: OfficialFtcProjectAdapter,
): Promise<void> {
  const picked = await vscode.window.showOpenDialog({
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: "Open FTC project",
    title: "Select your FTC Android Studio project folder",
  });
  const folder = picked?.[0]?.fsPath;
  if (!folder) {
    return;
  }
  await openAndValidateProject(output, folder, adapter);
}

async function openAndValidateProject(
  output: vscode.OutputChannel,
  folderPath: string,
  adapter: OfficialFtcProjectAdapter,
): Promise<void> {
  if (!(await adapter.detect(folderPath))) {
    output.appendLine("");
    output.appendLine(`Not an official FTC project layout: ${folderPath}`);
    output.appendLine(
      "Expected settings.gradle (or .kts) and a TeamCode module at the project root.",
    );
    output.show(true);
    vscode.window.showErrorMessage(
      "That folder is not a recognized official FTC project. Pick the root that contains settings.gradle and TeamCode.",
    );
    return;
  }

  const info = await adapter.inspect(folderPath);
  output.appendLine("");
  output.appendLine(`FTC project detected: ${folderPath}`);
  output.appendLine(`  Module: ${info.moduleName}`);
  output.show(true);

  await vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(folderPath), false);

  const setup = await vscode.window.showInformationMessage(
    `Opened FTC project (${info.moduleName}). Apply VS Code tasks and team settings next?`,
    "Set Up This FTC Project",
    "Run Environment Check",
    "Later",
  );
  if (setup === "Set Up This FTC Project") {
    await vscode.commands.executeCommand("ftc.setUpProject");
  } else if (setup === "Run Environment Check") {
    await vscode.commands.executeCommand("ftc.runDoctor");
  }
}
