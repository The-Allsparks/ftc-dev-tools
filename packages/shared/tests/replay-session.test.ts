import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createSessionHeader } from "../src/replay/create-header.js";
import { getReplayStatus } from "../src/replay/status.js";
import {
  parseSessionEventLine,
  validateSessionEvent,
  validateSessionHeader,
} from "../src/replay/validate.js";
import {
  SESSION_EVENT_SCHEMA_VERSION,
  SESSION_HEADER_SCHEMA_VERSION,
} from "../src/replay/constants.js";

describe("replay session header", () => {
  it("creates and validates a new session header", () => {
    const header = createSessionHeader({
      sources: ["vision:limelight", "vision:bridge"],
      notes: "Test session",
    });

    expect(header.schemaVersion).toBe(SESSION_HEADER_SCHEMA_VERSION);
    expect(header.sources).toEqual(["vision:limelight", "vision:bridge"]);

    const result = validateSessionHeader(header);
    expect(result.valid).toBe(true);
    expect(result.header?.sessionId).toBeTruthy();
  });

  it("rejects headers with unsupported schema versions", () => {
    const result = validateSessionHeader({
      schemaVersion: "9.9.9",
      sessionId: randomUUID(),
      startedAt: new Date().toISOString(),
      sources: ["vision:limelight"],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("9.9.9");
  });
});

describe("replay session events", () => {
  it("validates JSONL event envelopes", () => {
    const event = {
      schemaVersion: SESSION_EVENT_SCHEMA_VERSION,
      sessionId: randomUUID(),
      sequence: 0,
      timestampMs: Date.now(),
      kind: "vision.diagnostic",
      sourceId: "vision:bridge",
      payload: { camera: { state: "streaming" } },
    };

    const lineResult = parseSessionEventLine(`${JSON.stringify(event)}\n`);
    expect(lineResult.valid).toBe(true);

    const objectResult = validateSessionEvent(event);
    expect(objectResult.valid).toBe(true);
  });

  it("rejects oversized event payloads", () => {
    const event = {
      schemaVersion: SESSION_EVENT_SCHEMA_VERSION,
      sessionId: randomUUID(),
      sequence: 1,
      timestampMs: Date.now(),
      kind: "vision.results",
      sourceId: "vision:limelight",
      payload: { blob: "x".repeat(70_000) },
    };

    const result = validateSessionEvent(event);
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("payload exceeds");
  });
});

describe("getReplayStatus", () => {
  it("reports deferred capture capabilities", () => {
    const report = getReplayStatus();
    expect(report.capabilities.sessionHeaderValidation).toBe(true);
    expect(report.capabilities.liveCapture).toBe(false);
    expect(report.capabilities.offlineReplay).toBe(false);
    expect(report.replayBackends.some((backend) => backend.id === "replay:session-file")).toBe(
      true,
    );
  });
});
