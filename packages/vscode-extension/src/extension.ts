import * as vscode from "vscode";
import {
  AdbDeviceProvider,
  ConsoleLogger,
  NodeProcessRunner,
  OfficialFtcProjectAdapter,
  applySdkUpdate,
  buildProject,
  checkSdkStatus,
  cleanProject,
  connectWifiAdb,
  disconnectWifiAdb,
  deployProject,
  discoverAdb,
  ensureRobotRoute,
  getHubWifiSettings,
  getWifiStatus,
  interpretFromUnknown,
  joinRobotWifi,
  listNetworkInterfaces,
  loadProjectConfig,
  openRobotConsole,
  preferInternetInterface,
  preferRobotInterface,
  applyHubOsUpdate,
  checkHubUpdate,
  downloadHubOsUpdate,
  getHubStatus,
  addPedroPathing,
  detectPedroStatus,
  scaffoldPedroPathing,
  createOpMode,
  listOpModes,
  listRobotConfigs,
  pullRobotConfigs,
  showRobotConfig,
  validateRobotConfig,
  showHardwareMap,
  codegenHardwareMapOpMode,
  runDoctor,
  selectDeploymentDevice,
  setAdapterAdminState,
  setHubWifiSettings,
  setRobotNetworkInterface,
  formatLogEntry,
} from "@ftc-dev-tools/shared";
import type {
  AndroidDevice,
  DeviceProvider,
  FriendlyError,
  SdkStatusReport,
  WifiStatusReport,
} from "@ftc-dev-tools/shared";
import { FtcRobotTreeProvider } from "./views/robot-tree.js";
import { StatusController } from "./status-controller.js";
import {
  configureRecommendedExtensionsCommand,
  restoreProjectSetupCommand,
  setUpThisComputerCommand,
  setUpThisFtcProjectCommand,
} from "./setup-commands.js";
import {
  getWorkspaceRoot,
  initWorkspaceRoot,
  selectFtcProjectRootCommand,
} from "./workspace-root.js";

let output: vscode.OutputChannel;
let status: StatusController;
let tree: FtcRobotTreeProvider;
let selectedSerial: string | undefined;
let logStreamController: AbortController | undefined;
let cachedSdkStatus: SdkStatusReport | undefined;
let cachedSdkStatusAt = 0;
let cachedWifiStatus: WifiStatusReport | undefined;
let cachedWifiStatusAt = 0;
const SDK_STATUS_TTL_MS = 60_000;
const WIFI_STATUS_TTL_MS = 60_000;

export function activate(context: vscode.ExtensionContext): void {
  output = vscode.window.createOutputChannel("FTC Dev Tools");
  status = new StatusController();
  initWorkspaceRoot(context);
  tree = new FtcRobotTreeProvider(
    () => getWorkspaceRoot(),
    () => selectedSerial,
    () => cachedSdkStatus,
    () => cachedWifiStatus,
  );

  context.subscriptions.push(output, status, {
    dispose: () => {
      logStreamController?.abort();
      logStreamController = undefined;
    },
  });

  const robotView = vscode.window.createTreeView("ftc.robotView", {
    treeDataProvider: tree,
  });
  context.subscriptions.push(robotView);

  let pollInterval: ReturnType<typeof setInterval> | undefined;
  const startPolling = (): void => {
    if (pollInterval) {
      return;
    }
    pollInterval = setInterval(() => {
      void refreshStatus();
    }, 15_000);
  };
  const stopPolling = (): void => {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = undefined;
    }
  };
  context.subscriptions.push({
    dispose: () => stopPolling(),
  });
  context.subscriptions.push(
    robotView.onDidChangeVisibility((event) => {
      if (event.visible) {
        void refreshStatus();
        startPolling();
      } else {
        stopPolling();
      }
    }),
  );
  if (robotView.visible) {
    void refreshStatus();
    startPolling();
  }

  const register = (command: string, handler: () => Promise<void>): void => {
    context.subscriptions.push(
      vscode.commands.registerCommand(command, async () => {
        try {
          await handler();
        } catch (error) {
          await showFriendlyError(interpretFromUnknown(error));
        }
      }),
    );
  };

  register("ftc.runDoctor", runDoctorCommand);
  register("ftc.showDevices", showDevicesCommand);
  register("ftc.build", buildCommand);
  register("ftc.deploy", () => deployCommand(false));
  register("ftc.buildAndDeploy", () => deployCommand(false));
  register("ftc.selectDevice", selectDeviceCommand);
  register("ftc.viewLogs", () => viewLogsCommand("teamcode"));
  register("ftc.viewErrorLogs", () => viewLogsCommand("errors"));
  register("ftc.stopLogs", stopLogsCommand);
  register("ftc.clean", cleanCommand);
  register("ftc.checkSdk", checkSdkCommand);
  register("ftc.updateSdk", updateSdkCommand);
  register("ftc.wifiStatus", wifiStatusCommand);
  register("ftc.wifiSelectInterface", wifiSelectInterfaceCommand);
  register("ftc.wifiEnsureRoute", wifiEnsureRouteCommand);
  register("ftc.wifiConnect", wifiConnectCommand);
  register("ftc.wifiDisconnect", wifiDisconnectCommand);
  register("ftc.wifiOpenConsole", wifiOpenConsoleCommand);
  register("ftc.wifiJoin", wifiJoinCommand);
  register("ftc.wifiManageGet", wifiManageGetCommand);
  register("ftc.wifiManageSet", wifiManageSetCommand);
  register("ftc.wifiPreferInternet", wifiPreferInternetCommand);
  register("ftc.wifiPreferRobot", wifiPreferRobotCommand);
  register("ftc.wifiAdapterEnable", () => wifiAdapterCommand("enable"));
  register("ftc.wifiAdapterDisable", () => wifiAdapterCommand("disable"));
  register("ftc.hubStatus", hubStatusCommand);
  register("ftc.hubUpdateCheck", hubUpdateCheckCommand);
  register("ftc.hubUpdateDownload", hubUpdateDownloadCommand);
  register("ftc.hubUpdateApply", hubUpdateApplyCommand);
  register("ftc.pedroStatus", pedroStatusCommand);
  register("ftc.pedroAdd", pedroAddCommand);
  register("ftc.pedroScaffold", pedroScaffoldCommand);
  register("ftc.opmodeList", opmodeListCommand);
  register("ftc.opmodeCreate", opmodeCreateCommand);
  register("ftc.configList", configListCommand);
  register("ftc.configShow", configShowCommand);
  register("ftc.configValidate", configValidateCommand);
  register("ftc.configPull", configPullCommand);
  register("ftc.hwmapShow", hwmapShowCommand);
  register("ftc.hwmapCodegen", hwmapCodegenCommand);
  register("ftc.configureRecommendedExtensions", () =>
    configureRecommendedExtensionsCommand(getWorkspaceRoot, output),
  );
  register("ftc.setUpComputer", () => setUpThisComputerCommand(getWorkspaceRoot, output));
  register("ftc.setUpProject", () => setUpThisFtcProjectCommand(getWorkspaceRoot, output));
  register("ftc.restoreProjectSetup", () => restoreProjectSetupCommand(getWorkspaceRoot, output));
  register("ftc.selectProjectRoot", () => selectFtcProjectRootCommand(context));
  register("ftc.openTechnicalOutput", async () => {
    output.show(true);
  });
  register("ftc.refreshView", async () => {
    await refreshStatus();
    tree.refresh();
  });
}

