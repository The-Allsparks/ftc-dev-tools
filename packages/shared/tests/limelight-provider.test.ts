import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import type { FetchLike } from "../src/sdk/types.js";
import {
  normalizeLimelightResults,
  normalizeLimelightStatus,
} from "../src/vision/limelight/normalize.js";
import { getLimelightResults } from "../src/vision/limelight/results.js";
import { resolveLimelightHostReport } from "../src/vision/limelight/resolve-host.js";
import { getLimelightStatus } from "../src/vision/limelight/status.js";

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

function mockFetch(routes: Record<string, unknown>): FetchLike {
  return async (input) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.endsWith("/status")) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(routes.status ?? {}),
      } as Response;
    }
    if (url.endsWith("/results")) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(routes.results ?? {}),
      } as Response;
    }
    return {
      ok: false,
      status: 404,
      text: async () => "not found",
    } as Response;
  };
}

describe("limelight normalize", () => {
  it("normalizes status fixture", async () => {
    const raw = await readFixture("status.json");
    const status = normalizeLimelightStatus(
      "10.9.16.11",
      "http://10.9.16.11:5807",
      raw,
      200,
      true,
      "ok",
    );
    expect(status.deviceName).toBe("limelight");
    expect(status.pipelineIndex).toBe(0);
    expect(status.fps).toBeCloseTo(63.55);
    expect(status.temperatureCelsius).toBeCloseTo(57.94);
  });

  it("normalizes valid results fixture", async () => {
    const raw = await readFixture("results-valid.json");
    const results = normalizeLimelightResults(
      "10.9.16.11",
      "http://10.9.16.11:5807",
      raw,
      200,
      true,
      "ok",
      60_000,
    );
    expect(results.target.valid).toBe(true);
    expect(results.target.latencyTotalMs).toBeCloseTo(33.84);
    expect(results.target.crosshairColorBgr).toEqual([120, 80, 40]);
    expect(results.stale).toBe(true);
  });
});

describe("limelight provider", () => {
  async function writeProjectWithHost(host: string): Promise<string> {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-ll-"));
    tempDirs.push(root);
    await fs.writeFile(
      path.join(root, ".ftc-dev.json"),
      JSON.stringify({ vision: { limelight: { host } } }),
    );
    return root;
  }

  it("resolves host from project config", async () => {
    const root = await writeProjectWithHost("limelight.local");
    const report = await resolveLimelightHostReport(root);
    expect(report.host).toBe("limelight.local");
    expect(report.requiresSelection).toBe(false);
  });

  it("requires selection when multiple hosts are discovered", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-ll-"));
    tempDirs.push(root);
    await fs.writeFile(path.join(root, "settings.gradle"), "include ':TeamCode'\n");
    await fs.writeFile(path.join(root, "build.common.gradle"), "// common\n");
    await fs.mkdir(path.join(root, "FtcRobotController"), { recursive: true });

    const fetchImpl = mockFetch({});
    const report = await resolveLimelightHostReport(root, {
      probeNetwork: true,
      fetchImpl,
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

  it("fetches status and results via mock HTTP", async () => {
    const root = await writeProjectWithHost("10.9.16.11");
    const statusFixture = await readFixture("status.json");
    const resultsFixture = await readFixture("results-valid.json");
    const fetchImpl = mockFetch({ status: statusFixture, results: resultsFixture });

    const status = await getLimelightStatus(root, { fetchImpl });
    expect(status.reachable).toBe(true);
    expect(status.deviceName).toBe("limelight");
    expect(status.capabilities.readStatus).toBe(true);
    expect(status.capabilities.pipelineSwitch).toBe(false);

    const results = await getLimelightResults(root, { fetchImpl, staleThresholdMs: 60_000 });
    expect(results.target.valid).toBe(true);
    expect(results.hostResolution.source).toBe("project-config");
  });
});
