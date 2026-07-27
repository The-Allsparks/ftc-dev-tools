export interface FriendlyError {
  code: string;
  title: string;
  summary: string;
  suggestedActions: string[];
  technicalDetails?: string;
}

export type CheckStatus = "pass" | "warn" | "fail" | "skip";

export interface DoctorCheck {
  id: string;
  label: string;
  status: CheckStatus;
  required: boolean;
  detail?: string;
  friendlyError?: FriendlyError;
}

export interface DoctorReport {
  ready: boolean;
  checks: DoctorCheck[];
  summaryLine: string;
  generatedAt: string;
  version: string;
}