export function deactivate(): void {
  // disposables handled by context
}

async function createDeviceProvider(): Promise<DeviceProvider> {
  const runner = new NodeProcessRunner();
  const adb = await discoverAdb(runner);
  if (!adb.found || !adb.adbPath) {
    throw Object.assign(new Error("adb not found"), { code: "ADB_NOT_FOUND" });
  }
  return new AdbDeviceProvider(runner, adb.adbPath);
}

async function runDoctorCommand(): Promise<void> {
  const root = requireRoot();
  const runner = new NodeProcessRunner();
  const adapter = new OfficialFtcProjectAdapter();
  let devices: DeviceProvider | undefined;
  try {
    devices = await createDeviceProvider();
  } catch {
    devices = undefined;
  }
  const report = await runDoctor({
    cwd: root,
    runner,
    projectAdapter: adapter,
    deviceProvider: devices,
  });
  output.clear();
  output.appendLine("FTC Development Check");
  for (const check of report.checks) {
    output.appendLine(
      `${check.status.toUpperCase()}: ${check.label}${check.detail ? ` (${check.detail})` : ""}`,
    );
  }
  output.appendLine(report.summaryLine);
  output.show(true);
  if (!report.ready) {
    status.setState("build-failed");
    const failed = report.checks.find((check) => check.status === "fail" && check.friendlyError);
    if (failed?.friendlyError) {
      await showFriendlyError(failed.friendlyError);
    }
  } else {
    vscode.window.showInformationMessage("FTC environment looks ready.");
    await refreshStatus();
  }
}

async function showDevicesCommand(): Promise<void> {
  const provider = await createDeviceProvider();
  const devices = await provider.listDevices();
  output.clear();
  if (devices.length === 0) {
    output.appendLine("No Android devices found.");
    status.setState("no-device");
  } else {
    for (const device of devices) {
      output.appendLine(formatDevice(device));
    }
  }
  output.show(true);
  await refreshStatus();
}

async function buildCommand(): Promise<void> {
  const root = requireRoot();
  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "FTC: Building…", cancellable: true },
    async (_progress, token) => {
      const controller = new AbortController();
      token.onCancellationRequested(() => controller.abort());
      const outcome = await buildProject({
        adapter: new OfficialFtcProjectAdapter(),
        runner: new NodeProcessRunner(),
        logger: new ConsoleLogger("info", (line) => output.appendLine(line)),
        cwd: root,
        verbose: false,
        signal: controller.signal,
      });
      appendBuildOutput(outcome.result.stdout, outcome.result.stderr);
      if (!outcome.result.success) {
        status.setState("build-failed");
        if (outcome.friendlyError) {
          await showFriendlyError(outcome.friendlyError);
        }
        return;
      }
      vscode.window.showInformationMessage(`Build succeeded: ${outcome.result.apkPath}`);
      await refreshStatus();
    },
  );
}

async function deployCommand(dryRun: boolean): Promise<void> {
  const root = requireRoot();
  status.setState("deploying");
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: dryRun ? "FTC: Deploy dry run…" : "FTC: Deploying…",
      cancellable: true,
    },
    async (_progress, token) => {
      const controller = new AbortController();
      token.onCancellationRequested(() => controller.abort());
      const preferred =
        selectedSerial ||
        vscode.workspace.getConfiguration("ftc").get<string>("preferredDeviceSerial") ||
        undefined;
      const outcome = await deployProject({
        adapter: new OfficialFtcProjectAdapter(),
        runner: new NodeProcessRunner(),
        devices: await createDeviceProvider(),
        logger: new ConsoleLogger("info", (line) => output.appendLine(line)),
        cwd: root,
        deviceSerial: preferred,
        dryRun,
        signal: controller.signal,
      });
      for (const step of outcome.result.steps) {
        output.appendLine(step);
      }
      output.appendLine(outcome.result.message);
      if (!outcome.result.success) {
        status.setState("build-failed");
        if (outcome.friendlyError) {
          await showFriendlyError(outcome.friendlyError);
        }
        return;
      }
      vscode.window.showInformationMessage(outcome.result.message);
      await refreshStatus();
    },
  );
}

async function selectDeviceCommand(): Promise<void> {
  const provider = await createDeviceProvider();
  const devices = await provider.listDevices();
  if (devices.length === 0) {
    status.setState("no-device");
    vscode.window.showWarningMessage("No Android devices found.");
    return;
  }
  const picked = await vscode.window.showQuickPick(
    devices.map((device) => ({
      label: device.serial,
      description: [device.model, device.state, device.connectionType].filter(Boolean).join(" · "),
      detail:
        device.controlHubLikelihood === "probable"
          ? "Probable REV Control Hub (not guaranteed)"
          : undefined,
      device,
    })),
    { placeHolder: "Select deployment device" },
  );
  if (!picked) {
    return;
  }
  selectedSerial = picked.device.serial;
  await vscode.workspace
    .getConfiguration("ftc")
    .update("preferredDeviceSerial", selectedSerial, vscode.ConfigurationTarget.Workspace);
  vscode.window.showInformationMessage(`Selected device ${selectedSerial}`);
  tree.refresh();
  await refreshStatus();
}

