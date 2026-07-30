export const SESSION_HEADER_SCHEMA_VERSION = "1.0.0";
export const SESSION_EVENT_SCHEMA_VERSION = "1.0.0";

export const SESSION_EVENT_SCHEMA_URL =
  "https://raw.githubusercontent.com/The-Allsparks/ftc-dev-tools/main/packages/shared/schemas/session-event.schema.json";

/** Default session file extension for future writers (VISION-13+). */
export const REPLAY_SESSION_FILE_EXTENSION = ".ftc-session.jsonl";

/** User-visible bounds enforced by future capture pipeline. */
export const REPLAY_SESSION_LIMITS = {
  maxDurationMs: 30 * 60 * 1000,
  maxTotalBytes: 500 * 1024 * 1024,
  maxEventPayloadBytes: 65_536,
  maxEvents: 100_000,
} as const;

export const REPLAY_GITIGNORE_RECOMMENDATIONS = [
  ".ftc-sessions/",
  "*.ftc-session.jsonl",
  ".ftc-dev-tools/sessions/",
] as const;
