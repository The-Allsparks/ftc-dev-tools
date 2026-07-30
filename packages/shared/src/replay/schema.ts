/** Inlined JSON Schema — source of truth file: packages/shared/schemas/session.schema.json */
export const sessionHeaderSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://raw.githubusercontent.com/The-Allsparks/ftc-dev-tools/main/packages/shared/schemas/session.schema.json",
  title: "FTC Dev Tools session recording",
  description:
    "Session header for replay recordings (ADR-0005, schema v1.0.0). Events use separate event schema.",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "sessionId", "startedAt", "sources"],
  properties: {
    schemaVersion: {
      type: "string",
      pattern: "^\\d+\\.\\d+\\.\\d+$",
    },
    sessionId: {
      type: "string",
      format: "uuid",
    },
    startedAt: {
      type: "string",
    },
    endedAt: {
      type: "string",
    },
    projectRoot: {
      type: "string",
    },
    teamNumber: {
      type: "integer",
      minimum: 1,
      maximum: 99999,
    },
    sources: {
      type: "array",
      items: { type: "string", minLength: 1 },
      minItems: 1,
      uniqueItems: true,
    },
    notes: {
      type: "string",
    },
  },
} as const;

/** Inlined JSON Schema — source of truth file: packages/shared/schemas/session-event.schema.json */
export const sessionEventSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://raw.githubusercontent.com/The-Allsparks/ftc-dev-tools/main/packages/shared/schemas/session-event.schema.json",
  title: "FTC Dev Tools session event",
  description:
    "Append-only session event envelope (ADR-0005, schema v1.0.0). Stream-friendly JSONL records reference this shape.",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "sessionId", "sequence", "timestampMs", "kind", "sourceId"],
  properties: {
    schemaVersion: {
      type: "string",
      pattern: "^\\d+\\.\\d+\\.\\d+$",
    },
    sessionId: {
      type: "string",
      format: "uuid",
    },
    sequence: {
      type: "integer",
      minimum: 0,
    },
    timestampMs: {
      type: "integer",
      minimum: 0,
    },
    monotonicMs: {
      type: "integer",
      minimum: 0,
    },
    kind: {
      type: "string",
      enum: [
        "vision.diagnostic",
        "vision.results",
        "frame.metadata",
        "session.note",
        "session.marker",
      ],
    },
    sourceId: {
      type: "string",
      minLength: 1,
    },
    pipelineId: {
      type: "string",
    },
    payload: {
      type: "object",
    },
    labels: {
      type: "array",
      items: { type: "string" },
      maxItems: 16,
    },
    notes: {
      type: "string",
    },
  },
} as const;
