import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadProjectConfig } from "../src/config/load.js";
import { discoverVisionWorkspace } from "../src/vision/discover.js";
import { getVisionStatus } from "../src/vision/status.js";

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
  await fs.mkdir(
    path.join(root, "TeamCode", "src", "main", "java", "org", "firstinsparks", "teamcode"),
    {
      recursive: true,
    },
  );
  await fs.writeFile(path.join(root, "build.dependencies.gradle"), "dependencies {\n}\n");
}

describe("vision workspace discovery", () => {
  it("detects VisionPortal imports in TeamCode", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vision-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(root);
    await fs.writeFile(
      path.join(
        root,
        "TeamCode",
        "src",
        "main",
        "java",
        "org",
        "firstinsparks",
        "teamcode",
        "VisionTest.java",
      ),
      "import org.firstinspires.ftc.vision.VisionPortal;\npublic class VisionTest {}\n",
    );

    const discovery = await discoverVisionWorkspace(root);
    expect(discovery.isOfficialFtcProject).toBe(true);
    expect(discovery.signals.some((signal) => signal.kind === "visionportal")).toBe(true);
    expect(discovery.suggestedDefaultProviderId).toBe("vision:visionportal");
  });

  it("loads vision config from .ftc-dev.json", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vision-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(root);
    await fs.writeFile(
      path.join(root, ".ftc-dev.json"),
      JSON.stringify({
        vision: {
          defaultProviderId: "vision:limelight",
          enabledProviderIds: ["vision:limelight"],
          limelight: { host: "limelight.local", pipelineDirectory: "limelight/pipelines" },
        },
      }),
    );

    const report = await getVisionStatus(root);
    expect(report.config.defaultProviderId).toBe("vision:limelight");
    expect(report.config.limelight?.host).toBe("limelight.local");
  });

  it("validates vision config via loadProjectConfig", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vision-"));
    tempDirs.push(root);
    await fs.writeFile(
      path.join(root, ".ftc-dev.json"),
      JSON.stringify({
        vision: {
          enabledProviderIds: ["vision:visionportal"],
        },
      }),
    );
    const result = await loadProjectConfig(root);
    expect(result.config.vision?.enabledProviderIds).toEqual(["vision:visionportal"]);
    expect(result.errors).toEqual([]);
  });
});
