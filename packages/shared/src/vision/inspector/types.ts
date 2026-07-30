/** Normalized overlay coordinate space for Vision Lab (VISION-11). */

import type { DeviceProvider } from "../../types/device.js";
import type { ProcessRunner } from "../../types/process.js";

/** Point in normalized frame coordinates (0–1), origin top-left. */
export interface VisionInspectorPoint {
  x: number;
  y: number;
}

/** Axis-aligned box in normalized frame coordinates. */
export interface VisionInspectorBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type VisionInspectorOverlayKind = "crosshair" | "target-point" | "box" | "label";

export interface VisionInspectorOverlayElement {
  kind: VisionInspectorOverlayKind;
  label?: string;
  point?: VisionInspectorPoint;
  box?: VisionInspectorBox;
  confidence?: number;
}

export interface VisionInspectorDetection {
  id: string;
  label: string;
  valid: boolean;
  confidence?: number;
  txDegrees?: number;
  tyDegrees?: number;
  areaPercent?: number;
  classifierClass?: string;
  detectorClass?: string;
  overlay: VisionInspectorOverlayElement[];
}

export interface VisionInspectorMetrics {
  fps?: number | null;
  captureLatencyMs?: number | null;
  pipelineLatencyMs?: number | null;
  totalLatencyMs?: number | null;
  frameAgeMs?: number | null;
  cpuPercent?: number | null;
  temperatureCelsius?: number | null;
}

export interface VisionInspectorCapabilities {
  structuredResults: boolean;
  overlayPreview: boolean;
  liveVideoOverlay: boolean;
  metricsGraphs: boolean;
  copyAsJson: boolean;
  exportResult: boolean;
  configurableThresholds: boolean;
}

export interface VisionInspectorSnapshot {
  providerId: string;
  providerLabel: string;
  host?: string;
  reachable: boolean;
  stale: boolean;
  requiresSelection: boolean;
  resultTimestamp?: string;
  frameTimestamp?: string;
  message: string;
  overlayConvention: string;
  selectedTarget?: VisionInspectorDetection;
  detections: VisionInspectorDetection[];
  metrics: VisionInspectorMetrics;
  rawPayload?: Record<string, unknown>;
  capabilities: VisionInspectorCapabilities;
  generatedAt: string;
}

export interface BuildVisionInspectorOptions {
  projectRoot: string;
  deviceProvider?: DeviceProvider;
  runner?: ProcessRunner;
  explicitLimelightHost?: string;
  probeNetwork?: boolean;
}