async function viewLogsCommand(filter: "teamcode" | "errors"): Promise<void> {
  stopActiveLogStream("Restarting log stream…");
  const provider = await createDeviceProvider();
  const devices = await provider.listDevices();
  const root = getWorkspaceRoot();
  const config = root ? await loadProjectConfig(root) : undefined;
  const selection = selectDeploymentDevice({
    devices,
    explicitSerial: selectedSerial,
    preferredSerial:
      vscode.workspace.getConfiguration("ftc").get<string>("preferredDeviceSerial") ||
      config?.config.deployment?.preferredDeviceSerial ||
      undefined,
    preferredConnection: config?.config.deployment?.preferredConnection ?? "any",
  });
  if (!selection.ok) {
    throw Object.assign(new Error(selection.message), { code: selection.code });
  }

  const controller = new AbortController();
  logStreamController = controller;
  output.clear();
  output.appendLine(
    `Streaming ${filter} logs from ${selection.device.serial}. Run "FTC: Stop Robot Logs" to cancel.`,
  );
  output.show(true);

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `FTC: Streaming ${filter} logs…`,
      cancellable: true,
    },
    async (_progress, token) => {
      token.onCancellationRequested(() => {
        stopActiveLogStream("Log streaming cancelled.");
      });
      try {
        for await (const entry of provider.streamLogs(selection.device, {
          filter,
          signal: controller.signal,
        })) {
          if (controller.signal.aborted || token.isCancellationRequested) {
            break;
          }
          output.appendLine(formatLogEntry(entry, false));
        }
        if (!controller.signal.aborted) {
          output.appendLine("Log stream ended.");
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        output.appendLine("Device connection lost while streaming logs.");
        output.appendLine(
          "Reconnect the device, then run FTC: Show Devices and FTC: View Robot Logs.",
        );
        await showFriendlyError(interpretFromUnknown(error));
      } finally {
        if (logStreamController === controller) {
          logStreamController = undefined;
        }
      }
    },
  );
}

async function stopLogsCommand(): Promise<void> {
  if (!logStreamController) {
    vscode.window.showInformationMessage("No FTC log stream is running.");
    return;
  }
  stopActiveLogStream("Log streaming stopped.");
  vscode.window.showInformationMessage("Stopped FTC robot logs.");
}

function stopActiveLogStream(message: string): void {
  if (!logStreamController) {
    return;
  }
  logStreamController.abort();
  logStreamController = undefined;
  output.appendLine(message);
}

async function cleanCommand(): Promise<void> {
  const root = requireRoot();
  const outcome = await cleanProject({
    adapter: new OfficialFtcProjectAdapter(),
    runner: new NodeProcessRunner(),
    logger: new ConsoleLogger("info", (line) => output.appendLine(line)),
    cwd: root,
  });
  if (!outcome.result.success) {
    if (outcome.friendlyError) {
      await showFriendlyError(outcome.friendlyError);
    }
    return;
  }
  vscode.window.showInformationMessage("Gradle clean completed.");
}

async function checkSdkCommand(): Promise<void> {
  const root = requireRoot();
  const report = await checkSdkStatus({ projectRoot: root });
  cachedSdkStatus = report;
  cachedSdkStatusAt = Date.now();
  output.clear();
  output.appendLine("FTC SDK Check");
  output.appendLine(`Local:  ${report.local.version ?? "(unknown)"}`);
  if (report.remote) {
    output.appendLine(`Remote: ${report.remote.version} (${report.remote.tagName})`);
    output.appendLine(`URL:    ${report.remote.htmlUrl}`);
  }
  output.appendLine(`Status: ${report.freshness}`);
  output.appendLine(report.message);
  output.show(true);
  tree.refresh();

  if (report.freshness === "behind") {
    const action = await vscode.window.showWarningMessage(
      report.message,
      "Update FTC SDK",
      "Open Technical Output",
    );
    if (action === "Update FTC SDK") {
      await updateSdkCommand();
    } else if (action === "Open Technical Output") {
      output.show(true);
    }
    return;
  }
  if (report.error && report.freshness === "unknown") {
    await showFriendlyError(report.error);
    return;
  }
  vscode.window.showInformationMessage(report.message);
}

async function updateSdkCommand(): Promise<void> {
  const root = requireRoot();
  const dry = await applySdkUpdate({
    projectRoot: root,
    runner: new NodeProcessRunner(),
    dryRun: true,
    yes: true,
  });
  if (!dry.success) {
    if (dry.error) {
      await showFriendlyError(dry.error);
    } else {
      vscode.window.showErrorMessage(dry.message);
    }
    return;
  }

  const toApply =
    dry.plan?.entries.filter((e) => e.action === "add" || e.action === "overwrite") ?? [];
  const summary = [
    dry.message,
    "",
    ...toApply.map((e) => `[${e.action}] ${e.relativePath}`),
    "",
    "TeamCode will not be modified. A backup is written under .ftc-dev-tools/backups/.",
  ].join("\n");

  output.clear();
  output.appendLine(summary);
  output.show(true);

  const confirm = await vscode.window.showWarningMessage(
    `Update FTC SDK to ${dry.plan?.targetTag ?? "latest"}? ${toApply.length} path(s) will change. TeamCode is preserved.`,
    { modal: true },
    "Update",
    "Cancel",
  );
  if (confirm !== "Update") {
    return;
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "FTC: Updating SDK…",
      cancellable: true,
    },
    async (_progress, token) => {
      const controller = new AbortController();
      token.onCancellationRequested(() => controller.abort());
      const result = await applySdkUpdate({
        projectRoot: root,
        runner: new NodeProcessRunner(),
        yes: true,
        signal: controller.signal,
      });
      output.appendLine(result.message);
      if (!result.success) {
        if (result.error) {
          await showFriendlyError(result.error);
        }
        return;
      }
      cachedSdkStatus = undefined;
      cachedSdkStatusAt = 0;
      vscode.window.showInformationMessage(result.message);
      await refreshSdkStatus(true);
      tree.refresh();
    },
  );
}

