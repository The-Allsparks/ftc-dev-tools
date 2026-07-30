import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { FetchLike } from "../src/sdk/types.js";
import { createProviderRegistrySnapshot } from "../src/providers/bootstrap.js";
import { validateSessionEvent, validateSessionHeader } from "../src/replay/validate.js";
import { SESSION_EVENT_SCHEMA_VERSION } from "../src/replay/constants.js";
import {
  normalizeLimelightResults,
  normalizeLimelightStatus,
} from "../src/vision/limelight/normalize.js";
import { getLimelightResults } from "../src/vision/limelight/results.js";
import { resolveLimelightHostReport } from "../src/vision/limelight/resolve-host.js";
import { validateLimelightArtifacts } from "../src/vision/limelight/artifacts/validate.js";
import { discoverVisionDevices } from "../src/vision/endpoints/discover-devices.js";
import { probeVisionEndpoint } from "../src/vision/endpoints/probe.js";
import type { VisionEndpointCandidate } from "../src/vision/endpoints/types.js";
import { detectFtcDashboardDependency } from "../src/vision/dashboard/detect-dependency.js";
import { getVisionBridgeStatus } from "../src/vision/bridge/status.js";
import { getEasyOpenCvStatus } from "../src/vision/easyopencv/status.js";
import { sanitizeVisionMcpPayload } from "../src/vision/mcp/sanitize.js";
import {
  assertMockTestedOnlyUnlessHardwareValidated,
  getVisionFeatureMaturity,
} from "../src/vision/validation/maturity.js";
import {
  getVisionHardwareChecklists,
  getPassedHardwareChecklistIds,
} from "../src/vision/validation/checklists.js";
import {
  getVisionValidationStatus,
  VISION_AUTOMATED_COVERAGE,
  VISION_VALIDATION_SCHEMA_VERSION,
} from "../src/vision/validation/status.js";

const fixtureDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures", "limelight");
const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

async function readFixture(name: string): Promise<Record<string, unknown>> {
  const text = await fs.readFile(path.join(fixtureDir, name), "utf8");
  return JSON.parse(text) as Record<string, unknown>;
}

async function writeMinimalFtcProject(root: string): Promise<void> {
  await fs.writeFile(
    path.join(root, "settings.gradle"),
    "include ':FtcRobotController', ':TeamCode'\n",
  );
  await fs.writeFile(path.join(root, "build.common.gradle"), "// common\n");
  await fs.mkdir(path.join(root, "FtcRobotController"), { recursive: true });
  await fs.mkdir(path.join(root, "TeamCode", "src", "main", "res", "xml"), { recursive: true });
  await fs.mkdir(
    path.join(root, "TeamCode", "src", "main", "java", "org", "firstinspires", "ftc", "teamcode"),
    { recursive: true },
  );
  await fs.writeFile(path.join(root, "build.dependencies.gradle"), "dependencies {\n}\n");
}

describe("vision validation status", () => {
  it("returns schema version, automated coverage, and pending hardware matrix", () => {
    const report = getVisionValidationStatus();
    expect(report.schemaVersion).toBe(VISION_VALIDATION_SCHEMA_VERSION);
    expect(report.generatedAt).toBeTruthy();
    expect(report.message).toContain("mock-tested");
    expect(Object.values(report.automatedCoverage).every(Boolean)).toBe(true);
    expect(report.hardwareChecklists.length).toBeGreaterThan(0);
    expect(
      report.hardwareChecklists.every(
        (row) => row.status === "pending" || row.status === "blocked",
      ),
    ).toBe(true);
    expect(report.summary.hardwareValidatedFeatures).toBe(0);
    expect(report.summary.mockTestedFeatures).toBeGreaterThan(0);
    expect(report.summary.pendingHardwareChecks).toBeGreaterThan(0);
  });

  it("never labels features hardware-validated without passing checklists", () => {
    const features = getVisionFeatureMaturity();
    const passed = getPassedHardwareChecklistIds(getVisionHardwareChecklists());
    expect(passed.size).toBe(0);
    expect(assertMockTestedOnlyUnlessHardwareValidated(features, passed)).toBe(true);
    expect(
      features.every(
        (entry) =>
          !["REV Control Hub tested", "Multi-team field tested", "Stable"].includes(entry.maturity),
      ),
    ).toBe(true);
  });

  it("documents automated coverage keys", () => {
    expect(VISION_AUTOMATED_COVERAGE.providerRegistry).toBe(true);
    expect(VISION_AUTOMATED_COVERAGE.mcpRedaction).toBe(true);
    expect(VISION_AUTOMATED_COVERAGE.corruptSessionRejection).toBe(true);
  });
});

