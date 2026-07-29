import {
  MILESTONE_STEPS,
  countMilestonesCompleted,
  isMilestoneComplete,
  type MilestoneStepId,
} from "@ftc-dev-tools/shared";

export type MilestoneTreeNode = {
  id: string;
  label: string;
  description?: string;
  commandId?: string;
  commandTitle?: string;
};

function checklistLabel(base: string, done: boolean): string {
  return done ? `$(check) ${base}` : `$(circle-outline) ${base}`;
}

export function buildMilestoneChecklistNodes(
  completed: readonly MilestoneStepId[],
): MilestoneTreeNode[] {
  const doneCount = countMilestonesCompleted(completed);
  const total = MILESTONE_STEPS.length;

  const rows: MilestoneTreeNode[] = [
    {
      id: "milestone-summary",
      label: `${doneCount}/${total} milestones`,
      description: doneCount === total ? "Competition-ready checklist complete" : "Am I done yet?",
    },
    {
      id: "milestone-device-docs",
      label: "$(book) Device connections guide",
      description: "USB, Wi‑Fi, authorization",
      commandId: "ftc.openDeviceConnectionsDoc",
      commandTitle: "Open Device Connections Doc",
    },
  ];

  for (const step of MILESTONE_STEPS) {
    const done = isMilestoneComplete(completed, step.id);
    rows.push({
      id: `milestone-${step.id}`,
      label: checklistLabel(step.title, done),
      description: step.description,
      commandId: commandForMilestone(step.id),
      commandTitle: commandTitleForMilestone(step.id),
    });
  }

  return rows;
}

function commandForMilestone(id: MilestoneStepId): string | undefined {
  switch (id) {
    case "doctor-ok":
      return "ftc.runDoctor";
    case "device-authorized":
      return "ftc.connectRobotUsb";
    case "build-ok":
      return "ftc.build";
    case "deploy-ok":
      return "ftc.deploy";
    case "opmode-on-driver-station":
      return "ftc.markOpModeOnDriverStation";
    case "teamcode-logs":
      return "ftc.viewLogs";
    default:
      return undefined;
  }
}

function commandTitleForMilestone(id: MilestoneStepId): string | undefined {
  switch (id) {
    case "doctor-ok":
      return "Run Environment Check";
    case "device-authorized":
      return "Connect My Robot (USB First)";
    case "build-ok":
      return "Build Robot Code";
    case "deploy-ok":
      return "Deploy to Robot";
    case "opmode-on-driver-station":
      return "Mark OpMode on Driver Station";
    case "teamcode-logs":
      return "View Robot Logs";
    default:
      return undefined;
  }
}