async function refreshSdkStatus(force = false): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    cachedSdkStatus = undefined;
    return;
  }
  if (!force && cachedSdkStatus && Date.now() - cachedSdkStatusAt < SDK_STATUS_TTL_MS) {
    return;
  }
  try {
    cachedSdkStatus = await checkSdkStatus({ projectRoot: root });
    cachedSdkStatusAt = Date.now();
  } catch {
    // keep previous cache on transient failures
  }
}

async function refreshWifiStatus(force = false): Promise<void> {
  if (!force && cachedWifiStatus && Date.now() - cachedWifiStatusAt < WIFI_STATUS_TTL_MS) {
    return;
  }
  try {
    const runner = new NodeProcessRunner();
    let deviceProvider: DeviceProvider | undefined;
    try {
      deviceProvider = await createDeviceProvider();
    } catch {
      deviceProvider = undefined;
    }
    cachedWifiStatus = await getWifiStatus({ runner, deviceProvider });
    cachedWifiStatusAt = Date.now();
  } catch {
    // keep previous cache on transient failures
  }
}

async function wifiStatusCommand(): Promise<void> {
  const runner = new NodeProcessRunner();
  let deviceProvider: DeviceProvider | undefined;
  try {
    deviceProvider = await createDeviceProvider();
  } catch {
    deviceProvider = undefined;
  }
  const report = await getWifiStatus({ runner, deviceProvider });
  cachedWifiStatus = report;
  cachedWifiStatusAt = Date.now();
  output.clear();
  output.appendLine("FTC Wi-Fi Status");
  output.appendLine(report.message);
  output.appendLine(
    `Console: ${report.console.url} (${report.console.reachable ? "reachable" : "unreachable"})`,
  );
  if (report.selectedInterface) {
    output.appendLine(`Robot NIC: ${report.selectedInterface.name}`);
  }
  output.show(true);
  tree.refresh();
}

