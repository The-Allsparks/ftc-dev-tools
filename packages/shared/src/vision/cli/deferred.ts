import { VISION_CLI_EXIT } from "./constants.js";
import { findVisionCliCatalogEntry } from "./catalog.js";
import type { VisionCliDeferredResult } from "./types.js";

export function buildDeferredVisionCliResult(command: string): VisionCliDeferredResult {
  const entry = findVisionCliCatalogEntry(command);
  const message =
    entry?.deferredReason ??
    "This vision command is cataloged but not implemented in the current release.";
  return {
    command,
    deferred: true,
    message,
    exitCode: VISION_CLI_EXIT.DEFERRED,
    followUp: entry?.equivalent ? [`Try: ${entry.equivalent}`] : undefined,
  };
}
