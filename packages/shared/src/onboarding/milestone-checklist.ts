/** Persisted under VS Code workspaceState key {@link MILESTONE_PROGRESS_KEY}. */
export const MILESTONE_PROGRESS_KEY = "ftc.milestone.progress";

export const DEVICE_CONNECTIONS_DOC_URL =
  "https://github.com/The-Allsparks/ftc-dev-tools/blob/main/docs/device-connections.md";

export const MILESTONE_STEP_IDS = [
  "doctor-ok",
  "device-authorized",
  "build-ok",
  "deploy-ok",
  "opmode-on-driver-station",
  "teamcode-logs",
] as const;

export type MilestoneStepId = (typeof MILESTONE_STEP_IDS)[number];

export interface MilestoneStep {
  id: MilestoneStepId;
  title: string;
  description: string;
  /** Updated automatically when a matching tool run succeeds. */
  autoComplete: boolean;
}

export const MILESTONE_STEPS: readonly MilestoneStep[] = [
  {
    id: "doctor-ok",
    title: "Environment check passed",
    description: "Run Environment Check with no blocking failures (Java, adb, project detected).",
    autoComplete: true,
  },
  {
    id: "device-authorized",
    title: "Robot device authorized",
    description: "adb sees your Control Hub or phone as authorized for deploy.",
    autoComplete: true,
  },
  {
    id: "build-ok",
    title: "Build succeeded",
    description: "TeamCode compiled and produced an APK without errors.",
    autoComplete: true,
  },
  {
    id: "deploy-ok",
    title: "Deploy succeeded",
    description: "APK installed on the selected deployment device.",
    autoComplete: true,
  },
  {
    id: "opmode-on-driver-station",
    title: "OpMode on Driver Station",
    description:
      "Init on Driver Station, pick your OpMode, and Start — robot responds as expected.",
    autoComplete: false,
  },
  {
    id: "teamcode-logs",
    title: "TeamCode logs reviewed",
    description: "Stream TeamCode logcat at least once while debugging or after deploy.",
    autoComplete: true,
  },
];

const STEP_BY_ID = new Map(MILESTONE_STEPS.map((step) => [step.id, step]));

export function getMilestoneStep(id: MilestoneStepId): MilestoneStep {
  const step = STEP_BY_ID.get(id);
  if (!step) {
    throw new Error(`Unknown milestone step: ${id}`);
  }
  return step;
}

export function isMilestoneStepId(value: string): value is MilestoneStepId {
  return (MILESTONE_STEP_IDS as readonly string[]).includes(value);
}

export function normalizeMilestoneProgress(raw: unknown): MilestoneStepId[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set<MilestoneStepId>();
  const ordered: MilestoneStepId[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string" || !isMilestoneStepId(entry) || seen.has(entry)) {
      continue;
    }
    seen.add(entry);
    ordered.push(entry);
  }
  return ordered.sort((a, b) => MILESTONE_STEP_IDS.indexOf(a) - MILESTONE_STEP_IDS.indexOf(b));
}

export function serializeMilestoneProgress(
  completed: Iterable<MilestoneStepId>,
): MilestoneStepId[] {
  return normalizeMilestoneProgress([...completed]);
}

export function isMilestoneComplete(
  completed: readonly MilestoneStepId[],
  id: MilestoneStepId,
): boolean {
  return completed.includes(id);
}

export function countMilestonesCompleted(completed: readonly MilestoneStepId[]): number {
  const set = new Set(completed);
  return MILESTONE_STEP_IDS.filter((id) => set.has(id)).length;
}
