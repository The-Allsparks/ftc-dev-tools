import * as vscode from "vscode";
import {
  START_HERE_STEPS,
  countStartHereCompleted,
  isStartHereStepComplete,
  type StartHereStepId,
} from "@ftc-dev-tools/shared";
import type { StartHereMachineScan } from "@ftc-dev-tools/shared";

export class StartHereDockProvider implements vscode.WebviewViewProvider {
  static readonly viewType = "ftc.startHereDock";

  private view?: vscode.WebviewView;
  private state: {
    completed: readonly StartHereStepId[];
    activeStepId?: StartHereStepId;
    machineScan?: StartHereMachineScan;
  } = { completed: [] };

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.view = webviewView;
    webviewView.webview.options = { enableScripts: false };
    this.render();
  }

  update(state: {
    completed: readonly StartHereStepId[];
    activeStepId?: StartHereStepId;
    machineScan?: StartHereMachineScan;
  }): void {
    this.state = state;
    this.render();
  }

  reveal(): void {
    void vscode.commands.executeCommand("workbench.view.extension.ftcStartHerePanel");
  }

  private render(): void {
    if (!this.view) {
      return;
    }
    const { completed, activeStepId, machineScan } = this.state;
    const doneCount = countStartHereCompleted(completed);
    const rows = START_HERE_STEPS.map((step) => {
      const done = isStartHereStepComplete(completed, step.id);
      const current = step.id === activeStepId;
      const icon = done ? "✓" : current ? "→" : "○";
      const cls = done ? "done" : current ? "current" : "";
      return `<li class="${cls}"><span class="icon">${icon}</span>${escape(step.title)}</li>`;
    }).join("");

    let sub = "";
    if (activeStepId === "machine-checks" && machineScan) {
      const s = machineScan;
      const items = [
        { ok: s.extensionsConfigured, t: "Extensions" },
        { ok: !s.installNeeds.needsJdk, t: "Java JDK" },
        { ok: !s.installNeeds.needsAndroidSdk, t: "SDK / adb" },
        { ok: s.cliOnPath, t: "CLI (optional)" },
        { ok: s.installNeeds.machineDepsSatisfied, t: "Environment check" },
      ];
      sub = `<ul class="sub">${items
        .map((i) => `<li class="${i.ok ? "done" : ""}">${i.ok ? "✓" : "○"} ${escape(i.t)}</li>`)
        .join("")}</ul>`;
    }

    this.view.webview.html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
body{font-family:var(--vscode-font-family);font-size:var(--vscode-font-size);color:var(--vscode-foreground);padding:12px 16px;margin:0}
h2{font-size:1em;margin:0 0 8px}
.progress{opacity:.85;margin-bottom:12px;font-size:.92em}
ul{list-style:none;padding:0;margin:0}
li{display:flex;gap:8px;padding:4px 0;line-height:1.35}
ul.sub{margin:6px 0 0 20px;border-left:1px solid var(--vscode-panel-border);padding-left:10px;font-size:.92em}
li.done{opacity:.75}
li.current{font-weight:600}
.icon{width:1.1em;font-family:monospace}
</style></head><body>
<h2>Start Here</h2>
<div class="progress">${doneCount}/${START_HERE_STEPS.length} steps</div>
<ul>${rows}</ul>${sub}
</body></html>`;
  }
}

function escape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