describe("vision validation — provider registry", () => {
  it("includes vision providers linked to frame providers", async () => {
    const { resetProviderCatalogForTests } = await import("../src/providers/bootstrap.js");
    resetProviderCatalogForTests();
    const snapshot = createProviderRegistrySnapshot();
    expect(snapshot.visionProviders.some((entry) => entry.id === "vision:limelight")).toBe(true);
    expect(snapshot.visionProviders.some((entry) => entry.id === "vision:visionportal")).toBe(true);
  });
});

function fetchThatRespectsAbort(delayMs: number): FetchLike {
  return async (_input, init) => {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, delayMs);
      init?.signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new DOMException("The operation was aborted.", "AbortError"));
        },
        { once: true },
      );
      if (init?.signal?.aborted) {
        clearTimeout(timer);
        reject(new DOMException("The operation was aborted.", "AbortError"));
      }
    });
    return { ok: true, status: 200 } as Response;
  };
}

describe("vision validation — probe timeout and cancellation", () => {
  it("marks unreachable when fetch aborts", async () => {
    const controller = new AbortController();
    controller.abort();

    const candidate: VisionEndpointCandidate = {
      id: "limelight-api:10.9.16.11:5807",
      kind: "limelight-api",
      providerId: "vision:limelight",
      location: "desktop-reachable",
      sources: ["project-config"],
      confidence: "high",
      evidence: ["Configured host"],
      host: "10.9.16.11",
      port: 5807,
      path: "/status",
      url: "http://10.9.16.11:5807/status",
    };

    const probe = await probeVisionEndpoint(candidate, {
      signal: controller.signal,
      fetchImpl: fetchThatRespectsAbort(5_000),
      timeoutMs: 50,
    });
    expect(probe.reachable).toBe("unreachable");
  });

  it("times out slow probes", async () => {
    const candidate: VisionEndpointCandidate = {
      id: "limelight-api:10.9.16.11:5807",
      kind: "limelight-api",
      providerId: "vision:limelight",
      location: "desktop-reachable",
      sources: ["project-config"],
      confidence: "high",
      evidence: ["Configured host"],
      host: "10.9.16.11",
      port: 5807,
      path: "/status",
      url: "http://10.9.16.11:5807/status",
    };

    const probe = await probeVisionEndpoint(candidate, {
      timeoutMs: 20,
      fetchImpl: fetchThatRespectsAbort(500),
    });
    expect(probe.reachable).toBe("unreachable");
  });
});

describe("vision validation — malformed Limelight responses", () => {
  it("normalizes malformed results without throwing", async () => {
    const raw = await readFixture("results-malformed.json");
    const results = normalizeLimelightResults(
      "10.9.16.11",
      "http://10.9.16.11:5807",
      raw,
      200,
      true,
      "ok",
      60_000,
    );
    expect(results.target.valid).toBe(false);
    expect(results.stale).toBe(false);
  });

  it("handles empty status payload", () => {
    const status = normalizeLimelightStatus(
      "10.9.16.11",
      "http://10.9.16.11:5807",
      undefined,
      502,
      false,
      "bad gateway",
    );
    expect(status.reachable).toBe(false);
    expect(status.deviceName).toBeUndefined();
  });

  it("fetches results when HTTP body is malformed JSON text", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vision-val-"));
    tempDirs.push(root);
    await fs.writeFile(
      path.join(root, ".ftc-dev.json"),
      JSON.stringify({ vision: { limelight: { host: "10.9.16.11" } } }),
    );

    const fetchImpl: FetchLike = async (input) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.endsWith("/status")) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ name: "limelight", pipelineIndex: 0 }),
        } as Response;
      }
      return {
        ok: true,
        status: 200,
        text: async () => "{not json",
      } as Response;
    };

    const results = await getLimelightResults(root, { fetchImpl });
    expect(results.reachable).toBe(false);
    expect(results.target.valid).toBe(false);
    expect(results.message).toContain("non-JSON");
  });
});