async function wifiSelectInterfaceCommand(): Promise<void> {
  const runner = new NodeProcessRunner();
  const interfaces = await listNetworkInterfaces({ runner });
  if (interfaces.length === 0) {
    vscode.window.showWarningMessage("No network interfaces found.");
    return;
  }
  const picked = await vscode.window.showQuickPick(
    interfaces.map((iface) => ({
      label: iface.name,
      description: `${iface.state}${iface.index !== undefined ? ` · #${iface.index}` : ""}`,
      iface,
    })),
    { placeHolder: "Select the network interface for Control Hub / robot Wi-Fi" },
  );
  if (!picked) {
    return;
  }
  const selected = await setRobotNetworkInterface({
    name: picked.iface.name,
    index: picked.iface.index,
  });
  await vscode.workspace
    .getConfiguration("ftc")
    .update("robotNetworkInterface", selected.name, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage(`Robot network interface: ${selected.name}`);
  await refreshWifiStatus(true);
  tree.refresh();
}

async function wifiEnsureRouteCommand(): Promise<void> {
  const confirm = await vscode.window.showWarningMessage(
    "Add a route for the Control Hub subnet via the selected robot interface? This may require an elevated terminal on Windows.",
    { modal: true },
    "Ensure Route",
    "Cancel",
  );
  if (confirm !== "Ensure Route") {
    return;
  }
  const runner = new NodeProcessRunner();
  const result = await ensureRobotRoute({ runner, yes: true });
  output.appendLine(result.message);
  if (result.error) {
    await showFriendlyError(result.error);
  } else {
    vscode.window.showInformationMessage(result.message);
  }
  await refreshWifiStatus(true);
  tree.refresh();
}

async function wifiConnectCommand(): Promise<void> {
  const runner = new NodeProcessRunner();
  const result = await connectWifiAdb({ runner, yes: true });
  output.appendLine(result.message);
  if (!result.success && result.error) {
    await showFriendlyError(result.error);
    return;
  }
  vscode.window.showInformationMessage(result.message);
  await refreshWifiStatus(true);
  await refreshStatus();
}

async function wifiDisconnectCommand(): Promise<void> {
  const runner = new NodeProcessRunner();
  const result = await disconnectWifiAdb({ runner, disconnectAll: true });
  output.appendLine(result.message);
  vscode.window.showInformationMessage(result.message);
  await refreshWifiStatus(true);
  await refreshStatus();
}

async function wifiOpenConsoleCommand(): Promise<void> {
  const runner = new NodeProcessRunner();
  const result = await openRobotConsole(runner);
  output.appendLine(result.message);
  if (!result.opened) {
    vscode.window.showWarningMessage(result.message);
  }
}

async function wifiJoinCommand(): Promise<void> {
  const ssid = await vscode.window.showInputBox({
    prompt: "Control Hub Wi-Fi SSID",
    placeHolder: "FTC-XXXX",
    ignoreFocusOut: true,
  });
  if (!ssid) {
    return;
  }
  const password = await vscode.window.showInputBox({
    prompt: `Password for ${ssid}`,
    password: true,
    ignoreFocusOut: true,
  });
  if (!password) {
    vscode.window.showWarningMessage("Join cancelled — password required.");
    return;
  }
  const rememberChoice = await vscode.window.showQuickPick(
    [
      { label: "Do not save password on this computer", remember: false },
      { label: "Remember password (machine-local obfuscated store)", remember: true },
    ],
    { placeHolder: "Password storage", ignoreFocusOut: true },
  );
  if (!rememberChoice) {
    return;
  }
  const confirm = await vscode.window.showWarningMessage(
    `Join Wi-Fi "${ssid}" on the selected robot network interface?`,
    { modal: true },
    "Join",
    "Cancel",
  );
  if (confirm !== "Join") {
    return;
  }
  const runner = new NodeProcessRunner();
  const result = await joinRobotWifi({
    runner,
    ssid,
    password,
    yes: true,
    remember: rememberChoice.remember,
  });
  output.appendLine(result.message);
  if (!result.success && result.error) {
    await showFriendlyError(result.error);
    return;
  }
  vscode.window.showInformationMessage(result.message);
  await refreshWifiStatus(true);
  tree.refresh();
}

async function wifiManageGetCommand(): Promise<void> {
  const result = await getHubWifiSettings();
  output.clear();
  output.appendLine("Hub Wi-Fi Settings");
  output.appendLine(result.message);
  if (result.publicSettings) {
    output.appendLine(`SSID: ${result.publicSettings.ssid ?? "(unknown)"}`);
    output.appendLine(`Password set: ${result.publicSettings.passwordSet ? "yes" : "unknown"}`);
    output.appendLine(`Band: ${result.publicSettings.band ?? "(unknown)"}`);
    output.appendLine(`Channel: ${result.publicSettings.channel ?? "(unknown)"}`);
  }
  output.show(true);
  if (!result.success && result.error) {
    await showFriendlyError(result.error);
    return;
  }
  vscode.window.showInformationMessage(result.message);
}

async function wifiManageSetCommand(): Promise<void> {
  const ssid = await vscode.window.showInputBox({
    prompt: "New hub SSID (leave empty to keep current)",
    ignoreFocusOut: true,
  });
  const password = await vscode.window.showInputBox({
    prompt: "New hub password (leave empty to keep current)",
    password: true,
    ignoreFocusOut: true,
  });
  const channel = await vscode.window.showInputBox({
    prompt: "Channel (leave empty to keep current)",
    ignoreFocusOut: true,
  });
  if (!ssid && !password && !channel) {
    vscode.window.showInformationMessage("No changes specified.");
    return;
  }

  const dry = await setHubWifiSettings({
    dryRun: true,
    input: {
      ssid: ssid || undefined,
      password: password || undefined,
      channel: channel || undefined,
    },
  });
  output.clear();
  output.appendLine(dry.message);
  output.show(true);

  const confirm = await vscode.window.showWarningMessage(
    `${dry.message} This disconnects Driver Stations and laptops from the hub AP.`,
    { modal: true },
    "Apply",
    "Cancel",
  );
  if (confirm !== "Apply") {
    return;
  }

  const result = await setHubWifiSettings({
    yes: true,
    input: {
      ssid: ssid || undefined,
      password: password || undefined,
      channel: channel || undefined,
    },
  });
  output.appendLine(result.message);
  if (!result.success && result.error) {
    await showFriendlyError(result.error);
    return;
  }
  vscode.window.showInformationMessage(result.message);
}

async function wifiPreferInternetCommand(): Promise<void> {
  const runner = new NodeProcessRunner();
  const interfaces = await listNetworkInterfaces({ runner });
  if (interfaces.length === 0) {
    vscode.window.showWarningMessage("No network interfaces found.");
    return;
  }
  const internet = await vscode.window.showQuickPick(
    interfaces.map((iface) => ({
      label: iface.name,
      description: `${iface.state}${iface.metric !== undefined ? ` · metric ${iface.metric}` : ""}`,
      iface,
    })),
    { placeHolder: "Select the internet / primary network interface" },
  );
  if (!internet) {
    return;
  }
  const robotPick = await vscode.window.showQuickPick(
    [
      { label: "(use selected robot NIC)", iface: undefined as { name: string } | undefined },
      ...interfaces
        .filter((i) => i.name !== internet.iface.name)
        .map((iface) => ({ label: iface.name, iface })),
    ],
    { placeHolder: "Optional: robot NIC to deprioritize" },
  );
  const confirm = await vscode.window.showWarningMessage(
    `Prefer "${internet.iface.name}" for internet (lower metric)? May require elevation on Windows.`,
    { modal: true },
    "Apply",
    "Cancel",
  );
  if (confirm !== "Apply") {
    return;
  }
  const result = await preferInternetInterface({
    runner,
    interfaceName: internet.iface.name,
    robotInterfaceName: robotPick?.iface?.name,
    yes: true,
  });
  for (const line of result.planLines) {
    output.appendLine(line);
  }
  output.appendLine(result.message);
  if (!result.success && result.error) {
    await showFriendlyError(result.error);
    return;
  }
  vscode.window.showInformationMessage(result.message);
  await refreshWifiStatus(true);
  tree.refresh();
}

async function wifiPreferRobotCommand(): Promise<void> {
  const confirm = await vscode.window.showWarningMessage(
    "Prefer the robot NIC for the hub subnet (route ensure + secondary metric)? May require elevation.",
    { modal: true },
    "Apply",
    "Cancel",
  );
  if (confirm !== "Apply") {
    return;
  }
  const runner = new NodeProcessRunner();
  const result = await preferRobotInterface({ runner, yes: true });
  for (const line of result.planLines) {
    output.appendLine(line);
  }
  output.appendLine(result.message);
  if (!result.success && result.error) {
    await showFriendlyError(result.error);
    return;
  }
  vscode.window.showInformationMessage(result.message);
  await refreshWifiStatus(true);
  tree.refresh();
}

async function wifiAdapterCommand(action: "enable" | "disable"): Promise<void> {
  const runner = new NodeProcessRunner();
  const interfaces = await listNetworkInterfaces({ runner });
  if (interfaces.length === 0) {
    vscode.window.showWarningMessage("No network interfaces found.");
    return;
  }
  const picked = await vscode.window.showQuickPick(
    interfaces.map((iface) => ({
      label: iface.name,
      description: iface.state,
      iface,
    })),
    { placeHolder: `Select adapter to ${action}` },
  );
  if (!picked) {
    return;
  }
  const confirm = await vscode.window.showWarningMessage(
    `${action === "enable" ? "Enable" : "Disable"} network adapter "${picked.iface.name}"?`,
    { modal: true },
    action === "enable" ? "Enable" : "Disable",
    "Cancel",
  );
  if (confirm !== "Enable" && confirm !== "Disable") {
    return;
  }
  const result = await setAdapterAdminState({
    runner,
    interfaceName: picked.iface.name,
    action,
    yes: true,
  });
  output.appendLine(result.message);
  if (!result.success && result.error) {
    await showFriendlyError(result.error);
    return;
  }
  vscode.window.showInformationMessage(result.message);
  await refreshWifiStatus(true);
  tree.refresh();
}

async function hubStatusCommand(): Promise<void> {
  const runner = new NodeProcessRunner();
  let deviceProvider: DeviceProvider | undefined;
  try {
    deviceProvider = await createDeviceProvider();
  } catch {
    deviceProvider = undefined;
  }
  const report = await getHubStatus({ runner, deviceProvider });
  output.clear();
  output.appendLine("Control Hub Status");
  output.appendLine(report.message);
  for (const warning of report.warnings) {
    output.appendLine(`Warning: ${warning}`);
  }
  output.show(true);
  if (report.error) {
    await showFriendlyError(report.error);
    return;
  }
  vscode.window.showInformationMessage(report.message);
}

async function hubUpdateCheckCommand(): Promise<void> {
  const runner = new NodeProcessRunner();
  let deviceProvider: DeviceProvider | undefined;
  try {
    deviceProvider = await createDeviceProvider();
  } catch {
    deviceProvider = undefined;
  }
  const report = await checkHubUpdate({ runner, deviceProvider });
  output.clear();
  output.appendLine("Control Hub OS Check");
  output.appendLine(report.message);
  if (report.remote) {
    output.appendLine(`Remote: ${report.remote.version}`);
    output.appendLine(report.remote.downloadUrl);
  }
  output.show(true);
  if (report.error && report.freshness === "unknown") {
    await showFriendlyError(report.error);
    return;
  }
  vscode.window.showInformationMessage(report.message);
}

async function hubUpdateDownloadCommand(): Promise<void> {
  const confirm = await vscode.window.showWarningMessage(
    "Download the latest official Control Hub OS package into the local cache?",
    { modal: true },
    "Download",
    "Cancel",
  );
  if (confirm !== "Download") {
    return;
  }
  const result = await downloadHubOsUpdate({ yes: true });
  output.appendLine(result.message);
  if (!result.success && result.error) {
    await showFriendlyError(result.error);
    return;
  }
  vscode.window.showInformationMessage(result.message);
}

async function hubUpdateApplyCommand(): Promise<void> {
  const dry = await applyHubOsUpdate({
    runner: new NodeProcessRunner(),
    dryRun: true,
    openConsole: false,
  });
  output.clear();
  output.appendLine(dry.message);
  for (const line of dry.planLines) {
    output.appendLine(`- ${line}`);
  }
  output.show(true);

  const confirm = await vscode.window.showWarningMessage(
    "Apply Control Hub OS update? Keep 12V power connected. The hub will reboot. Default flow opens the Manage page for Select Update File (not a silent flash).",
    { modal: true },
    "Apply (guided)",
    "Cancel",
  );
  if (confirm !== "Apply (guided)") {
    return;
  }

  const wifiChoice = await vscode.window.showWarningMessage(
    "Prefer USB for Control Hub OS updates. Allow Wi-Fi adb only if you accept disconnect risk during reboot.",
    { modal: true },
    "Continue",
    "Allow Wi-Fi adb",
    "Cancel",
  );
  if (wifiChoice === "Cancel" || !wifiChoice) {
    return;
  }

  const runner = new NodeProcessRunner();
  let deviceProvider: DeviceProvider | undefined;
  try {
    deviceProvider = await createDeviceProvider();
  } catch {
    deviceProvider = undefined;
  }
  const result = await applyHubOsUpdate({
    runner,
    deviceProvider,
    yes: true,
    allowWifiAdb: wifiChoice === "Allow Wi-Fi adb",
    openConsole: true,
  });
  output.appendLine(result.message);
  for (const line of result.planLines) {
    output.appendLine(`- ${line}`);
  }
  if (!result.success && result.error) {
    await showFriendlyError(result.error);
    return;
  }
  vscode.window.showInformationMessage(result.message);
}

async function pedroStatusCommand(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage("Open an FTC project folder first.");
    return;
  }
  const report = await detectPedroStatus(root);
  output.clear();
  output.appendLine("Pedro Pathing Status");
  output.appendLine(report.message);
  for (const warning of report.warnings) {
    output.appendLine(`Warning: ${warning}`);
  }
  output.show(true);
  vscode.window.showInformationMessage(report.message);
}

