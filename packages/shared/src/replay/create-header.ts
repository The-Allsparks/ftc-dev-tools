import { randomUUID } from "node:crypto";
import { SESSION_HEADER_SCHEMA_VERSION } from "./constants.js";
import type { CreateSessionHeaderInput, SessionHeader } from "./types.js";

export function createSessionHeader(input: CreateSessionHeaderInput): SessionHeader {
  const sources = [...new Set(input.sources.map((source) => source.trim()).filter(Boolean))];
  if (sources.length === 0) {
    throw new Error("Session header requires at least one source id.");
  }

  return {
    schemaVersion: SESSION_HEADER_SCHEMA_VERSION,
    sessionId: input.sessionId ?? randomUUID(),
    startedAt: input.startedAt ?? new Date().toISOString(),
    sources,
    projectRoot: input.projectRoot?.trim() || undefined,
    teamNumber: input.teamNumber,
    notes: input.notes?.trim() || undefined,
  };
}
