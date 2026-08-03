import { describe, expect, it } from "vitest";
import {
  getGoldenPathValidationStatus,
  GOLDEN_PATH_AUTOMATED_COVERAGE,
  GOLDEN_PATH_FEATURE_MATURITY,
  GOLDEN_PATH_HARDWARE_CHECKLISTS,
  assertGoldenPathMockTestedOnlyUnlessHardwareValidated,
  getPassedGoldenPathChecklistIds,
} from "../src/index.js";

describe("golden-path validation status", () => {
  it("reports all features as mock-tested while hardware checklists are pending", () => {
    const report = getGoldenPathValidationStatus();
    expect(report.schemaVersion).toBe("1.0.0");
    expect(report.summary.pendingHardwareChecks).toBeGreaterThan(0);
    expect(report.summary.hardwareValidatedFeatures).toBe(0);
    expect(report.featureMaturity.every((f) => f.maturity === "Mock-tested")).toBe(true);
    expect(report.hardwareChecklists.every((c) => c.status === "pending")).toBe(true);
  });

  it("includes supported alpha configuration", () => {
    const report = getGoldenPathValidationStatus();
    expect(report.supportedAlphaConfiguration.hostOs).toBe("Windows 11");
    expect(report.supportedAlphaConfiguration.robotPlatform).toBe("REV Control Hub");
    expect(report.supportedAlphaConfiguration.ftcSdkRange).toMatch(/11\./);
  });

  it("enforces mock-only policy when no hardware checklists pass", () => {
    const passed = getPassedGoldenPathChecklistIds(GOLDEN_PATH_HARDWARE_CHECKLISTS);
    expect(passed.size).toBe(0);
    expect(
      assertGoldenPathMockTestedOnlyUnlessHardwareValidated(GOLDEN_PATH_FEATURE_MATURITY, passed),
    ).toBe(true);
  });

  it("documents automated coverage flags", () => {
    expect(GOLDEN_PATH_AUTOMATED_COVERAGE.diagnosticBundle).toBe(true);
    expect(GOLDEN_PATH_AUTOMATED_COVERAGE.environmentSnapshot).toBe(true);
    expect(GOLDEN_PATH_AUTOMATED_COVERAGE.multiDeviceRefusal).toBe(true);
  });
});
