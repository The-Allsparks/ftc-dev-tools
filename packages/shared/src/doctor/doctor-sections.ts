import type { DoctorCheck, DoctorReadiness, DoctorReport, DoctorReportSection } from "../types/errors.js";

/** Section ids for doctor output (foundation for future category expansion). */
export type DoctorSectionId = "machine" | "project" | "robot" | "other";

export const DOCTOR_SECTION_ORDER: readonly DoctorSectionId[] = [
  "machine",
  "project",
  "robot",
  "other",
] as const;

export const DOCTOR_SECTION_TITLES: Record<DoctorSectionId, string> = {
  machine: "Machine readiness",
  project: "Project readiness",
  robot: "Robot readiness",
  other: "Optional checks",
};

const CHECK_SECTION_BY_ID: Record<string, DoctorSectionId> = {
  os: "machine",
  node: "machine",
  java: "machine",
  "android-sdk": "machine",
  adb: "machine",
  "ftc-project": "project",
  "gradle-wrapper": "project",
  "gradle-init": "project",
  devices: "robot",
  "wifi-console": "robot",
  "wifi-robot-interface": "robot",
  "ftc-sdk-version": "other",
};

export function categoryForCheckId(checkId: string): DoctorSectionId {
  return CHECK_SECTION_BY_ID[checkId] ?? "other";
}

export function partitionChecksBySection(
  checks: DoctorCheck[],
): Record<DoctorSectionId, DoctorCheck[]> {
  const sections: Record<DoctorSectionId, DoctorCheck[]> = {
    machine: [],
    project: [],
    robot: [],
    other: [],
  };
  for (const check of checks) {
    sections[categoryForCheckId(check.id)].push(check);
  }
  return sections;
}

function sectionIsReady(id: DoctorSectionId, checks: DoctorCheck[], readiness: DoctorReadiness): boolean {
  if (id === "machine") {
    return readiness.computerReady;
  }
  if (id === "project") {
    return readiness.projectReadyToBuild;
  }
  if (id === "robot") {
    return readiness.robotReadyToDeploy;
  }
  return !checks.some((c) => c.status === "fail" || c.status === "warn");
}

export function buildDoctorSections(
  report: Pick<DoctorReport, "checks" | "readiness">,
): DoctorReportSection[] {
  const partitioned = partitionChecksBySection(report.checks);
  return DOCTOR_SECTION_ORDER.filter((id) => partitioned[id].length > 0).map((id) => ({
    id,
    title: DOCTOR_SECTION_TITLES[id],
    ready: sectionIsReady(id, partitioned[id], report.readiness),
    checks: partitioned[id],
  }));
}

export function formatSectionSummaryLine(section: DoctorReportSection): string {
  const status = section.ready ? "ready" : "needs attention";
  return `${section.title}: ${status}`;
}

export function statusMarkForCheck(status: DoctorCheck["status"]): string {
  switch (status) {
    case "pass":
      return "✓";
    case "warn":
      return "!";
    case "skip":
      return "-";
    default:
      return "✗";
  }
}

export function formatDoctorCheckLine(check: DoctorCheck): string {
  const mark = statusMarkForCheck(check.status);
  const detail = check.detail ? ` (${check.detail})` : "";
  return `${mark} ${check.label}${detail}`;
}
