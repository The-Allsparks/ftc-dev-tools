import { describe, expect, it } from "vitest";
import {
  LIMELIGHT_DEFAULT_FOV,
  limelightDegreesToNormalizedPoint,
  targetAreaToNormalizedBox,
} from "../src/vision/inspector/coordinates.js";
import {
  buildLimelightInspectorSnapshot,
  emptyInspectorSnapshot,
} from "../src/vision/inspector/limelight.js";
import type { LimelightTargetingResults } from "../src/vision/limelight/types.js";

function sampleResults(
  overrides: Partial<LimelightTargetingResults> = {},
): LimelightTargetingResults {
  return {
    host: "limelight.local",
    apiBaseUrl: "http://limelight.local:5807",
    reachable: true,
    target: {
      valid: true,
      tx: 5,
      ty: -2,
      ta: 4,
      latencyCaptureMs: 1.2,
      latencyPipelineMs: 8.5,
      latencyTotalMs: 12,
      timestampMicros: 1_700_000_000_000_000,
      classifierClass: "red",
      detectorClass: "aprilTag",
    },
    updateAgeMs: 33,
    stale: false,
    raw: { tl: { tx: 5 } },
    fetchedAt: "2026-07-30T12:00:00.000Z",
    message: "Targeting results loaded.",
    ...overrides,
  };
}

describe("vision inspector coordinates", () => {
  it("maps Limelight tx/ty degrees to normalized overlay points", () => {
    const center = limelightDegreesToNormalizedPoint(0, 0);
    expect(center.x).toBeCloseTo(0.5, 5);
    expect(center.y).toBeCloseTo(0.5, 5);

    const offset = limelightDegreesToNormalizedPoint(5, -2, LIMELIGHT_DEFAULT_FOV);
    expect(offset.x).toBeGreaterThan(0.5);
    expect(offset.y).toBeGreaterThan(0.5);
  });

  it("derives a normalized box from target area percent", () => {
    const center = { x: 0.5, y: 0.5 };
    const box = targetAreaToNormalizedBox(center, 25);
    expect(box.width).toBeCloseTo(0.5, 5);
    expect(box.height).toBeCloseTo(0.5, 5);
    expect(box.x).toBeCloseTo(0.25, 5);
    expect(box.y).toBeCloseTo(0.25, 5);
  });
});

describe("buildLimelightInspectorSnapshot", () => {
  it("builds overlay, detections, and metrics for a valid target", () => {
    const snapshot = buildLimelightInspectorSnapshot({
      results: sampleResults(),
      status: {
        host: "limelight.local",
        apiBaseUrl: "http://limelight.local:5807",
        reachable: true,
        fps: 30,
        cpuPercent: 42,
        temperatureCelsius: 55,
        fetchedAt: "2026-07-30T12:00:00.000Z",
        message: "Status OK",
      },
    });

    expect(snapshot.providerId).toBe("vision:limelight");
    expect(snapshot.selectedTarget?.valid).toBe(true);
    expect(snapshot.detections).toHaveLength(1);
    expect(snapshot.detections[0]?.overlay.some((element) => element.kind === "target-point")).toBe(
      true,
    );
    expect(snapshot.metrics.fps).toBe(30);
    expect(snapshot.metrics.captureLatencyMs).toBe(1.2);
    expect(snapshot.metrics.frameAgeMs).toBe(33);
    expect(snapshot.rawPayload).toEqual({ tl: { tx: 5 } });
    expect(snapshot.capabilities.liveVideoOverlay).toBe(false);
  });

  it("marks invalid targets without overlay points", () => {
    const snapshot = buildLimelightInspectorSnapshot({
      results: sampleResults({
        target: { valid: false },
      }),
    });

    expect(snapshot.selectedTarget?.valid).toBe(false);
    expect(snapshot.selectedTarget?.label).toBe("No valid target");
    expect(
      snapshot.detections[0]?.overlay.every((element) => element.kind !== "target-point"),
    ).toBe(true);
    expect(snapshot.metrics.captureLatencyMs).toBeNull();
  });

  it("returns selection-required empty snapshots", () => {
    const snapshot = emptyInspectorSnapshot({
      providerId: "vision:limelight",
      providerLabel: "Limelight",
      message: "Multiple hosts detected.",
      requiresSelection: true,
    });

    expect(snapshot.requiresSelection).toBe(true);
    expect(snapshot.detections).toHaveLength(0);
    expect(snapshot.metrics.fps).toBeNull();
  });
});
