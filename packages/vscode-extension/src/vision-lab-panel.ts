import * as vscode from "vscode";
import type { DeviceProvider } from "@ftc-dev-tools/shared";
import { loadVisionLabSnapshot, type VisionLabSnapshot } from "./vision-lab-data.js";
import { renderVisionLabHtml } from "./vision-lab-html.js";

let lastInspectorJson: string | undefined;

export function setLastInspectorJsonFromSnapshot(snapshot: VisionLabSnapshot): void {
  lastInspectorJson = snapshot.resultInspector
    ? JSON.stringify(snapshot.resultInspector, null, 2)
    : undefined;
}

export function getLastInspectorJson(): string | undefined {
  return lastInspectorJson;
}

export async function visionCopyInspectorJsonCommand(): Promise<void> {
  if (!lastInspectorJson) {
    void vscode.window.showWarningMessage(
      "No inspector results loaded. Open Vision Lab and refresh with a reachable Limelight host.",
    );
    return;
  }
  await vscode.env.clipboard.writeText(lastInspectorJson);
  void vscode.window.showInformationMessage("Vision inspector JSON copied to clipboard.");
}

export class VisionLabSidebarProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "ftc.visionSidebar";

  private view?: vscode.WebviewView;
  private snapshot: VisionLabSnapshot | undefined;

  constructor(
    private readonly getProjectRoot: () => string | undefined,
    private readonly getDeviceProvider: () => Promise<DeviceProvider | undefined>,
  ) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: false,
      localResourceRoots: [],
    };
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        void this.refresh();
      }
    });
    void this.refresh();
  }

  async refresh(): Promise<void> {
    this.snapshot = await loadVisionLabSnapshot({
      projectRoot: this.getProjectRoot(),
      deviceProvider: await this.getDeviceProvider(),
      probeNetwork: false,
      loadResults: false,
    });
    setLastInspectorJsonFromSnapshot(this.snapshot);
    this.render();
  }

  update(snapshot: VisionLabSnapshot): void {
    this.snapshot = snapshot;
    this.render();
  }

  reveal(): void {
    void vscode.commands.executeCommand("ftc.visionSidebar.focus");
  }

  private render(): void {
    if (!this.view || !this.snapshot) {
      return;
    }
    this.view.webview.html = renderVisionLabHtml(this.snapshot, {
      compact: true,
      openPanelCommand: "ftc.openVisionLab",
      refreshCommand: "ftc.visionRefresh",
    });
  }
}

export class VisionLabPanelController {
  static readonly viewType = "ftcVisionLab";

  private panel: vscode.WebviewPanel | undefined;
  private refreshTimer: NodeJS.Timeout | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly getProjectRoot: () => string | undefined,
    private readonly getDeviceProvider: () => Promise<DeviceProvider | undefined>,
  ) {}

  async open(): Promise<void> {
    if (this.panel) {
      this.panel.reveal(vscode.ViewColumn.One);
      await this.refresh();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      VisionLabPanelController.viewType,
      "Vision Lab",
      vscode.ViewColumn.One,
      {
        enableScripts: false,
        retainContextWhenHidden: true,
        localResourceRoots: [],
      },
    );

    this.panel.iconPath = vscode.Uri.joinPath(this.extensionUri, "media", "ftc.svg");

    this.disposables.push(
      this.panel.onDidDispose(() => {
        this.disposePanel();
      }),
    );

    await this.refresh();
  }

  async refresh(): Promise<void> {
    const target = this.panel;
    if (!target) {
      return;
    }

    const snapshot = await loadVisionLabSnapshot({
      projectRoot: this.getProjectRoot(),
      deviceProvider: await this.getDeviceProvider(),
      probeNetwork: true,
      loadResults: true,
    });

    setLastInspectorJsonFromSnapshot(snapshot);

    target.webview.html = renderVisionLabHtml(snapshot, {
      compact: false,
      refreshCommand: "ftc.visionRefresh",
      copyInspectorCommand: "ftc.visionCopyInspectorJson",
    });
  }

  dispose(): void {
    this.disposePanel();
    for (const disposable of this.disposables.splice(0)) {
      disposable.dispose();
    }
  }

  private disposePanel(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = undefined;
    }
    this.panel = undefined;
  }
}

export async function visionOpenSourceCommand(
  getProjectRoot: () => string | undefined,
  relativePath?: string,
): Promise<void> {
  const root = getProjectRoot();
  if (!root) {
    void vscode.window.showWarningMessage(
      "Open an FTC project before opening vision source files.",
    );
    return;
  }
  if (!relativePath?.trim()) {
    return;
  }
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const absolute = vscode.Uri.file(`${root}/${normalized}`);
  try {
    const doc = await vscode.workspace.openTextDocument(absolute);
    await vscode.window.showTextDocument(doc, { preview: false });
  } catch {
    void vscode.window.showErrorMessage(`Could not open ${normalized} in the workspace.`);
  }
}
