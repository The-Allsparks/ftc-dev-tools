import { SESSION_SCHEMA_URL } from "../constants.js";
import { bootstrapProviderCatalog } from "../providers/bootstrap.js";
import { listReplayBackends } from "../providers/replay-registry.js";
import { REPLAY_CAPABILITIES } from "./capabilities.js";
import {
  REPLAY_GITIGNORE_RECOMMENDATIONS,
  REPLAY_SESSION_LIMITS,
  SESSION_EVENT_SCHEMA_URL,
  SESSION_EVENT_SCHEMA_VERSION,
  SESSION_HEADER_SCHEMA_VERSION,
} from "./constants.js";
import type { ReplayStatusReport } from "./types.js";

export function getReplayStatus(): ReplayStatusReport {
  bootstrapProviderCatalog();
  const replayBackends = listReplayBackends();
  const humanSummary = [
    `Session header schema v${SESSION_HEADER_SCHEMA_VERSION}`,
    `Session event schema v${SESSION_EVENT_SCHEMA_VERSION}`,
    `Replay backends registered: ${replayBackends.length}`,
    REPLAY_CAPABILITIES.liveCapture
      ? "Live capture enabled"
      : "Live capture deferred — validation and manifest foundation only (VISION-13).",
    REPLAY_CAPABILITIES.offlineReplay
      ? "Offline replay enabled"
      : "Offline replay deferred — use inspector and static analysis until capture ships.",
  ];

  return {
    generatedAt: new Date().toISOString(),
    message:
      "Replay session schema validation is available; live capture and offline playback remain deferred.",
    headerSchemaVersion: SESSION_HEADER_SCHEMA_VERSION,
    eventSchemaVersion: SESSION_EVENT_SCHEMA_VERSION,
    sessionSchemaUrl: SESSION_SCHEMA_URL,
    eventSchemaUrl: SESSION_EVENT_SCHEMA_URL,
    capabilities: { ...REPLAY_CAPABILITIES },
    limits: { ...REPLAY_SESSION_LIMITS },
    gitignoreRecommendations: [...REPLAY_GITIGNORE_RECOMMENDATIONS],
    replayBackends,
    humanSummary,
  };
}
