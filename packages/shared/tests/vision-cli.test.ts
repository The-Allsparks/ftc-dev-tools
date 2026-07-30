import { describe, expect, it } from "vitest";
import { VISION_CLI_EXIT } from "../src/vision/cli/constants.js";
import { findVisionCliCatalogEntry, getVisionCliCatalog } from "../src/vision/cli/catalog.js";
import { buildDeferredVisionCliResult } from "../src/vision/cli/deferred.js";
import {
  formatEndpointTable,
  redactVisionCliPayload,
  wrapVisionCliJson,
} from "../src/vision/cli/format.js";
import { parseVisionCodegenKind } from "../src/vision/codegen/scaffold.js";

describe("vision CLI foundation", () => {
  it("catalog includes core and deferred commands", () => {
    const catalog = getVisionCliCatalog();
    expect(catalog.some((entry) => entry.command === "ftc vision open" && entry.available)).toBe(
      true,
    );
    expect(
      catalog.some((entry) => entry.command === "ftc vision capture" && !entry.available),
    ).toBe(true);
    expect(findVisionCliCatalogEntry("ftc vision pipelines push")?.mutating).toBe(true);
  });

  it("returns deferred results with exit code 4", () => {
    const result = buildDeferredVisionCliResult("ftc vision capture");
    expect(result.deferred).toBe(true);
    expect(result.exitCode).toBe(VISION_CLI_EXIT.DEFERRED);
  });

  it("wraps JSON with schema version and optional redaction", () => {
    const envelope = wrapVisionCliJson(
      "ftc vision devices",
      { host: "192.168.43.1", serial: "ABCD1234EFGH" },
      { redact: true },
    );
    expect(envelope.schemaVersion).toBe("1.0.0");
    expect(envelope.redacted).toBe(true);
    const data = envelope.data as { host: string; serial: string };
    expect(data.host).toContain("redacted");
    expect(data.serial).toContain("redacted");
  });

  it("redacts nested payloads", () => {
    const redacted = redactVisionCliPayload({ nested: { ip: "10.0.0.1" } }) as {
      nested: { ip: string };
    };
    expect(redacted.nested.ip).toContain("redacted");
  });

  it("formats endpoint tables for human output", () => {
    const lines = formatEndpointTable([
      {
        kind: "limelight-api",
        target: "10.0.0.5:5807",
        reachable: "reachable",
        provider: "vision:limelight",
      },
    ]);
    expect(lines[0]).toContain("KIND");
    expect(lines.some((line) => line.includes("limelight-api"))).toBe(true);
  });

  it("accepts visionportal codegen alias", () => {
    expect(parseVisionCodegenKind("visionportal")).toBe("visionportal-apriltag");
  });
});
