import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FetchLike } from "../src/sdk/types.js";
import {
  discoverVisionDevices,
  extractWebcamDevicesFromXml,
} from "../src/vision/endpoints/discover-devices.js";
import { teamNumberToLimelightHost, wifiSerialToHost } from "../src/vision/endpoints/team-ip.js";
import { probeVisionEndpoint } from "../src/vision/endpoints/probe.js";
import type { VisionEndpointCandidate } from "../src/vision/endpoints/types.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

async function writeMinimalFtcProject(root: string): Promise<void> {
  await fs.writeFile(
    path.join(root, "settings.gradle"),
    "include ':FtcRobotController', ':TeamCode'\n",
  );
  await fs.writeFile(path.join(root, "build.common.gradle"), "// common\n");
  await fs.mkdir(path.join(root, "FtcRobotController"), { recursive: true });
  await fs.mkdir(path.join(root, "TeamCode", "src", "main", "res", "xml"), { recursive: true });
  await fs.mkdir(
    path.join(root, "TeamCode", "src", "main", "java", "org", "firstinsparks", "teamcode"),
    { recursive: true },
  );
  await fs.writeFile(path.join(root, "build.dependencies.gradle"), "dependencies {\n}\n");
}

describe("vision endpoint helpers", () => {
  it("derives Limelight host from team number", () => {
    expect(teamNumberToLimelightHost(916)).toBe("10.9.16.11");
    expect(teamNumberToLimelightHost(9106)).toBe("10.91.6.11");
    expect(teamNumberToLimelightHost(12345)).toBe("10.23.45.11");
  });

  it("parses wifi adb serial host", () => {
    expect(wifiSerialToHost("192.168.43.1:5555")).toBe("192.168.43.1");
    expect(wifiSerialToHost("emulator-5554")).toBeUndefined();
  });

  it("extracts webcam devices from robot config XML", () => {
    const names = extractWebcamDevicesFromXml(`
      <Robot type="FirstInspires-FTC">
        <WebcamName name="Webcam 1" />
      </Robot>
    `);
    expect(names).toEqual(["Webcam 1"]);
  });
});

describe("vision endpoint probing", () => {
  it("marks robot-side endpoints as not probed", async () => {
    const candidate: VisionEndpointCandidate = {
      id: "webcam:config-only:Cam",
      kind: "webcam-config",
      providerId: "vision:visionportal",
      location: "robot-side",
      sources: ["robot-config"],
      confidence: "high",
      evidence: ["Webcam in robot config"],
      configDeviceName: "Cam",
    };
    const probe = await probeVisionEndpoint(candidate, { probeNetwork: false });
    expect(probe.reachable).toBe("not-probed");
  });

  it("probes reachable limelight API with mock fetch", async () => {
    const fetchImpl: FetchLike = async () =>
      ({
        ok: true,
        status: 200,
      }) as Response;

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

    const probe = await probeVisionEndpoint(candidate, { fetchImpl, timeoutMs: 1000 });
    expect(probe.reachable).toBe("reachable");
    expect(probe.statusCode).toBe(200);
  });
});

describe("discoverVisionDevices", () => {
  it("collects config and robot-config endpoints without probing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vision-dev-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(root);
    await fs.writeFile(
      path.join(root, ".ftc-dev.json"),
      JSON.stringify({
        teamNumber: 916,
        vision: { limelight: { host: "limelight.local" } },
      }),
    );
    await fs.writeFile(
      path.join(root, "TeamCode", "src", "main", "res", "xml", "robot.xml"),
      `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>
<Robot type="FirstInspires-FTC">
  <WebcamName name="Front Cam" />
</Robot>`,
    );
    await fs.writeFile(
      path.join(root, "build.dependencies.gradle"),
      "dependencies { implementation 'com.acmerobotics.dashboard:dashboard:0.6.0' }\n",
    );

    const report = await discoverVisionDevices(root, { probeNetwork: false });
    expect(report.endpoints.some((endpoint) => endpoint.kind === "webcam-config")).toBe(true);
    expect(report.endpoints.some((endpoint) => endpoint.host === "limelight.local")).toBe(true);
    expect(report.endpoints.some((endpoint) => endpoint.kind === "ftc-dashboard")).toBe(true);
    expect(report.context.robotConfigWebcams).toContain("Front Cam");
    expect(report.endpoints.every((endpoint) => endpoint.probe.reachable === "skipped")).toBe(true);
  });

  it("requires selection when multiple wifi devices are connected", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vision-dev-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(root);

    const fetchImpl: FetchLike = async () =>
      ({
        ok: false,
        status: 404,
      }) as Response;

    const report = await discoverVisionDevices(root, {
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
    expect(report.selectionReasons.some((reason) => reason.includes("Multiple wireless adb"))).toBe(
      true,
    );
  });
});
