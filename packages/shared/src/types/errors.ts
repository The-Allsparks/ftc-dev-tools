export interface FriendlyError {
  code: string;
  title: string;
  summary: string;
  suggestedActions: string[];
  technicalDetails?: string;
}

export type CheckStatus = "pass" | "warn" | "fail" | "skip";

/** Doctor check grouping (machine vs project foundation; more categories in future issues). */
export type DoctorCheckCategory = "machine" | "project" | "robot" | "other";

export interface DoctorCheck {
  id: string;
  label: string;
  status: CheckStatus;
  required: boolean;
  detail?: string;
  friendlyError?: FriendlyError;
  /** Populated on reports from `runDoctor` for agents and structured consumers. */
  category?: DoctorCheckCategory;
}

export interface DoctorReportSection {
  id: DoctorCheckCategory;
  title: string;
  ready: boolean;
  checks: DoctorCheck[];
}

export interface DoctorReportSections {
  machine: DoctorReportSection;
  project: DoctorReportSection;
  robot?: DoctorReportSection;
  other?: DoctorReportSection;
}

export interface DoctorReadiness {
  computerReady: boolean;
  projectReadyToBuild: boolean;
  robotReadyToDeploy: boolean;
}

export interface DoctorReport {
  ready: boolean;
  readiness: DoctorReadiness;
  checks: DoctorCheck[];
  /** Checks grouped by section with section-level ready flags aligned with `readiness`. */
  sections: DoctorReportSections;
  summaryLine: string;
  generatedAt: string;
  version: string;
}
