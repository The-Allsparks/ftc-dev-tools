/** Human-readable labels for FTC VS Code command IDs (Command Palette titles). */
export const FTC_COMMAND_TITLES: Record<string, string> = {
  "ftc.startHere": "FTC: Start Here",
  "ftc.configureRecommendedExtensions": "FTC: Configure Recommended Extensions",
  "ftc.setUpComputer": "FTC: Set Up This Computer",
  "ftc.installCli": "FTC: Install FTC CLI",
  "ftc.runDoctor": "FTC: Run Environment Check",
  "ftc.runInstallDeps": "FTC: Run Trusted Install-Deps Installer",
  "ftc.selectProjectRoot": "FTC: Select Project Root",
  "ftc.obtainProject": "FTC: Get or Open FTC Project",
  "ftc.setUpProject": "FTC: Set Up This FTC Project",
  "ftc.showDevices": "FTC: Show Devices",
  "ftc.connectRobotUsb": "FTC: Connect My Robot (USB First)",
  "ftc.firstOpModeJourney": "FTC: First OpMode Journey",
  "ftc.opmodeCreate": "FTC: Create OpMode",
  "ftc.configValidate": "FTC: Validate Robot Config",
  "ftc.selectDevice": "FTC: Select Deployment Device",
  "ftc.wifiConnect": "FTC: Connect Wi-Fi ADB",
  "ftc.build": "FTC: Build Robot Code",
  "ftc.deploy": "FTC: Deploy to Robot",
  "ftc.buildAndDeploy": "FTC: Build and Deploy",
  "ftc.viewLogs": "FTC: View Robot Logs",
};

export function getFtcCommandTitle(commandId: string): string {
  return FTC_COMMAND_TITLES[commandId] ?? commandId;
}

/** VS Code / Cursor markdown preview link that runs an extension command when clicked. */
export function markdownCommandLink(
  commandId: string,
  options?: { label?: string; args?: unknown[] },
): string {
  const label = options?.label ?? getFtcCommandTitle(commandId);
  const safeLabel = label.replace(/\\/g, "\\\\").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
  const uri =
    options?.args !== undefined
      ? `${commandId}?${encodeURIComponent(JSON.stringify(options.args))}`
      : commandId;
  return `[${safeLabel}](command:${uri})`;
}