async function pedroAddCommand(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage("Open an FTC project folder first.");
    return;
  }
  const runner = new NodeProcessRunner();
  const dry = await addPedroPathing({ projectRoot: root, runner, dryRun: true });
  output.clear();
  output.appendLine(dry.message);
  for (const entry of dry.plan) {
    output.appendLine(`- ${entry.description}`);
  }
  output.show(true);

  const confirm = await vscode.window.showWarningMessage(
    `${dry.message} This edits build.dependencies.gradle (and may bump compileSdk).`,
    { modal: true },
    "Add",
    "Cancel",
  );
  if (confirm !== "Add") {
    return;
  }
  const result = await addPedroPathing({ projectRoot: root, runner, yes: true });
  output.appendLine(result.message);
  if (!result.success && result.error) {
    await showFriendlyError(result.error);
    return;
  }
  vscode.window.showInformationMessage(result.message);
}

async function pedroScaffoldCommand(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage("Open an FTC project folder first.");
    return;
  }
  const confirm = await vscode.window.showWarningMessage(
    "Copy pedroPathing package files from the Pedro Quickstart into TeamCode? Unrelated TeamCode files are never overwritten.",
    { modal: true },
    "Scaffold",
    "Cancel",
  );
  if (confirm !== "Scaffold") {
    return;
  }
  const runner = new NodeProcessRunner();
  const result = await scaffoldPedroPathing({ projectRoot: root, runner, yes: true });
  output.appendLine(result.message);
  if (!result.success && result.error) {
    await showFriendlyError(result.error);
    return;
  }
  vscode.window.showInformationMessage(result.message);
}

async function opmodeListCommand(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage("Open an FTC project folder first.");
    return;
  }
  const report = await listOpModes(root);
  output.clear();
  output.appendLine("OpModes");
  output.appendLine(report.message);
  for (const item of report.opmodes) {
    output.appendLine(`- ${item.className} (${item.kind ?? "unknown"}) ${item.relativePath}`);
  }
  output.show(true);
  if (report.error) {
    await showFriendlyError(report.error);
    return;
  }
  vscode.window.showInformationMessage(report.message);
}

