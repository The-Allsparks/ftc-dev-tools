import type { ReplayBackendDescriptor } from "../providers/types.js";

export type SessionEventKind =
  "vision.diagnostic" | "vision.results" | "frame.metadata" | "session.note" | "session.marker";

export interface SessionHeader {
  schemaVersion: string;
  sessionId: string;
  startedAt: string;
  sources: string[];
  endedAt?: string;
  projectRoot?: string;
  teamNumber?: number;
  notes?: string;
}

export interface SessionEventEnvelope {
  schemaVersion: string;
  sessionId: string;
  sequence: number;
  timestampMs: number;
  kind: SessionEventKind;
  sourceId: string;
  monotonicMs?: number;
  pipelineId?: string;
  payload?: Record<string, unknown>;
  labels?: string[];
  notes?: string;
}

export interface ReplayCapabilities {
  sessionHeaderValidation: boolean;
  sessionEventValidation: boolean;
  sessionManifest: boolean;
  liveCapture: boolean;
  offlineReplay: boolean;
  frameCapture: boolean;
  annotatedFrameCapture: boolean;
  exportBundle: boolean;
  redaction: boolean;
  visionLabControls: boolean;
}

export interface ReplaySessionLimits {
  maxDurationMs: number;
  maxTotalBytes: number;
  maxEventPayloadBytes: number;
  maxEvents: number;
}

export interface SessionValidationResult {
  valid: boolean;
  errors: string[];
  header?: SessionHeader;
  event?: SessionEventEnvelope;
}

export interface ReplayStatusReport {
  generatedAt: string;
  message: string;
  headerSchemaVersion: string;
  eventSchemaVersion: string;
  sessionSchemaUrl: string;
  eventSchemaUrl: string;
  capabilities: ReplayCapabilities;
  limits: ReplaySessionLimits;
  gitignoreRecommendations: readonly string[];
  replayBackends: readonly ReplayBackendDescriptor[];
  humanSummary: string[];
}

export interface CreateSessionHeaderInput {
  sources: string[];
  projectRoot?: string;
  teamNumber?: number;
  notes?: string;
  sessionId?: string;
  startedAt?: string;
}
