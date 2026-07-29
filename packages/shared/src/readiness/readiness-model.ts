import type { DoctorCheck, DoctorReport } from "../types/errors.js";
import type { MilestoneStepId } from "../onboarding/milestone-checklist.js";
import { MILESTONE_STEP_IDS, isMilestoneComplete } from "../onboarding/milestone-checklist.js";

export type ReadinessLevel = "unknown" | "pass" | "warn" | "fail";

export type ReadinessCategoryId = "computer" | "project" | "device" | "deploy" | "competition";

export interface ReadinessCategoryState {
  id: ReadinessCategoryId;
  title: string;
  level: ReadinessLevel;
  summary: string;
  /** When false, a failure here does not block computer-only workflows. */
  requiredForDeploy: boolean;
  nextAction?: string;
}

export interface ReadinessSnapshot {
  categories: ReadinessCategoryState[];
  /** True only when deploy could reasonably succeed (computer + project + authorized device). */
  deployReady: boolean;
  /** Derived from workspace milestone checklist when provided. */
  competitionReady: boolean;
}

function worstLevel(a: ReadinessLevel, b: ReadinessLevel): ReadinessLevel {
  const rank: Record<ReadinessLevel, number> = { pass: 0, unknown: 1, warn: 2, fail: 3 };
  return rank[a] >= rank[b] ? a : b;
}

function levelFromChecks(checks: DoctorCheck[], ids: Set<string>): ReadinessLevel {
  const relevant = checks.filter((c) => ids.has(c.id));
  if (relevant.length === 0) {
    return "unknown";
  }
  if (relevant.every((c) => c.status === "skip")) {
    return "unknown";
  }
  let level: ReadinessLevel = "pass";
  for (const check of relevant) {
    if (check.status === "skip") {
      continue;
    }
    if (check.status === "fail") {
      level = worstLevel(level, "fail");
    } else if (check.status === "warn") {
      level = worstLevel(level, "warn");
    }
  }
  return level;
}

function nextActionFromChecks(checks: DoctorCheck[]): string | undefined {
  const failed = checks.find((c) => c.status === "fail" && c.friendlyError?.suggestedActions?.[0]);
  if (failed?.friendlyError?.suggestedActions?.[0]) {
    return failed.friendlyError.suggestedActions[0];
  }
  const warned = checks.find((c) => c.status === "warn" && c.friendlyError?.suggestedActions?.[0]);
  return warned?.friendlyError?.suggestedActions[0];
}

const COMPUTER_IDS = new Set(["os", "node", "java", "android-sdk", "adb"]);
const PROJECT_IDS = new Set(["ftc-project", "gradle-wrapper", "gradle-init", "ftc-sdk-version"]);
const DEVICE_IDS = new Set(["devices"]);
const NETWORK_IDS = new Set(["wifi-console", "wifi-robot-interface"]);

export function buildReadinessSnapshotFromDoctor(
  report: Pick<DoctorReport, "checks" | "readiness">,
  options?: { milestoneCompleted?: readonly MilestoneStepId[] },
): ReadinessSnapshot {
  const checks = report.checks;
  const computerLevel = levelFromChecks(checks, COMPUTER_IDS);
  const projectLevel = levelFromChecks(checks, PROJECT_IDS);
  const deviceLevel = levelFromChecks(checks, DEVICE_IDS);
  const networkLevel = levelFromChecks(checks, NETWORK_IDS);

  let deviceSummary = "No device check ran.";
  const deviceCheck = checks.find((c) => c.id === "devices");
  if (deviceCheck?.status === "skip") {
    deviceSummary = deviceCheck.detail ?? "Device not tested (adb unavailable in this doctor run).";
  } else if (deviceCheck?.detail) {
    deviceSummary = deviceCheck.detail;
  } else if (deviceLevel === "fail") {
    deviceSummary = "No authorized deployment device detected.";
  } else if (deviceLevel === "pass") {
    deviceSummary = "Authorized deployment device detected.";
  }

  const deployLevel: ReadinessLevel =
    computerLevel === "fail" || projectLevel === "fail"
      ? "fail"
      : computerLevel === "warn" || projectLevel === "warn"
        ? "warn"
        : deviceLevel === "pass"
          ? "pass"
          : deviceLevel === "fail"
            ? "fail"
            : "unknown";

  const deployReady = deployLevel === "pass";

  const milestoneCompleted = options?.milestoneCompleted ?? [];
  const competitionReady =
    MILESTONE_STEP_IDS.every((id) => isMilestoneComplete(milestoneCompleted, id)) && deployReady;

  const categories: ReadinessCategoryState[] = [
    {
      id: "computer",
      title: "Computer ready",
      level: computerLevel,
      summary:
        computerLevel === "pass"
          ? "JDK, Android SDK, and adb look usable on this machine."
          : "Fix Java, Android SDK, or adb before deploying.",
      requiredForDeploy: true,
      nextAction:
        computerLevel === "pass"
          ? undefined
          : nextActionFromChecks(checks.filter((c) => COMPUTER_IDS.has(c.id))),
    },
    {
      id: "project",
      title: "Project ready",
      level: projectLevel,
      summary:
        projectLevel === "pass"
          ? "Official FTC project and Gradle wrapper look healthy."
          : "Open the correct FTC project root and fix Gradle setup.",
      requiredForDeploy: true,
      nextAction:
        projectLevel === "pass"
          ? undefined
          : nextActionFromChecks(checks.filter((c) => PROJECT_IDS.has(c.id))),
    },
    {
      id: "device",
      title: "Device ready",
      level: deviceLevel,
      summary: deviceSummary,
      requiredForDeploy: true,
      nextAction:
        deviceLevel === "pass"
          ? undefined
          : (deviceCheck?.friendlyError?.suggestedActions?.[0] ??
            "Connect and authorize the robot over USB."),
    },
    {
      id: "deploy",
      title: "Deploy ready",
      level: deployLevel,
      summary: deployReady
        ? "Environment checks suggest deploy could succeed to the selected device."
        : deployLevel === "unknown"
          ? "Plug in and authorize a robot, then re-run the environment check."
          : "Fix computer, project, or device checks before deploying.",
      requiredForDeploy: true,
      nextAction: deployReady ? undefined : "Run FTC: Connect My Robot (USB First) or ftc devices.",
    },
    {
      id: "competition",
      title: "Competition ready",
      level: competitionReady ? "pass" : milestoneCompleted.length > 0 ? "warn" : "unknown",
      summary: competitionReady
        ? "Competition readiness milestones are complete for this workspace."
        : "Complete the Competition readiness checklist after a successful deploy and Driver Station test.",
      requiredForDeploy: false,
      nextAction: competitionReady
        ? undefined
        : "Open FTC Robot → Competition readiness in the sidebar.",
    },
  ];

  if (networkLevel === "warn" || networkLevel === "fail") {
    const deploy = categories.find((c) => c.id === "deploy");
    if (deploy && deploy.level === "pass") {
      deploy.level = "warn";
      deploy.summary = `${deploy.summary} (Wi‑Fi / dual-NIC checks need attention.)`;
    }
  }

  return { categories, deployReady, competitionReady };
}

export function formatDeployReadySummary(snapshot: ReadinessSnapshot): string {
  if (snapshot.deployReady) {
    return "Ready to deploy — computer, project, and an authorized device look good.";
  }
  const deploy = snapshot.categories.find((c) => c.id === "deploy");
  return deploy?.summary ?? "Not ready to deploy yet.";
}