async function opmodeCreateCommand(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage("Open an FTC project folder first.");
    return;
  }
  const typePick = await vscode.window.showQuickPick(
    [
      { label: "TeleOp", opModeKind: "teleop" as const },
      { label: "Autonomous", opModeKind: "autonomous" as const },
    ],
    { placeHolder: "OpMode type" },
  );
  if (!typePick) {
    return;
  }
  const stylePick = await vscode.window.showQuickPick(
    [
      { label: "LinearOpMode (recommended)", opModeStyle: "linear" as const },
      { label: "Iterative OpMode", opModeStyle: "iterative" as const },
    ],
    { placeHolder: "OpMode style" },
  );
  if (!stylePick) {
    return;
  }
  const className = await vscode.window.showInputBox({
    prompt: "Java class name",
    placeHolder: "MyTeleOp",
    ignoreFocusOut: true,
    validateInput: (value) =>
      /^[A-Za-z_][A-Za-z0-9_]*$/.test(value.trim()) ? undefined : "Invalid Java class name",
  });
  if (!className) {
    return;
  }
  const group = await vscode.window.showInputBox({
    prompt: "Driver Station group (optional)",
    ignoreFocusOut: true,
  });

  const runner = new NodeProcessRunner();
  const dry = await createOpMode({
    projectRoot: root,
    runner,
    className: className.trim(),
    kind: typePick.opModeKind,
    style: stylePick.opModeStyle,
    group: group?.trim() || undefined,
    dryRun: true,
  });
  output.clear();
  output.appendLine(dry.message);
  output.show(true);

  const confirm = await vscode.window.showWarningMessage(
    `${dry.message}`,
    { modal: true },
    "Create",
    "Cancel",
  );
  if (confirm !== "Create") {
    return;
  }

  const result = await createOpMode({
    projectRoot: root,
    runner,
    className: className.trim(),
    kind: typePick.opModeKind,
    style: stylePick.opModeStyle,
    group: group?.trim() || undefined,
    yes: true,
  });
  output.appendLine(result.message);
  if (!result.success && result.error) {
    await showFriendlyError(result.error);
    return;
  }
  vscode.window.showInformationMessage(result.message);
  if (result.absolutePath) {
    const doc = await vscode.workspace.openTextDocument(result.absolutePath);
    await vscode.window.showTextDocument(doc);
  }
}

async function configListCommand(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage("Open an FTC project folder first.");
    return;
  }
  const report = await listRobotConfigs(root);
  output.clear();
  output.appendLine("Robot configs");
  output.appendLine(report.message);
  for (const item of report.configs) {
    output.appendLine(`- ${item.name} (${item.deviceCount} named entries) ${item.relativePath}`);
  }
  output.show(true);
  if (report.error) {
    await showFriendlyError(report.error);
    return;
  }
  vscode.window.showInformationMessage(report.message);
}

async function pickRobotConfigName(root: string): Promise<string | undefined> {
  const report = await listRobotConfigs(root);
  if (report.error) {
    await showFriendlyError(report.error);
    return undefined;
  }
  if (report.configs.length === 0) {
    vscode.window.showWarningMessage(report.message);
    return undefined;
  }
  const picked = await vscode.window.showQuickPick(
    report.configs.map((c) => ({
      label: c.name,
      description: `${c.deviceCount} named entries`,
      detail: c.relativePath,
    })),
    { placeHolder: "Robot config" },
  );
  return picked?.label;
}

async function configShowCommand(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage("Open an FTC project folder first.");
    return;
  }
  const name = await pickRobotConfigName(root);
  if (!name) {
    return;
  }
  const result = await showRobotConfig(root, name);
  output.clear();
  output.appendLine(result.message);
  if (result.config) {
    output.appendLine(`Path: ${result.config.relativePath}`);
    if (result.config.rootType) {
      output.appendLine(`Root type: ${result.config.rootType}`);
    }
    for (const device of result.config.devices) {
      const port = device.port ? ` port=${device.port}` : "";
      output.appendLine(`- ${device.name} (${device.type}${port})`);
    }
  }
  output.show(true);
  if (!result.success && result.error) {
    await showFriendlyError(result.error);
    return;
  }
  vscode.window.showInformationMessage(result.message);
  if (result.config?.absolutePath) {
    const doc = await vscode.workspace.openTextDocument(result.config.absolutePath);
    await vscode.window.showTextDocument(doc);
  }
}

async function configValidateCommand(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage("Open an FTC project folder first.");
    return;
  }
  const name = await pickRobotConfigName(root);
  if (!name) {
    return;
  }
  const result = await validateRobotConfig(root, name);
  output.clear();
  output.appendLine(result.message);
  for (const issue of result.issues) {
    output.appendLine(`[${issue.severity}] ${issue.message}`);
  }
  output.show(true);
  if (result.error) {
    await showFriendlyError(result.error);
    return;
  }
  if (result.success) {
    vscode.window.showInformationMessage(result.message);
  } else {
    vscode.window.showWarningMessage(result.message);
  }
}

async function configPullCommand(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage("Open an FTC project folder first.");
    return;
  }
  const runner = new NodeProcessRunner();
  let deviceProvider;
  try {
    deviceProvider = await createDeviceProvider();
  } catch {
    deviceProvider = undefined;
  }

  const dry = await pullRobotConfigs({
    projectRoot: root,
    runner,
    deviceProvider,
    deviceSerial: selectedSerial,
    dryRun: true,
  });
  output.clear();
  output.appendLine(dry.message);
  for (const file of dry.plannedFiles) {
    output.appendLine(`- ${file}`);
  }
  output.show(true);
  if (!dry.success) {
    if (dry.error) {
      await showFriendlyError(dry.error);
    }
    return;
  }

  const confirm = await vscode.window.showWarningMessage(
    `${dry.message}`,
    { modal: true },
    "Pull",
    "Cancel",
  );
  if (confirm !== "Pull") {
    return;
  }

  const result = await pullRobotConfigs({
    projectRoot: root,
    runner,
    deviceProvider,
    deviceSerial: selectedSerial,
    yes: true,
  });
  output.appendLine(result.message);
  for (const file of result.pulledFiles) {
    output.appendLine(`- ${file}`);
  }
  if (!result.success && result.error) {
    await showFriendlyError(result.error);
    return;
  }
  vscode.window.showInformationMessage(result.message);
}

