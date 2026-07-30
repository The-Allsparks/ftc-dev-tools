import Ajv2020Import from "ajv/dist/2020.js";
import addFormatsImport from "ajv-formats";
import { sessionEventSchema, sessionHeaderSchema } from "./schema.js";
import {
  SESSION_EVENT_SCHEMA_VERSION,
  SESSION_HEADER_SCHEMA_VERSION,
  REPLAY_SESSION_LIMITS,
} from "./constants.js";
import type { SessionEventEnvelope, SessionHeader, SessionValidationResult } from "./types.js";

type Ajv2020Ctor = new (options?: object) => {
  compile: (schema: object) => (data: unknown) => boolean;
  errorsText: (errors?: object[] | null, options?: object) => string;
  errors?: object[] | null;
};
type AddFormatsFn = (ajv: object) => unknown;

const Ajv2020 = Ajv2020Import as unknown as Ajv2020Ctor;
const addFormats = addFormatsImport as unknown as AddFormatsFn;

const ajv = new Ajv2020({ allErrors: true, strict: false, allowUnionTypes: true });
addFormats(ajv);
const validateHeaderSchema = ajv.compile(sessionHeaderSchema as unknown as object);
const validateEventSchema = ajv.compile(sessionEventSchema as unknown as object);

function schemaErrors(validator: ReturnType<typeof ajv.compile>): string[] {
  const compiled = validator as ReturnType<typeof ajv.compile> & { errors?: object[] | null };
  const text = ajv.errorsText(compiled.errors ?? undefined);
  return text ? [text] : ["Schema validation failed."];
}

function payloadSizeOk(payload: Record<string, unknown> | undefined): string | undefined {
  if (!payload) {
    return undefined;
  }
  const bytes = Buffer.byteLength(JSON.stringify(payload), "utf8");
  if (bytes > REPLAY_SESSION_LIMITS.maxEventPayloadBytes) {
    return `Event payload exceeds ${REPLAY_SESSION_LIMITS.maxEventPayloadBytes} bytes (${bytes}).`;
  }
  return undefined;
}

export function validateSessionHeader(value: unknown): SessionValidationResult {
  if (!validateHeaderSchema(value)) {
    return { valid: false, errors: schemaErrors(validateHeaderSchema) };
  }

  const header = value as SessionHeader;
  const errors: string[] = [];
  if (header.schemaVersion !== SESSION_HEADER_SCHEMA_VERSION) {
    errors.push(
      `Unsupported header schemaVersion ${header.schemaVersion}; expected ${SESSION_HEADER_SCHEMA_VERSION}.`,
    );
  }

  if (errors.length > 0) {
    return { valid: false, errors, header };
  }
  return { valid: true, errors: [], header };
}

export function validateSessionEvent(value: unknown): SessionValidationResult {
  if (!validateEventSchema(value)) {
    return { valid: false, errors: schemaErrors(validateEventSchema) };
  }

  const event = value as SessionEventEnvelope;
  const errors: string[] = [];
  if (event.schemaVersion !== SESSION_EVENT_SCHEMA_VERSION) {
    errors.push(
      `Unsupported event schemaVersion ${event.schemaVersion}; expected ${SESSION_EVENT_SCHEMA_VERSION}.`,
    );
  }

  const payloadError = payloadSizeOk(event.payload);
  if (payloadError) {
    errors.push(payloadError);
  }

  if (errors.length > 0) {
    return { valid: false, errors, event };
  }
  return { valid: true, errors: [], event };
}

export function parseSessionEventLine(line: string): SessionValidationResult {
  const trimmed = line.trim();
  if (!trimmed) {
    return { valid: false, errors: ["Empty JSONL line."] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch (error) {
    return {
      valid: false,
      errors: [`Malformed JSON: ${error instanceof Error ? error.message : String(error)}`],
    };
  }
  return validateSessionEvent(parsed);
}
