import Ajv2020Import from "ajv/dist/2020.js";
import addFormatsImport from "ajv-formats";
import { visionDiagnosticSchema } from "./schema.js";
import {
  VISION_BRIDGE_CODE_VERSION,
  VISION_DIAGNOSTIC_LOG_PREFIX,
  VISION_DIAGNOSTIC_SCHEMA_VERSION,
} from "./constants.js";
import type { VisionDiagnosticPayload, VisionDiagnosticValidationResult } from "./types.js";

type Ajv2020Ctor = new (options?: object) => {
  compile: (schema: object) => (data: unknown) => boolean;
};
type AddFormatsFn = (ajv: object) => unknown;

const Ajv2020 = Ajv2020Import as unknown as Ajv2020Ctor;
const addFormats = addFormatsImport as unknown as AddFormatsFn;

const ajv = new Ajv2020({ allErrors: true, strict: false, allowUnionTypes: true });
addFormats(ajv);
const validatePayload = ajv.compile(visionDiagnosticSchema as unknown as object);

export function extractVisionDiagnosticJson(line: string): string | undefined {
  const index = line.indexOf(VISION_DIAGNOSTIC_LOG_PREFIX);
  if (index < 0) {
    return undefined;
  }
  const json = line.slice(index + VISION_DIAGNOSTIC_LOG_PREFIX.length).trim();
  return json.length > 0 ? json : undefined;
}

export function parseVisionDiagnosticLine(line: string): VisionDiagnosticValidationResult {
  const jsonText = extractVisionDiagnosticJson(line);
  if (!jsonText) {
    return { valid: false, errors: ["Line does not contain FTC_VISION_DIAG prefix."] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch (error) {
    return {
      valid: false,
      errors: [`Malformed JSON: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
  return validateVisionDiagnosticPayload(parsed);
}

export function validateVisionDiagnosticPayload(value: unknown): VisionDiagnosticValidationResult {
  const errors: string[] = [];
  if (!validatePayload(value)) {
    errors.push("Payload does not match vision-diagnostic schema.");
    return { valid: false, errors };
  }

  const payload = value as VisionDiagnosticPayload;
  if (payload.schemaVersion !== VISION_DIAGNOSTIC_SCHEMA_VERSION) {
    errors.push(
      `Unsupported schemaVersion ${payload.schemaVersion}; expected ${VISION_DIAGNOSTIC_SCHEMA_VERSION}.`,
    );
  }
  if (payload.bridgeVersion !== VISION_BRIDGE_CODE_VERSION) {
    errors.push(
      `Bridge version mismatch: payload ${payload.bridgeVersion}, tool ${VISION_BRIDGE_CODE_VERSION}.`,
    );
  }

  if (errors.length > 0) {
    return { valid: false, errors, payload };
  }
  return { valid: true, payload, errors: [] };
}
