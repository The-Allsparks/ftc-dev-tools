/** Feature maturity levels aligned with docs/feature-maturity.md */
export type GoldenPathFeatureMaturityLevel =
  | "Mock-tested"
  | "Desktop integration tested"
  | "Android phone tested"
  | "REV Control Hub tested"
  | "Multi-team field tested"
  | "Stable"
  | "Not shipped"
  | "Deferred";

export type GoldenPathHardwareChecklistStatus = "pending" | "pass" | "fail" | "partial" | "blocked";

export interface GoldenPathFeatureMaturityEntry {
  featureId: string;
  label: string;
  maturity: GoldenPathFeatureMaturityLevel;
  automatedTests: string[];
  /** ISO date (YYYY-MM-DD) of supporting hardware test report, when validated. */
  evidenceDate?: string;
  notes?: string;
}

export interface GoldenPathHardwareChecklistEntry {
  id: string;
  label: string;
  platform: "windows" | "macos" | "linux" | "any";
  connection?: "usb" | "wifi-adb" | "any";
  device?: string;
  status: GoldenPathHardwareChecklistStatus;
  /** ISO date (YYYY-MM-DD) when this row passed physical validation. */
  evidenceDate?: string;
  blockedReason?: string;
}

export interface GoldenPathAutomatedCoverage {
  projectDetection: boolean;
  doctorChecks: boolean;
  deviceSelectionRules: boolean;
  adbOutputParsing: boolean;
  gradleBuildService: boolean;
  deployDryRun: boolean;
  logcatParsing: boolean;
  errorInterpretation: boolean;
  diagnosticBundle: boolean;
  environmentSnapshot: boolean;
  multiDeviceRefusal: boolean;
  wrongFolderDiscovery: boolean;
}

export interface GoldenPathValidationReport {
  schemaVersion: string;
  generatedAt: string;
  message: string;
  supportedAlphaConfiguration: SupportedAlphaConfiguration;
  automatedCoverage: GoldenPathAutomatedCoverage;
  featureMaturity: GoldenPathFeatureMaturityEntry[];
  hardwareChecklists: GoldenPathHardwareChecklistEntry[];
  summary: {
    mockTestedFeatures: number;
    hardwareValidatedFeatures: number;
    pendingHardwareChecks: number;
  };
}

/** Documented alpha target — see docs/testing/supported-alpha-configuration.md */
export interface SupportedAlphaConfiguration {
  hostOs: string;
  ides: string[];
  robotPlatform: string;
  robotLanguage: string;
  projectType: string;
  ftcSdkRange: string;
  primaryConnection: string;
  buildSystem: string;
  deployment: string;
  logs: string;
}
