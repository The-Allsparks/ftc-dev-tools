import type { VisionInspectorBox, VisionInspectorPoint } from "./types.js";

/** Default Limelight 3 horizontal / vertical FOV (degrees) for overlay mapping. */
export const LIMELIGHT_DEFAULT_FOV = {
  horizontal: 59.2,
  vertical: 45.7,
} as const;

export const VISION_INSPECTOR_OVERLAY_CONVENTION =
  "Normalized frame space: x/y in [0,1], origin top-left. Limelight tx/ty degrees map relative to image center using provider FOV.";

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/** Map Limelight tx/ty (degrees from crosshair, +Y up in robot space) to normalized screen coords (+Y down). */
export function limelightDegreesToNormalizedPoint(
  txDegrees: number,
  tyDegrees: number,
  fov = LIMELIGHT_DEFAULT_FOV,
): VisionInspectorPoint {
  const x = clamp01(0.5 + txDegrees / fov.horizontal);
  const y = clamp01(0.5 - tyDegrees / fov.vertical);
  return { x, y };
}

export function centerCrosshairOverlay(): VisionInspectorPoint {
  return { x: 0.5, y: 0.5 };
}

/** Approximate target area (ta %) as a square box centered on the target point. */
export function targetAreaToNormalizedBox(
  center: VisionInspectorPoint,
  areaPercent: number,
): VisionInspectorBox {
  const side = Math.sqrt(Math.max(0, areaPercent) / 100);
  const width = clamp01(Math.min(side, 1));
  const height = width;
  return {
    x: clamp01(center.x - width / 2),
    y: clamp01(center.y - height / 2),
    width,
    height,
  };
}
