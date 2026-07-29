import * as vscode from "vscode";
import {
  MILESTONE_PROGRESS_KEY,
  MILESTONE_STEP_IDS,
  countMilestonesCompleted,
  normalizeMilestoneProgress,
  serializeMilestoneProgress,
  type MilestoneStepId,
} from "@ftc-dev-tools/shared";

const progressEmitter = new vscode.EventEmitter<void>();
export const onMilestoneProgressChanged = progressEmitter.event;

export class MilestoneProgressStore {
  constructor(private readonly context: vscode.ExtensionContext) {}

  load(): MilestoneStepId[] {
    return normalizeMilestoneProgress(this.context.workspaceState.get(MILESTONE_PROGRESS_KEY));
  }

  async mark(id: MilestoneStepId): Promise<MilestoneStepId[]> {
    const next = serializeMilestoneProgress([...this.load(), id]);
    await this.context.workspaceState.update(MILESTONE_PROGRESS_KEY, next);
    progressEmitter.fire();
    return next;
  }

  async reset(): Promise<void> {
    await this.context.workspaceState.update(MILESTONE_PROGRESS_KEY, []);
    progressEmitter.fire();
  }
}

export function milestoneSummaryTooltip(completed: readonly MilestoneStepId[]): string {
  const done = countMilestonesCompleted(completed);
  const total = MILESTONE_STEP_IDS.length;
  return `FTC Dev Tools — ${done}/${total} competition milestones complete. Click to refresh status.`;
}
