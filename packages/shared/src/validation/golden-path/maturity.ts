import type { GoldenPathFeatureMaturityEntry, GoldenPathFeatureMaturityLevel } from "./types.js";

export const GOLDEN_PATH_FEATURE_MATURITY: GoldenPathFeatureMaturityEntry[] = [
  {
    featureId: "installation",
    label: "Installation (CLI + extension + dependencies)",
    maturity: "Mock-tested",
    automatedTests: ["cli-flows.test.ts", "run-doctor-wrong-folder.test.ts"],
    notes: "Physical install on clean Windows 11 machines pending.",
  },
  {
    featureId: "extension-activation",
    label: "Extension activation in VS Code / Cursor",
    maturity: "Mock-tested",
    automatedTests: [],
    notes: "Manual activation checklist in golden-path protocol.",
  },
  {
    featureId: "project-detection",
    label: "Official-style FTC project detection",
    maturity: "Mock-tested",
    automatedTests: ["project-detection.test.ts", "discover-ftc-root.test.ts"],
  },
  {
    featureId: "doctor",
    label: "Environment doctor",
    maturity: "Mock-tested",
    automatedTests: ["cli-flows.test.ts", "run-doctor-wrong-folder.test.ts"],
    notes: "Desktop integration common on maintainer machines.",
  },
  {
    featureId: "device-discovery",
    label: "ADB device discovery and selection",
    maturity: "Mock-tested",
    automatedTests: ["adb-parsing.test.ts", "device-selection.test.ts", "deploy-mock.test.ts"],
  },
  {
    featureId: "build",
    label: "Gradle Wrapper build",
    maturity: "Mock-tested",
    automatedTests: ["build-service.test.ts", "gradle-wrapper.test.ts"],
  },
  {
    featureId: "usb-deploy",
    label: "USB deployment (ADB install)",
    maturity: "Mock-tested",
    automatedTests: ["architectural-seams.test.ts", "deploy-mock.test.ts"],
    notes: "Needs dated Control Hub test report for hardware-validated label.",
  },
  {
    featureId: "driver-station-handoff",
    label: "Driver Station launch handoff",
    maturity: "Mock-tested",
    automatedTests: ["deploy-mock.test.ts"],
    notes: "Manual Driver Station steps documented in golden-path protocol.",
  },
  {
    featureId: "opmode-handoff",
    label: "OpMode execution handoff",
    maturity: "Mock-tested",
    automatedTests: [],
    notes: "Requires physical Control Hub + Driver Station validation.",
  },
  {
    featureId: "log-capture",
    label: "Bounded TeamCode logcat",
    maturity: "Mock-tested",
    automatedTests: ["logcat.test.ts", "golden-path-fixtures.test.ts"],
  },
  {
    featureId: "repeat-deploy",
    label: "Repeat build / deploy / log cycle",
    maturity: "Mock-tested",
    automatedTests: ["deploy-mock.test.ts"],
    notes: "Repeated-cycle physical test documented in golden-path protocol §G.",
  },
  {
    featureId: "failure-recovery",
    label: "Failure recovery (disconnect, multi-device, wrong folder)",
    maturity: "Mock-tested",
    automatedTests: [
      "device-selection.test.ts",
      "run-doctor-wrong-folder.test.ts",
      "architectural-seams.test.ts",
    ],
  },
  {
    featureId: "diagnostic-bundle",
    label: "Redacted golden-path diagnostic bundle",
    maturity: "Mock-tested",
    automatedTests: ["golden-path-bundle.test.ts"],
  },
  {
    featureId: "environment-snapshot",
    label: "Version and environment snapshot",
    maturity: "Mock-tested",
    automatedTests: ["environment-snapshot.test.ts"],
  },
];

export function getGoldenPathFeatureMaturity(): GoldenPathFeatureMaturityEntry[] {
  return GOLDEN_PATH_FEATURE_MATURITY.map((entry) => ({ ...entry }));
}

const HARDWARE_VALIDATED_LEVELS: ReadonlySet<GoldenPathFeatureMaturityLevel> = new Set([
  "Android phone tested",
  "REV Control Hub tested",
  "Multi-team field tested",
  "Stable",
]);

export function assertMockTestedOnlyUnlessHardwareValidated(
  features: ReadonlyArray<GoldenPathFeatureMaturityEntry>,
  passedChecklistIds: ReadonlySet<string>,
): boolean {
  if (passedChecklistIds.size === 0) {
    return !features.some((entry) => HARDWARE_VALIDATED_LEVELS.has(entry.maturity));
  }
  return true;
}
