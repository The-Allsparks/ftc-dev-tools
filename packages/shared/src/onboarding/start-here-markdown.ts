import {
  START_HERE_STEPS,
  countStartHereCompleted,
  isStartHereStepComplete,
  type StartHereStepId,
} from "./start-here-steps.js";
import { markdownCommandLink } from "./ftc-command-titles.js";
import type { MachineInstallNeeds } from "../setup/install-needs-from-doctor.js";

const START_HERE_PANEL_COMMAND = "workbench.view.extension.ftcStartHerePanel";

function quickActionsSection(): string {
  const resume = markdownCommandLink("ftc.startHere", { label: "Resume Start Here wizard" });
  const panel = markdownCommandLink(START_HERE_PANEL_COMMAND, {
    label: "Show Start Here checklist panel",
  });
  return [
    "## Quick actions",
    "",
    "Use the **markdown preview** for clickable links (editor source view will not run commands).",
    "",
    `${resume} · ${panel}`,
    "",
  ].join("\n");
}

function machineCheckLinks(): string {
  return [
    markdownCommandLink("ftc.runInstallDeps", {
      label: "Check & install what's missing",
      args: [{ source: "start-here" }],
    }),
    " · ",
    markdownCommandLink("ftc.runDoctor", { label: "Run environment check (refresh status)" }),
  ].join("");
}

export interface StartHereMachineScan {
  extensionsConfigured: boolean;
  installNeeds: MachineInstallNeeds;
  cliOnPath: boolean;
  doctorSummaryLine?: string;
  installTimeEstimateSummary?: string;
}

export interface RenderStartHereMarkdownOptions {
  completed: readonly StartHereStepId[];
  activeStepId?: StartHereStepId;
  machineScan?: StartHereMachineScan;
}

function checkbox(done: boolean, label: string): string {
  return `- [${done ? "x" : " "}] ${label}`;
}

function machineSubsection(scan: StartHereMachineScan | undefined): string {
  const lines: string[] = ["", "### Prepare this computer — detail", ""];
  if (!scan) {
    lines.push(machineCheckLinks());
    lines.push(
      "",
      `Or open the ${markdownCommandLink("ftc.startHere")} wizard for the full step menu.`,
    );
    return lines.join("\n");
  }

  lines.push(
    checkbox(scan.extensionsConfigured, "Recommended extensions in `.vscode/extensions.json`"),
  );
  lines.push(
    checkbox(
      !scan.installNeeds.needsJdk,
      `Java JDK${scan.installNeeds.jdkDetail ? ` — ${scan.installNeeds.jdkDetail}` : ""}`,
    ),
  );
  lines.push(
    checkbox(
      !scan.installNeeds.needsAndroidSdk,
      `Android SDK and adb${scan.installNeeds.sdkDetail ? ` — ${scan.installNeeds.sdkDetail}` : ""}`,
    ),
  );
  lines.push(checkbox(scan.cliOnPath, "FTC CLI on PATH (optional)"));
  lines.push(
    checkbox(
      scan.installNeeds.machineDepsSatisfied,
      "Environment check — computer setup checks pass",
    ),
  );
  if (scan.doctorSummaryLine) {
    lines.push("", `> ${scan.doctorSummaryLine}`);
  }
  if (scan.installTimeEstimateSummary && !scan.installNeeds.machineDepsSatisfied) {
    lines.push("", `> **Setup time (estimate):** ${scan.installTimeEstimateSummary}`);
  }
  lines.push("", machineCheckLinks());
  return lines.join("\n");
}

export function renderStartHereMarkdown(options: RenderStartHereMarkdownOptions): string {
  const { completed, activeStepId, machineScan } = options;
  const doneCount = countStartHereCompleted(completed);
  const total = START_HERE_STEPS.length;
  const active = activeStepId
    ? START_HERE_STEPS.find((s) => s.id === activeStepId)
    : START_HERE_STEPS.find((s) => !isStartHereStepComplete(completed, s.id));

  const lines: string[] = [
    "# FTC: Start Here",
    "",
    `Progress: **${doneCount}/${total}** — follow the **Start Here** panel checklist while you work.`,
    "",
    quickActionsSection(),
    "",
    "## Checklist",
    "",
  ];

  for (const step of START_HERE_STEPS) {
    const done = isStartHereStepComplete(completed, step.id);
    const current = step.id === (active?.id ?? activeStepId);
    lines.push(checkbox(done, `${step.title}${current ? " ← **current**" : ""}`));
  }

  if (active) {
    lines.push("", "## Current step", "", `### ${active.title}`, "", active.description, "");
    if (active.id === "machine-checks") {
      lines.push(machineSubsection(machineScan));
    }
    if (active.commandIds?.length) {
      lines.push("", "**Run commands** (click in markdown preview):");
      for (const id of active.commandIds) {
        lines.push(`- ${markdownCommandLink(id)}`);
      }
    }
  }

  lines.push(
    "",
    "---",
    "",
    `Reopen ${markdownCommandLink("ftc.startHere")} anytime. Progress is saved on this machine.`,
    "",
  );
  return lines.join("\n");
}
