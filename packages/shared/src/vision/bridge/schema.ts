/** Inlined JSON Schema — source of truth file: packages/shared/schemas/vision-diagnostic.schema.json */
export const visionDiagnosticSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://raw.githubusercontent.com/The-Allsparks/ftc-dev-tools/main/packages/shared/schemas/vision-diagnostic.schema.json",
  title: "FTC Vision Lab diagnostic payload",
  description:
    "Versioned robot-side camera and processor diagnostics (VISION-07). No motor commands, raw frames, or file paths.",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "sessionId", "sequence", "timestampMs", "bridgeVersion"],
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
    bridgeVersion: {
      type: "string",
      pattern: "^\\d+\\.\\d+\\.\\d+$",
    },
    camera: {
      type: "object",
      additionalProperties: false,
      properties: {
        name: { type: "string" },
        state: {
          type: "string",
          enum: ["unknown", "closed", "opening", "streaming", "error"],
        },
        width: { type: "integer", minimum: 1 },
        height: { type: "integer", minimum: 1 },
      },
    },
    processors: {
      type: "array",
      maxItems: 16,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "kind", "enabled"],
        properties: {
          name: { type: "string", minLength: 1 },
          kind: { type: "string", minLength: 1 },
          enabled: { type: "boolean" },
          summary: { type: "string" },
        },
      },
    },
    warnings: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
    },
  },
} as const;