describe("vision validation — ambiguous discovery", () => {
  it("requires selection for multiple wireless adb devices", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vision-val-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(root);

    const report = await discoverVisionDevices(root, {
      probeNetwork: true,
      fetchImpl: async () => ({ ok: false, status: 404 }) as Response,
      deviceProvider: {
        async listDevices() {
          return [
            {
              serial: "192.168.43.1:5555",
              state: "device",
              authorization: "authorized",
              connectionType: "wifi",
              controlHubLikelihood: "probable",
              rawProperties: {},
            },
            {
              serial: "192.168.49.1:5555",
              state: "device",
              authorization: "authorized",
              connectionType: "wifi",
              controlHubLikelihood: "unlikely",
              rawProperties: {},
            },
          ];
        },
        async installApk() {},
        async launchApp() {},
        async *streamLogs() {},
      },
    });

    expect(report.requiresSelection).toBe(true);
  });

  it("requires selection for multiple limelight host candidates", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vision-val-"));
    tempDirs.push(root);
    await fs.writeFile(path.join(root, "settings.gradle"), "include ':TeamCode'\n");
    await fs.writeFile(path.join(root, "build.common.gradle"), "// common\n");
    await fs.mkdir(path.join(root, "FtcRobotController"), { recursive: true });

    const report = await resolveLimelightHostReport(root, {
      probeNetwork: true,
      fetchImpl: async () => ({ ok: false, status: 404 }) as Response,
      deviceProvider: {
        async listDevices() {
          return [
            {
              serial: "192.168.43.1:5555",
              state: "device",
              authorization: "authorized",
              connectionType: "wifi",
              controlHubLikelihood: "probable",
              rawProperties: {},
            },
            {
              serial: "10.9.16.11:5555",
              state: "device",
              authorization: "authorized",
              connectionType: "wifi",
              controlHubLikelihood: "unlikely",
              rawProperties: {},
            },
          ];
        },
        async installApk() {},
        async launchApp() {},
        async *streamLogs() {},
      },
    });
    expect(report.requiresSelection).toBe(true);
  });
});

describe("vision validation — dashboard, bridge, easyopencv", () => {
  it("detects FTC Dashboard dependency in Gradle", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vision-val-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(root);
    await fs.writeFile(
      path.join(root, "build.dependencies.gradle"),
      "dependencies { implementation 'com.acmerobotics.dashboard:dashboard:0.6.0' }\n",
    );
    const detection = await detectFtcDashboardDependency(root);
    expect(detection.detected).toBe(true);
  });

  it("reports bridge scaffold status on minimal project", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vision-val-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(root);
    const report = await getVisionBridgeStatus(root);
    expect(report.schemaVersion).toBeTruthy();
    expect(report.bridgeUtility.present).toBe(false);
  });

  it("reports easyopencv discovery on minimal project", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vision-val-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(root);
    const report = await getEasyOpenCvStatus(root);
    expect(report.discovery).toBeDefined();
  });
});

describe("vision validation — pipeline and replay", () => {
  it("reports missing pipeline directory as validation error", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vision-val-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(root);
    const report = await validateLimelightArtifacts(root);
    expect(report.success).toBe(false);
    expect(report.errorCount).toBeGreaterThan(0);
  });

  it("rejects corrupt session header schema", () => {
    const result = validateSessionHeader({
      schemaVersion: "9.9.9",
      sessionId: "00000000-0000-4000-8000-000000000001",
      startedAt: new Date().toISOString(),
      sources: ["vision:limelight"],
    });
    expect(result.valid).toBe(false);
  });

  it("rejects corrupt session event lines", () => {
    const corrupt = validateSessionEvent({
      schemaVersion: SESSION_EVENT_SCHEMA_VERSION,
      sessionId: "00000000-0000-4000-8000-000000000001",
      sequence: 0,
      timestampMs: Date.now(),
      kind: "vision.results",
      sourceId: "vision:limelight",
      payload: { blob: "x".repeat(70_000) },
    });
    expect(corrupt.valid).toBe(false);
  });
});

describe("vision validation — MCP redaction", () => {
  it("strips sensitive keys from payloads", () => {
    const sanitized = sanitizeVisionMcpPayload(
      {
        host: "10.9.16.11",
        serial: "ABCD1234",
        password: "secret",
        nested: { ip: "192.168.1.1", note: "ok" },
      },
      { redact: true },
    ) as Record<string, unknown>;
    expect(sanitized.password).toBeUndefined();
    expect(JSON.stringify(sanitized)).not.toContain("ABCD1234");
  });
});

describe("vision validation — cross-platform paths", () => {
  it("uses platform-neutral relative paths in pipeline validation", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vision-val-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(root);
    const pipelineDir = path.join(root, "limelight");
    await fs.mkdir(pipelineDir, { recursive: true });
    await fs.writeFile(
      path.join(pipelineDir, "pipeline0.json"),
      JSON.stringify({ pipelineIndex: 0, name: "test" }),
    );
    await fs.writeFile(
      path.join(root, ".ftc-dev.json"),
      JSON.stringify({ vision: { limelight: { pipelineDirectory: "limelight" } } }),
    );

    const report = await validateLimelightArtifacts(root);
    expect(report.success).toBe(true);
    expect(report.issues.every((issue) => !issue.relativePath.includes("\\"))).toBe(true);
  });
});
