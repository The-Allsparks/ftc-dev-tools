import type { LimelightDeviceStatus, LimelightTargetingResults } from "../limelight/types.js";
import {
  centerCrosshairOverlay,
  limelightDegreesToNormalizedPoint,
  targetAreaToNormalizedBox,
  VISION_INSPECTOR_OVERLAY_CONVENTION,
} from "./coordinates.js";
import { VISION_INSPECTOR_CAPABILITIES } from "./capabilities.js";
import type {
  VisionInspectorDetection,
  VisionInspectorMetrics,
  VisionInspectorOverlayElement,
  VisionInspectorSnapshot,
} from "./types.js";

function unavailableMetric(value: number | undefined): number | null {
  return value !== undefined && Number.isFinite(value) ? value : null;
}

export function buildLimelightInspectorSnapshot(input: {
  results: LimelightTargetingResults;
  status?: LimelightDeviceStatus;
  requiresSelection?: boolean;
  selectionMessage?: string;
}): VisionInspectorSnapshot {
  const { results, status } = input;
  const generatedAt = new Date().toISOString();
  const target = results.target;

  const overlayElements: VisionInspectorOverlayElement[] = [
    { kind: "crosshair", point: centerCrosshairOverlay(), label: "Crosshair" },
  ];

  let detection: VisionInspectorDetection | undefined;
  if (target.valid && target.tx !== undefined && target.ty !== undefined) {
    const point = limelightDegreesToNormalizedPoint(target.tx, target.ty);
    overlayElements.push({ kind: "target-point", point, label: "Primary target" });
    if (target.ta !== undefined) {
      overlayElements.push({
        kind: "box",
        box: targetAreaToNormalizedBox(point, target.ta),
        label: "Target area",
      });
    }
    const labelParts = [
      target.classifierClass,
      target.detectorClass,
      target.ta !== undefined ? `${target.ta.toFixed(2)}% area` : undefined,
    ].filter(Boolean);

    detection = {
      id: "limelight-primary",
      label: labelParts.join(" · ") || "Primary target",
      valid: true,
      txDegrees: target.tx,
      tyDegrees: target.ty,
      areaPercent: target.ta,
      classifierClass: target.classifierClass,
      detectorClass: target.detectorClass,
      overlay: overlayElements,
    };
  } else {
    detection = {
      id: "limelight-primary",
      label: "No valid target",
      valid: false,
      overlay: overlayElements,
    };
  }

  const metrics: VisionInspectorMetrics = {
    fps: unavailableMetric(status?.fps),
    captureLatencyMs: unavailableMetric(target.latencyCaptureMs),
    pipelineLatencyMs: unavailableMetric(target.latencyPipelineMs),
    totalLatencyMs: unavailableMetric(target.latencyTotalMs ?? results.target.latencyPipelineMs),
    frameAgeMs: unavailableMetric(results.updateAgeMs),
    cpuPercent: unavailableMetric(status?.cpuPercent),
    temperatureCelsius: unavailableMetric(status?.temperatureCelsius),
  };

  const frameTimestamp =
    target.timestampMicros !== undefined
      ? new Date(target.timestampMicros / 1000).toISOString()
      : undefined;

  return {
    providerId: "vision:limelight",
    providerLabel: "Limelight",
    host: results.host,
    reachable: results.reachable,
    stale: results.stale,
    requiresSelection: input.requiresSelection === true,
    resultTimestamp: results.fetchedAt,
    frameTimestamp,
    message: input.requiresSelection
      ? (input.selectionMessage ?? "Multiple Limelight hosts — configure vision.limelight.host.")
      : results.message,
    overlayConvention: VISION_INSPECTOR_OVERLAY_CONVENTION,
    selectedTarget: detection,
    detections: [detection],
    metrics,
    rawPayload: results.raw,
    capabilities: { ...VISION_INSPECTOR_CAPABILITIES },
    generatedAt,
  };
}

export function emptyInspectorSnapshot(input: {
  providerId: string;
  providerLabel: string;
  message: string;
  requiresSelection?: boolean;
}): VisionInspectorSnapshot {
  return {
    providerId: input.providerId,
    providerLabel: input.providerLabel,
    reachable: false,
    stale: true,
    requiresSelection: input.requiresSelection === true,
    message: input.message,
    overlayConvention: VISION_INSPECTOR_OVERLAY_CONVENTION,
    detections: [],
    metrics: {
      fps: null,
      captureLatencyMs: null,
      pipelineLatencyMs: null,
      totalLatencyMs: null,
      frameAgeMs: null,
      cpuPercent: null,
      temperatureCelsius: null,
    },
    capabilities: { ...VISION_INSPECTOR_CAPABILITIES },
    generatedAt: new Date().toISOString(),
  };
}
