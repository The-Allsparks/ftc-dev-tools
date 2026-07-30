import { getPassedHardwareChecklistIds, getVisionHardwareChecklists } from "./checklists.js";
import {
  assertMockTestedOnlyUnlessHardwareValidated,
  getVisionFeatureMaturity,
} from "./maturity.js";
import type { VisionAutomatedCoverage, VisionValidationReport } from "./types.js";

export const VISION_VALIDATION_SCHEMA_VERSION = "1.0.0";

/** Flags indicating automated test coverage exists in CI (VISION-17 foundation). */
export const VISION_AUTOMATED_COVERAGE: VisionAutomatedCoverage = {
  providerRegistry: true,
  capabilityNegotiation: true,
  configurationSchema: true,
  ambiguousDeviceDiscovery: true,
  probeTimeoutAndCancellation: true,
  malformedLimelightResponses: true,
  staleResultDetection: true,
  dashboardDetection: true,
  visionPortalBridgeFixtures: true,
  easyOpenCvDetection: true,
  pipelineArtifacts: true,
  sessionSchemaValidation: true,
  corruptSessionRejection: true,
  mcpRedaction: true,
  crossPlatformPaths: true,
};

export function getVisionValidationStatus(): VisionValidationReport {
  const featureMaturity = getVisionFeatureMaturity();
  const hardwareChecklists = getVisionHardwareChecklists();
  const passedIds = getPassedHardwareChecklistIds(hardwareChecklists);

  const mockTestedFeatures = featureMaturity.filter(
    (entry) => entry.maturity === "Mock-tested",
  ).length;
  const hardwareValidatedFeatures = featureMaturity.filter((entry) =>
    [
      "Android phone tested",
      "REV Control Hub tested",
      "Multi-team field tested",
      "Stable",
    ].includes(entry.maturity),
  ).length;
  const pendingHardwareChecks = hardwareChecklists.filter(
    (entry) => entry.status === "pending" || entry.status === "blocked",
  ).length;

  const mockOnlyPolicyOk = assertMockTestedOnlyUnlessHardwareValidated(featureMaturity, passedIds);

  return {
    schemaVersion: VISION_VALIDATION_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    message: mockOnlyPolicyOk
      ? "Vision Lab features are mock-tested in CI; physical hardware validation checklists are pending."
      : "Vision maturity policy violation: hardware-validated labels require passing checklists.",
    automatedCoverage: { ...VISION_AUTOMATED_COVERAGE },
    featureMaturity,
    hardwareChecklists,
    summary: {
      mockTestedFeatures,
      hardwareValidatedFeatures,
      pendingHardwareChecks,
    },
  };
}