async function hwmapShowCommand(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage("Open an FTC project folder first.");
    return;
  }
  const configName = await pickHwMapConfigName(root);
  if (configName === null) {
    return;
  }
  const report = await showHardwareMap(root, configName);
  output.clear();
  output.appendLine("Hardware map");
  output.appendLine(report.message);
  if (report.configPath) {
    output.appendLine(`Config: ${report.configPath}`);
  }
  for (const entry of report.entries) {
    const type = entry.javaType ?? "(unmapped)";
    const flag = entry.includedInCodegen ? "" : " [skip codegen]";
    output.appendLine(`- ${entry.configName} → ${type} (${entry.xmlType})${flag}`);
  }
  output.show(true);
  if (!report.success && report.error) {
    await showFriendlyError(report.error);
    return;
  }
  vscode.window.showInformationMessage(report.message);
}

/** Returns config name, or null if cancelled / unavailable. */
async function pickHwMapConfigName(root: string): Promise<string | null> {
  const listed = await listRobotConfigs(root);
  if (listed.error) {
    await showFriendlyError(listed.error);
    return null;
  }
  if (listed.configs.length === 0) {
    vscode.window.showWarningMessage(listed.message);
    return null;
  }
  if (listed.configs.length === 1) {
    return listed.configs[0]!.name;
  }
  const picked = await vscode.window.showQuickPick(
    listed.configs.map((c) => ({
      label: c.name,
      description: `${c.deviceCount} named entries`,
      detail: c.relativePath,
    })),
    { placeHolder: "Robot config for hardware map" },
  );
  return picked ? picked.label : null;
}

async function hwmapCodegenCommand(): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage("Open an FTC project folder first.");
    return;
  }
  const configName = await pickHwMapConfigName(root);
  if (configName === null) {
    return;
  }
  const typePick = await vscode.window.showQuickPick(
    [
      { label: "TeleOp", opModeKind: "teleop" as const },
      { label: "Autonomous", opModeKind: "autonomous" as const },
    ],
    { placeHolder: "OpMode type" },
  );
  if (!typePick) {
    return;
  }
  const className = await vscode.window.showInputBox({
    prompt: "Java class name for generated OpMode",
    placeHolder: "ConfigTeleOp",
    ignoreFocusOut: true,
    validateInput: (value) =>
      /^[A-Za-z_][A-Za-z0-9_]*$/.test(value.trim()) ? undefined : "Invalid Java class name",
  });
  if (!className) {
    return;
  }

  const runner = new NodeProcessRunner();
  const dry = await codegenHardwareMapOpMode({
    projectRoot: root,
    runner,
    configName,
    className: className.trim(),
    kind: typePick.opModeKind,
    dryRun: true,
  });
  output.clear();
  output.appendLine(dry.message);
  if (dry.sourcePreview) {
    output.appendLine("");
    output.appendLine(dry.sourcePreview);
  }
  output.show(true);
  if (!dry.success) {
    if (dry.error) {
      await showFriendlyError(dry.error);
    }
    return;
  }

  const confirm = await vscode.window.showWarningMessage(
    `${dry.message}`,
    { modal: true },
    "Generate",
    "Cancel",
  );
  if (confirm !== "Generate") {
    return;
  }

  const result = await codegenHardwareMapOpMode({
    projectRoot: root,
    runner,
    configName,
    className: className.trim(),
    kind: typePick.opModeKind,
    yes: true,
  });
  output.appendLine(result.message);
  if (!result.success && result.error) {
    await showFriendlyError(result.error);
    return;
  }
  vscode.window.showInformationMessage(result.message);
  if (result.absolutePath) {
    const doc = await vscode.workspace.openTextDocument(result.absolutePath);
    await vscode.window.showTextDocument(doc);
  }
}

async function refreshStatus(): Promise<void> {
  try {
    const provider = await createDeviceProvider();
    const devices = await provider.listDevices();
    const usable = devices.filter((d) => d.state === "device" && d.authorization === "authorized");
    if (usable.length === 0) {
      if (devices.some((d) => d.state === "unauthorized")) {
        status.setState("unauthorized");
      } else {
        status.setState("no-device");
      }
    } else if (usable.length > 1 && !selectedSerial) {
      status.setState("multiple");
    } else {
      status.setState("ready");
    }
    await refreshSdkStatus(false);
    await refreshWifiStatus(false);
    tree.refresh();
  } catch {
    status.setState("no-device");
    await refreshSdkStatus(false);
    await refreshWifiStatus(false);
    tree.refresh();
  }
}

function requireRoot(): string {
  const root = getWorkspaceRoot();
  if (!root) {
    throw new Error("Open an FTC project folder first.");
  }
  return root;
}

function formatDevice(device: AndroidDevice): string {
  return [
    device.serial,
    device.state,
    device.authorization,
    device.connectionType,
    device.model,
    device.controlHubLikelihood === "probable" ? "probable-control-hub" : undefined,
  ]
    .filter(Boolean)
    .join(" | ");
}

function appendBuildOutput(stdout: string, stderr: string): void {
  if (stdout.trim()) {
    output.appendLine(stdout);
  }
  if (stderr.trim()) {
    output.appendLine(stderr);
  }
}

async function showFriendlyError(error: FriendlyError): Promise<void> {
  output.appendLine(`${error.title} (${error.code})`);
  output.appendLine(error.summary);
  for (const action of error.suggestedActions) {
    output.appendLine(`- ${action}`);
  }
  if (error.technicalDetails) {
    output.appendLine("Technical details:");
    output.appendLine(error.technicalDetails);
  }
  const action = await vscode.window.showErrorMessage(
    `${error.title}: ${error.summary}`,
    "Open Technical Output",
    "Show Next Steps",
  );
  if (action === "Open Technical Output") {
    output.show(true);
  } else if (action === "Show Next Steps") {
    void vscode.window.showInformationMessage(error.suggestedActions.join(" | "));
  }
}
