/** Inlined JSON Schema so bundlers do not depend on import.meta file URLs. */
export const ftcDevSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://raw.githubusercontent.com/ftc-dev-tools/ftc-dev-tools/main/packages/shared/schemas/ftc-dev.schema.json",
  title: "FTC Dev Tools project configuration",
  type: "object",
  additionalProperties: true,
  properties: {
    $schema: {
      type: "string",
    },
    teamNumber: {
      type: "integer",
      minimum: 1,
      maximum: 99999,
      description: "Optional FTC team number for display only. Never used as a secret.",
    },
    module: {
      type: "string",
      minLength: 1,
      description: "Gradle module that produces the robot application, usually TeamCode.",
    },
    deployment: {
      type: "object",
      additionalProperties: true,
      properties: {
        preferredConnection: {
          type: "string",
          enum: ["usb", "wifi", "any"],
        },
        preferredDeviceSerial: {
          type: "string",
          description:
            "Machine-local preference. Avoid committing real serial numbers in shared repos.",
        },
      },
    },
    logs: {
      type: "object",
      additionalProperties: true,
      properties: {
        defaultFilter: {
          type: "string",
          enum: ["all", "teamcode", "errors", "raw"],
        },
      },
    },
  },
  not: {
    anyOf: [
      { required: ["password"] },
      { required: ["wifiPassword"] },
      { required: ["apiKey"] },
      { required: ["secret"] },
      { required: ["token"] },
    ],
  },
} as const;
