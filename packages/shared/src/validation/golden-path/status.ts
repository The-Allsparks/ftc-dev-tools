import { getPassedGoldenPathChecklistIds, getGoldenPathHardwareChecklists } from "./checklists.js";
import {
  assertMockTestedOnlyUnlessHardwareValidated,
  getGoldenPathFeatureMaturity,
} from "./maturity.js";
import type {
  GoldenPathAutomatedCoverage,
  GoldenPathValidationReport,
  SupportedAlphaConfiguration,
} from "./types.js";

export const GOLDEN_PATH_VALIDATION_SCHEMA_VERSION = "1.0.0";

export const SUPPORTED_ALPHA_CONFIGURATION: SupportedAlphaConfiguration = {
  hostOs: "Windows 11",
  ides: ["VS Code", "Cursor"],
  robotPlatform: "REV Control Hub",
  robotLanguage: "Java",
  projectType: "Official-style FTC Android project (Gradle Wrapper, TeamCode module)",
  ftcSdkRange: "11.0.x – 11.1.x (Maven coordinates in build.dependencies.gradle)",
  primaryConnection: "USB ADB (Wi-Fi ADB documented but not alpha-gated)",
  buildSystem: "Checked-in Gradle Wrapper (gradlew / gradlew.bat)",
  deployment: "ADB install via ftc deploy",
  logs: "Bounded or streaming TeamCode logcat via ftc logs",
};

/** Flags indicating automated test coverage exists in CI for the golden path. */
export const GOLDEN_PATH_AUTOMATED_COVERAGE: GoldenPathAutomatedCoverage = {
  projectDetection: true,
  doctorChecks: true,
  deviceSelectionRules: true,
  adbOutputParsing: true,
  gradleBuildService: true,
  deployDryRun: true,
  logcatParsing: true,
  errorInterpretation: true,
  diagnosticBundle: true,
  environmentSnapshot: true,
  multiDeviceRefusal: true,
  wrongFolderDiscovery: true,
};

export function getGoldenPathValidationStatus(): GoldenPathValidationReport {
  const featureMaturity = getGoldenPathFeatureMaturity();
  const hardwareChecklists = getGoldenPathHardwareChecklists();
  const passedIds = getPassedGoldenPathChecklistIds(hardwareChecklists);

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
    schemaVersion: GOLDEN_PATH_VALIDATION_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    message: mockOnlyPolicyOk
      ? "Golden-path features are mock-tested in CI; physical Control Hub validation checklists are pending."
      : "Golden-path maturity policy violation: hardware-validated labels require passing checklists with dated evidence.",
    supportedAlphaConfiguration: { ...SUPPORTED_ALPHA_CONFIGURATION },
    automatedCoverage: { ...GOLDEN_PATH_AUTOMATED_COVERAGE },
    featureMaturity,
    hardwareChecklists,
    summary: {
      mockTestedFeatures,
      hardwareValidatedFeatures,
      pendingHardwareChecks,
    },
  };
}
