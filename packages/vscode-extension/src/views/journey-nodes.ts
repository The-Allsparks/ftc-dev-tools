import {
  MILESTONE_STEPS,
  START_HERE_STEPS,
  countMilestonesCompleted,
  countStartHereCompleted,
  isMilestoneComplete,
  isStartHereStepComplete,
  type MilestoneStepId,
  type StartHereStepId,
} from "@ftc-dev-tools/shared";
import { actionNode, leafNode, type RobotNode } from "./robot-node-types.js";

export type JourneyTreeNodeSpec = {
  id: string;
  label: string;
  description?: string;
  done: boolean;
  commandId?: string;
  commandTitle?: string;
  icon?: "book";
};

function journeyRow(spec: JourneyTreeNodeSpec): RobotNode {
  return leafNode(spec.id, spec.label, {
    description: spec.description,
    tooltip: spec.description,
    icon: spec.icon ?? (spec.done ? "check" : "circle-outline"),
    command:
      spec.commandId && spec.commandTitle
        ? { command: spec.commandId, title: spec.commandTitle }
        : undefined,
    contextValue: spec.done ? "ftc.sidebar.journeyDone" : "ftc.sidebar.journeyPending",
  });
}

/** Milestone command wiring (shared with legacy milestone-checklist-nodes). */
export function commandForMilestone(id: MilestoneStepId): string | undefined {
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

export function commandTitleForMilestone(id: MilestoneStepId): string | undefined {
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

export function buildJourneyNodeSpecs(
  startHereCompleted: readonly StartHereStepId[],
  milestoneCompleted: readonly MilestoneStepId[],
): JourneyTreeNodeSpec[] {
  const startHereDone = countStartHereCompleted(startHereCompleted);
  const startHereTotal = START_HERE_STEPS.length;
  const milestoneDone = countMilestonesCompleted(milestoneCompleted);
  const milestoneTotal = MILESTONE_STEPS.length;
  const allStartHereDone = startHereDone === startHereTotal;
  const allMilestonesDone = milestoneDone === milestoneTotal;

  const rows: JourneyTreeNodeSpec[] = [];

  if (!allStartHereDone) {
    rows.push({
      id: "journey-start-here",
      label: "Start Here (guided checklist)",
      description: `${startHereDone}/${startHereTotal} steps complete`,
      done: false,
      commandId: "ftc.startHere",
      commandTitle: "Start Here",
    });
  }

  rows.push({
    id: "journey-connections-doc",
    label: "Device connections guide",
    description: "USB, Wi‑Fi, and authorization help",
    done: false,
    commandId: "ftc.openDeviceConnectionsDoc",
    commandTitle: "Open Device Connections Doc",
    icon: "book",
  });

  for (const step of MILESTONE_STEPS) {
    const done = isMilestoneComplete(milestoneCompleted, step.id);
    if (done && allMilestonesDone) {
      continue;
    }
    if (!done || step.id === "opmode-on-driver-station") {
      rows.push({
        id: `journey-milestone-${step.id}`,
        label: step.title,
        description: step.description,
        done,
        commandId: commandForMilestone(step.id),
        commandTitle: commandTitleForMilestone(step.id),
      });
    }
  }

  if (allMilestonesDone) {
    rows.unshift({
      id: "journey-milestones-complete",
      label: "Competition readiness complete",
      description: `${milestoneDone}/${milestoneTotal} milestones`,
      done: true,
    });
  } else if (milestoneDone > 0) {
    rows.unshift({
      id: "journey-milestones-progress",
      label: "Competition readiness",
      description: `${milestoneDone}/${milestoneTotal} milestones complete`,
      done: false,
    });
  }

  return rows;
}

export function buildJourneyNodes(
  startHereCompleted: readonly StartHereStepId[],
  milestoneCompleted: readonly MilestoneStepId[],
): RobotNode[] {
  return buildJourneyNodeSpecs(startHereCompleted, milestoneCompleted).map(journeyRow);
}

/** Key Start Here steps surfaced when the full checklist is hidden. */
export function buildFocusedStartHereNodes(
  completed: readonly StartHereStepId[],
): RobotNode[] {
  const rows: JourneyTreeNodeSpec[] = [];
  const machineDone = isStartHereStepComplete(completed, "machine-checks");
  const projectDone = isStartHereStepComplete(completed, "project-folder");
  const connectDone = isStartHereStepComplete(completed, "connect-robot");

  if (!machineDone) {
    rows.push({
      id: "journey-setup-computer",
      label: "Set Up This Computer",
      description: "Install Java, Android tools, and recommended extensions",
      done: false,
      commandId: "ftc.setUpComputer",
      commandTitle: "Set Up This Computer",
    });
  }
  if (!projectDone) {
    rows.push({
      id: "journey-obtain-project",
      label: "Get or open FTC project",
      description: "Clone or open your team's SDK project",
      done: false,
      commandId: "ftc.obtainProject",
      commandTitle: "Get or Open FTC Project",
    });
  }
  if (!connectDone) {
    rows.push({
      id: "journey-connect-robot",
      label: "Connect My Robot (USB)",
      description: "Cable, authorize, and pick your Control Hub",
      done: false,
      commandId: "ftc.connectRobotUsb",
      commandTitle: "Connect My Robot (USB First)",
    });
  }

  return rows.map(journeyRow);
}

export function buildJourneySectionNodes(
  startHereCompleted: readonly StartHereStepId[],
  milestoneCompleted: readonly MilestoneStepId[],
  options?: { includeFocusedStartHere?: boolean },
): RobotNode[] {
  const journey = buildJourneyNodes(startHereCompleted, milestoneCompleted);
  if (options?.includeFocusedStartHere) {
    const focused = buildFocusedStartHereNodes(startHereCompleted);
    const ids = new Set(focused.map((n) => n.id));
    const deduped = journey.filter((n) => !ids.has(n.id));
    return [...focused, ...deduped];
  }
  return journey;
}

/** @deprecated Use buildJourneyNodeSpecs — kept for tests migrating from getting-started-nodes. */
export function buildGettingStartedTreeNodes(
  completed: readonly StartHereStepId[],
): JourneyTreeNodeSpec[] {
  const machineDone = isStartHereStepComplete(completed, "machine-checks");
  const projectDone = isStartHereStepComplete(completed, "project-folder");
  const connectDone = isStartHereStepComplete(completed, "connect-robot");
  const firstOpModeDone = isStartHereStepComplete(completed, "first-opmode");
  const doneCount = countStartHereCompleted(completed);
  const total = START_HERE_STEPS.length;

  return [
    {
      id: "getting-started-start-here",
      label: "Start Here (recommended)",
      description: `${doneCount}/${total} steps — guided checklist + doc`,
      done: doneCount === total,
      commandId: "ftc.startHere",
      commandTitle: "Start Here",
    },
    {
      id: "getting-started-doctor",
      label: "Run Environment Check",
      description: machineDone ? "Passed in Prepare this computer" : "Java, adb, SDK, project",
      done: machineDone,
      commandId: "ftc.runDoctor",
      commandTitle: "Run Environment Check",
    },
    {
      id: "getting-started-setup-computer",
      label: "Set Up This Computer",
      description: machineDone ? "Marked complete in Start Here" : "Install only what's missing",
      done: machineDone,
      commandId: "ftc.setUpComputer",
      commandTitle: "Set Up This Computer",
    },
    {
      id: "getting-started-obtain-project",
      label: "Get or open FTC project",
      description: projectDone ? "Marked complete in Start Here" : "Clone or open team SDK",
      done: projectDone,
      commandId: "ftc.obtainProject",
      commandTitle: "Get or Open FTC Project",
    },
    {
      id: "getting-started-setup-project",
      label: "Set Up This FTC Project",
      description: projectDone ? "Marked complete in Start Here" : "Tasks, settings, project root",
      done: projectDone,
      commandId: "ftc.setUpProject",
      commandTitle: "Set Up This FTC Project",
    },
    {
      id: "getting-started-connect-robot",
      label: "Connect My Robot (USB)",
      description: connectDone ? "Marked complete in Start Here" : "Cable, authorize, pick device",
      done: connectDone,
      commandId: "ftc.connectRobotUsb",
      commandTitle: "Connect My Robot (USB First)",
    },
    {
      id: "getting-started-first-opmode",
      label: "First OpMode Journey",
      description: firstOpModeDone
        ? "Marked complete in Start Here"
        : "Create, deploy, Driver Station Init/Start",
      done: firstOpModeDone,
      commandId: "ftc.firstOpModeJourney",
      commandTitle: "First OpMode Journey",
    },
  ];
}

/** @deprecated Use buildJourneyNodeSpecs — kept for tests migrating from milestone-checklist-nodes. */
export function buildMilestoneChecklistNodeSpecs(
  completed: readonly MilestoneStepId[],
): JourneyTreeNodeSpec[] {
  const doneCount = countMilestonesCompleted(completed);
  const total = MILESTONE_STEPS.length;

  const rows: JourneyTreeNodeSpec[] = [
    {
      id: "milestone-summary",
      label: `${doneCount}/${total} milestones`,
      description: doneCount === total ? "Competition-ready checklist complete" : "Track your progress",
      done: doneCount === total,
    },
    {
      id: "milestone-device-docs",
      label: "Device connections guide",
      description: "USB, Wi‑Fi, authorization",
      done: false,
      commandId: "ftc.openDeviceConnectionsDoc",
      commandTitle: "Open Device Connections Doc",
      icon: "book",
    },
  ];

  for (const step of MILESTONE_STEPS) {
    rows.push({
      id: `milestone-${step.id}`,
      label: step.title,
      description: step.description,
      done: isMilestoneComplete(completed, step.id),
      commandId: commandForMilestone(step.id),
      commandTitle: commandTitleForMilestone(step.id),
    });
  }

  return rows;
}
