import * as vscode from "vscode";

export type StatusState =
  "ready" | "no-device" | "unauthorized" | "multiple" | "build-failed" | "deploying";

export class StatusController implements vscode.Disposable {
  private readonly item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = "ftc.refreshView";
    this.setState("no-device");
    this.item.show();
  }

  setState(state: StatusState): void {
    const labels: Record<StatusState, string> = {
      ready: "FTC: Ready",
      "no-device": "FTC: No Device",
      unauthorized: "FTC: Unauthorized",
      multiple: "FTC: Multiple Devices",
      "build-failed": "FTC: Build Failed",
      deploying: "FTC: Deploying…",
    };
    this.item.text = labels[state];
    this.item.tooltip =
      "FTC Dev Tools — click to refresh status / open actions via Command Palette";
    this.item.command =
      state === "multiple"
        ? "ftc.selectDevice"
        : state === "no-device" || state === "unauthorized"
          ? "ftc.showDevices"
          : state === "build-failed"
            ? "ftc.openTechnicalOutput"
            : "ftc.runDoctor";
  }

  dispose(): void {
    this.item.dispose();
  }
}
