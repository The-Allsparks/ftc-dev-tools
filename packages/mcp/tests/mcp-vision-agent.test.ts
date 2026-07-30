import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  toolVisionCaptureFrame,
  toolVisionGetStatus,
  toolVisionListDevices,
  toolVisionUploadPipeline,
} from "../src/vision-agent-tools.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

async function writeOfficialProject(root: string): Promise<void> {
  await fs.writeFile(path.join(root, "settings.gradle"), "include ':TeamCode'\n");
  await fs.writeFile(path.join(root, "build.common.gradle"), "//\n");
  await fs.mkdir(path.join(root, "FtcRobotController"), { recursive: true });
  await fs.mkdir(path.join(root, "TeamCode"), { recursive: true });
}

function parsePayload(result: {
  content: Array<{ type: string; text?: string }>;
}): Record<string, unknown> {
  const text = result.content.find((c) => c.type === "text")?.text;
  expect(text).toBeTruthy();
  return JSON.parse(text!) as Record<string, unknown>;
}

describe("vision agent MCP tools", () => {
  it("returns vision status for a fixture project", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-mcp-vision-"));
    tempDirs.push(root);
    await writeOfficialProject(root);

    const result = await toolVisionGetStatus({ projectRoot: root });
    const payload = parsePayload(result);
    expect(payload.tool).toBe("vision_get_status");
    expect(payload.discovery).toBeDefined();
  });

  it("lists devices without mutating hardware", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-mcp-vision-"));
    tempDirs.push(root);
    await writeOfficialProject(root);

    const result = await toolVisionListDevices({ projectRoot: root, probeNetwork: false });
    const payload = parsePayload(result);
    expect(payload.tool).toBe("vision_list_devices");
    expect(Array.isArray(payload.endpoints)).toBe(true);
  });

  it("requires endpoint id before gated camera mutations", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-mcp-vision-"));
    tempDirs.push(root);
    await writeOfficialProject(root);

    const missingEndpoint = parsePayload(
      await toolVisionCaptureFrame({ projectRoot: root, dryRun: true }),
    );
    expect(missingEndpoint.code).toBe("VISION_SELECTION_REQUIRED");

    const needsConfirm = parsePayload(
      await toolVisionUploadPipeline({
        projectRoot: root,
        endpointId: "limelight-api:10.0.0.1:5807",
        artifactPath: "limelight/pipelines/0.json",
      }),
    );
    expect(needsConfirm.code).toBe("CONFIRMATION_REQUIRED");
  });
});
