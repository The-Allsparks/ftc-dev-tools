/** Persisted under VS Code Memento key {@link START_HERE_PROGRESS_KEY}. */
export const START_HERE_PROGRESS_KEY = "ftc.startHere.progress";

export const START_HERE_STEP_IDS = [
  "intro",
  "machine-checks",
  "project-folder",
  "connect-robot",
  "build",
  "deploy",
  "logs",
] as const;

export type StartHereStepId = (typeof START_HERE_STEP_IDS)[number];

export interface StartHereStep {
  id: StartHereStepId;
  title: string;
  description: string;
  /** Existing VS Code command palette IDs the user can run for this step. */
  commandIds?: readonly string[];
  /** Step may be marked complete after the user confirms (no auto-complete on command run). */
  allowManualComplete: boolean;
}

export const START_HERE_STEPS: readonly StartHereStep[] = [
  {
    id: "intro",
    title: "Welcome",
    description:
      "This guided checklist walks you from a fresh machine to your first robot deploy using commands you can run anytime from the Command Palette (FTC: …). Work at your own pace—you can leave and resume later.",
    allowManualComplete: true,
  },
  {
    id: "machine-checks",
    title: "Prepare this computer",
    description:
      "Install recommended editor extensions, run the guided computer setup (you approve each install step), and check that Java, Android tools, and adb look healthy. Nothing installs silently.",
    commandIds: [
      "ftc.configureRecommendedExtensions",
      "ftc.setUpComputer",
      "ftc.installCli",
      "ftc.runDoctor",
    ],
    allowManualComplete: true,
  },
  {
    id: "project-folder",
    title: "Open your FTC project",
    description:
      "Open the Android Studio project folder (the one with settings.gradle and TeamCode), pick the correct project root if needed, and apply team-friendly VS Code settings for that repo.",
    commandIds: ["ftc.selectProjectRoot", "ftc.setUpProject"],
    allowManualComplete: true,
  },
  {
    id: "connect-robot",
    title: "Connect the robot",
    description:
      "Plug in USB or use Wi-Fi adb, then confirm the Control Hub or phone appears and pick which device to deploy to.",
    commandIds: ["ftc.showDevices", "ftc.selectDevice", "ftc.wifiConnect"],
    allowManualComplete: true,
  },
  {
    id: "build",
    title: "Build robot code",
    description: "Compile the FTC SDK project and confirm the APK builds without errors.",
    commandIds: ["ftc.build"],
    allowManualComplete: true,
  },
  {
    id: "deploy",
    title: "Deploy to the robot",
    description:
      "Install the built APK on the selected device. Build-and-deploy is available if you prefer one step.",
    commandIds: ["ftc.deploy", "ftc.buildAndDeploy"],
    allowManualComplete: true,
  },
  {
    id: "logs",
    title: "View robot logs",
    description:
      "Stream TeamCode logcat from the robot to catch runtime issues after deploy. Stop the stream from the Command Palette when you are done.",
    commandIds: ["ftc.viewLogs"],
    allowManualComplete: true,
  },
];

const STEP_BY_ID = new Map(START_HERE_STEPS.map((step) => [step.id, step]));

export function getStartHereStep(id: StartHereStepId): StartHereStep {
  const step = STEP_BY_ID.get(id);
  if (!step) {
    throw new Error(`Unknown Start Here step: ${id}`);
  }
  return step;
}

export function isStartHereStepId(value: string): value is StartHereStepId {
  return (START_HERE_STEP_IDS as readonly string[]).includes(value);
}

/** Completed step IDs in canonical flow order. */
export function normalizeStartHereProgress(raw: unknown): StartHereStepId[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set<StartHereStepId>();
  const ordered: StartHereStepId[] = [];
  for (const entry of raw) {
    if (typeof entry !== "string" || !isStartHereStepId(entry) || seen.has(entry)) {
      continue;
    }
    seen.add(entry);
    ordered.push(entry);
  }
  return ordered.sort((a, b) => START_HERE_STEP_IDS.indexOf(a) - START_HERE_STEP_IDS.indexOf(b));
}

export function serializeStartHereProgress(
  completed: Iterable<StartHereStepId>,
): StartHereStepId[] {
  return normalizeStartHereProgress([...completed]);
}

export function isStartHereStepComplete(
  completed: readonly StartHereStepId[],
  id: StartHereStepId,
): boolean {
  return completed.includes(id);
}

export function getNextStartHereStep(
  completed: readonly StartHereStepId[],
): StartHereStep | undefined {
  for (const id of START_HERE_STEP_IDS) {
    if (!completed.includes(id)) {
      return getStartHereStep(id);
    }
  }
  return undefined;
}

export function countStartHereCompleted(completed: readonly StartHereStepId[]): number {
  const set = new Set(completed);
  return START_HERE_STEP_IDS.filter((id) => set.has(id)).length;
}
