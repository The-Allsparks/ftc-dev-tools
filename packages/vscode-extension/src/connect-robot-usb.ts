import * as vscode from "vscode";

export type ConnectRobotUsbDeps = {
  showDevices: () => Promise<void>;
  selectDevice: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  getSelectedSerial: () => string | undefined;
};

/**
 * Rookie USB-first device connection (#41). Orchestrates existing device commands;
 * does not enable Wi-Fi unless the user chooses it at the end.
 */
export async function connectRobotUsbFirstCommand(deps: ConnectRobotUsbDeps): Promise<void> {
  const begin = await vscode.window.showInformationMessage(
    "Connect My Robot (USB first): plug in, authorize debugging on the robot, then choose which device to deploy to.",
    "Start",
    "Cancel",
  );
  if (begin !== "Start") {
    return;
  }

  await vscode.window.showInformationMessage(
    [
      "USB steps:",
      "1. Connect the Control Hub or phone to this computer with a USB cable.",
      "2. On the robot, accept USB debugging if you see a prompt.",
      "3. We'll list devices and ask you to pick one for deploy.",
    ].join("\n"),
    { modal: true },
    "Continue",
  );

  try {
    await deps.showDevices();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`Could not list devices: ${message}`);
    return;
  }

  await deps.selectDevice();
  await deps.refreshStatus();

  const serial = deps.getSelectedSerial();
  if (serial) {
    await vscode.window.showInformationMessage(
      `Deployment device set to ${serial}. You can build and deploy when your project is ready.`,
    );
  } else {
    const retry = await vscode.window.showWarningMessage(
      "No deployment device selected yet. Fix USB authorization or pick a device from the list.",
      "Try again",
      "Cancel",
    );
    if (retry === "Try again") {
      await connectRobotUsbFirstCommand(deps);
    }
    return;
  }

  const wifi = await vscode.window.showInformationMessage(
    "USB connection is set for deploy. Wi-Fi adb is optional and can wait until later.",
    "Connect Wi-Fi ADB (optional)",
    "Done",
  );
  if (wifi === "Connect Wi-Fi ADB (optional)") {
    await vscode.commands.executeCommand("ftc.wifiConnect");
  }
}
