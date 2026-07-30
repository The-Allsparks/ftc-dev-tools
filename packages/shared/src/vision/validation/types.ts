/** Feature maturity levels aligned with docs/feature-maturity.md */
export type VisionFeatureMaturityLevel =
  | "Mock-tested"
  | "Desktop integration tested"
  | "Android phone tested"
  | "REV Control Hub tested"
  | "Multi-team field tested"
  | "Stable"
  | "Not shipped"
  | "Deferred";

export type VisionHardwareChecklistStatus = "pending" | "pass" | "fail" | "partial" | "blocked";

export interface VisionFeatureMaturityEntry {
  featureId: string;
  label: string;
  providerId?: string;
  maturity: VisionFeatureMaturityLevel;
  automatedTests: string[];
  notes?: string;
}

export interface VisionHardwareChecklistEntry {
  id: string;
  label: string;
  platform: "windows" | "macos" | "linux" | "any";
  connection?: "usb" | "wifi-adb" | "dual-nic" | "any";
  device?: string;
  status: VisionHardwareChecklistStatus;
  blockedReason?: string;
}

export interface VisionAutomatedCoverage {
  providerRegistry: boolean;
  capabilityNegotiation: boolean;
  configurationSchema: boolean;
  ambiguousDeviceDiscovery: boolean;
  probeTimeoutAndCancellation: boolean;
  malformedLimelightResponses: boolean;
  staleResultDetection: boolean;
  dashboardDetection: boolean;
  visionPortalBridgeFixtures: boolean;
  easyOpenCvDetection: boolean;
  pipelineArtifacts: boolean;
  sessionSchemaValidation: boolean;
  corruptSessionRejection: boolean;
  mcpRedaction: boolean;
  crossPlatformPaths: boolean;
}

export interface VisionValidationReport {
  schemaVersion: string;
  generatedAt: string;
  message: string;
  automatedCoverage: VisionAutomatedCoverage;
  featureMaturity: VisionFeatureMaturityEntry[];
  hardwareChecklists: VisionHardwareChecklistEntry[];
  summary: {
    mockTestedFeatures: number;
    hardwareValidatedFeatures: number;
    pendingHardwareChecks: number;
  };
}
