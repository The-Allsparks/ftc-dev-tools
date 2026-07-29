import {
  START_HERE_STEPS,
  countStartHereCompleted,
  isStartHereStepComplete,
  type StartHereStepId,
} from "@ftc-dev-tools/shared";

export type GettingStartedTreeNode = {
  id: string;
  label: string;
  description?: string;
  commandId: string;
  commandTitle: string;
};

function checklistLabel(base: string, done: boolean): string {
  return done ? `$(check) ${base}` : `$(circle-outline) ${base}`;
}

/** Sidebar getting started — Start Here is the primary entry. */
export function buildGettingStartedTreeNodes(
  completed: readonly StartHereStepId[],
): GettingStartedTreeNode[] {
  const machineDone = isStartHereStepComplete(completed, "machine-checks");
  const projectDone = isStartHereStepComplete(completed, "project-folder");
  const doneCount = countStartHereCompleted(completed);
  const total = START_HERE_STEPS.length;

  return [
    {
      id: "getting-started-start-here",
      label: checklistLabel("Start Here (recommended)", doneCount === total),
      description: `${doneCount}/${total} steps — guided checklist + doc`,
      commandId: "ftc.startHere",
      commandTitle: "Start Here",
    },
    {
      id: "getting-started-doctor",
      label: checklistLabel("Run Environment Check", machineDone),
      description: machineDone ? "Passed in Prepare this computer" : "Java, adb, SDK, project",
      commandId: "ftc.runDoctor",
      commandTitle: "Run Environment Check",
    },
    {
      id: "getting-started-setup-computer",
      label: checklistLabel("Set Up This Computer", machineDone),
      description: machineDone ? "Marked complete in Start Here" : "Install only what's missing",
      commandId: "ftc.setUpComputer",
      commandTitle: "Set Up This Computer",
    },
    {
      id: "getting-started-obtain-project",
      label: checklistLabel("Get or open FTC project", projectDone),
      description: projectDone ? "Marked complete in Start Here" : "Clone or open team SDK",
      commandId: "ftc.obtainProject",
      commandTitle: "Get or Open FTC Project",
    },
    {
      id: "getting-started-setup-project",
      label: checklistLabel("Set Up This FTC Project", projectDone),
      description: projectDone ? "Marked complete in Start Here" : "Tasks, settings, project root",
      commandId: "ftc.setUpProject",
      commandTitle: "Set Up This FTC Project",
    },
  ];
}
