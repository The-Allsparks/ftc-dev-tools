import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { FetchLike } from "../src/sdk/types.js";
import { diffLimelightJson } from "../src/vision/limelight/artifacts/json-diff.js";
import { diffLimelightPipeline } from "../src/vision/limelight/artifacts/diff.js";
import { scanLimelightArtifacts } from "../src/vision/limelight/artifacts/scan.js";
import { validateLimelightArtifacts } from "../src/vision/limelight/artifacts/validate.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

async function writePipelineProject(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-ll-pipe-"));
  tempDirs.push(root);
  await fs.mkdir(path.join(root, "limelight", "pipelines"), { recursive: true });
  await fs.writeFile(
    path.join(root, ".ftc-dev.json"),
    JSON.stringify({
      vision: {
        limelight: {
          host: "10.9.16.11",
          pipelineDirectory: "limelight/pipelines",
        },
      },
    }),
  );
  await fs.writeFile(
    path.join(root, "limelight", "pipelines", "0-color.vpr"),
    JSON.stringify({ area_max: 98.7, area_min: 1.5, pipeline_type: "pipe_color" }),
  );
  await fs.writeFile(path.join(root, "limelight", "pipelines", "bad.json"), "{ not-json");
  await fs.writeFile(path.join(root, "limelight", "pipelines", "snap.py"), "print('hi')\n");
  return root;
}

describe("limelight pipeline-as-code", () => {
  it("scans pipeline, python, and slot inference", async () => {
    const root = await writePipelineProject();
    const manifest = await scanLimelightArtifacts(root);
    expect(manifest.pipelineDirectory).toBe("limelight/pipelines");
    expect(manifest.pipelines.some((pipeline) => pipeline.slot === 0)).toBe(true);
    expect(manifest.pythonScripts.some((script) => script.relativePath.endsWith("snap.py"))).toBe(
      true,
    );
  });

  it("validates JSON and reports errors", async () => {
    const root = await writePipelineProject();
    const report = await validateLimelightArtifacts(root);
    expect(report.success).toBe(false);
    expect(report.issues.some((issue) => issue.relativePath.endsWith("bad.json"))).toBe(true);
  });

  it("diffs workspace and camera pipeline JSON", async () => {
    const workspace = { area_max: 98.7, area_min: 1.5, pipeline_type: "pipe_color" };
    const camera = { area_max: 90.0, area_min: 1.5, pipeline_type: "pipe_color" };
    const entries = diffLimelightJson(workspace, camera);
    expect(entries.some((entry) => entry.path === "area_max" && entry.kind === "changed")).toBe(
      true,
    );
  });

  it("fetches camera pipeline for diff via mock HTTP", async () => {
    const root = await writePipelineProject();
    const fetchImpl: FetchLike = async (input) => {
      const url = typeof input === "string" ? input : input.url;
      if (url.includes("/pipeline-atindex")) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({ area_max: 98.7, area_min: 1.5, pipeline_type: "pipe_color" }),
        } as Response;
      }
      return { ok: false, status: 404, text: async () => "" } as Response;
    };

    const report = await diffLimelightPipeline(root, { slot: 0, fetchImpl });
    expect(report.identical).toBe(true);
    expect(report.host).toBe("10.9.16.11");
  });
});
