import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { detectEasyOpenCvDependency } from "../src/vision/easyopencv/detect-dependency.js";
import { discoverEasyOpenCvWorkspace } from "../src/vision/easyopencv/discover.js";
import { normalizeEasyOpenCvDiagnosticResult } from "../src/vision/easyopencv/normalize.js";
import { assessDesktopReplayCompatibility } from "../src/vision/easyopencv/replay.js";
import { scanEasyOpenCvJavaSource } from "../src/vision/easyopencv/scan.js";
import { getEasyOpenCvStatus } from "../src/vision/easyopencv/status.js";
import {
  renderEasyOpenCvPipelineSource,
  renderEasyOpenCvWebcamInitSnippet,
} from "../src/vision/easyopencv/templates.js";

const tempDirs: string[] = [];
const fixturePath = path.join(import.meta.dirname, "fixtures", "easyopencv", "sample-opmode.java");

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
    path.join(root, "TeamCode", "src", "main", "java", "org", "firstinsparks", "ftc", "teamcode"),
    { recursive: true },
  );
  await fs.writeFile(
    path.join(root, "build.dependencies.gradle"),
    "dependencies {\n  implementation 'org.openftc:easyopencv:1.5.0'\n  implementation 'com.acmerobotics.dashboard:dashboard:0.4.15'\n}\n",
  );
}

describe("easyopencv java scan", () => {
  it("extracts webcam, pipeline, and dashboard stream from fixture", async () => {
    const source = await fs.readFile(fixturePath, "utf8");
    const scan = scanEasyOpenCvJavaSource("TeamCode/.../EasyOpenCvSampleOpMode.java", source);
    expect(scan.webcams).toHaveLength(1);
    expect(scan.webcams[0]?.cameraName).toBe("Webcam 1");
    expect(scan.webcams[0]?.pipelineClassName).toBe("SamplePipeline");
    expect(scan.webcams[0]?.dashboardStream).toBe(true);
    expect(scan.pipelines).toHaveLength(1);
    expect(scan.pipelines[0]?.className).toBe("SamplePipeline");
    expect(scan.pipelines[0]?.hasDashboardConfig).toBe(true);
    expect(scan.pipelines[0]?.desktopReplayCompatible).toBe("likely");
    expect(scan.ftcDashboardReference).toBe(true);
  });
});

describe("easyopencv dependency detection", () => {
  it("reads EasyOpenCV version from build.dependencies.gradle", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-eocv-dep-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(root);
    const dep = await detectEasyOpenCvDependency(root);
    expect(dep.detected).toBe(true);
    expect(dep.version).toBe("1.5.0");
  });
});

describe("easyopencv workspace discovery", () => {
  it("builds source navigation and flags multi-camera selection", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-eocv-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(root);
    const teamCodeJava = path.join(
      root,
      "TeamCode",
      "src",
      "main",
      "java",
      "org",
      "firstinsparks",
      "ftc",
      "teamcode",
    );
    await fs.writeFile(
      path.join(teamCodeJava, "VisionA.java"),
      await fs.readFile(fixturePath, "utf8"),
    );
    await fs.writeFile(
      path.join(teamCodeJava, "VisionB.java"),
      `import org.openftc.easyopencv.OpenCvWebcamFactory;
public class VisionB {
  void init() {
    OpenCvWebcamFactory.getInstance().createWebcam(hardwareMap.get(WebcamName.class, "Webcam 2"), new OtherPipeline());
  }
}`,
    );

    await fs.mkdir(path.join(root, "TeamCode", "src", "main", "res", "xml"), { recursive: true });
    await fs.writeFile(
      path.join(root, "TeamCode", "src", "main", "res", "xml", "robot.xml"),
      `<Robot type="FirstTechChallenge"><Webcam name="Webcam 1" /><Webcam name="Webcam 2" /></Robot>`,
    );

    const discovery = await discoverEasyOpenCvWorkspace(root);
    expect(discovery.gradleDependency.detected).toBe(true);
    expect(discovery.webcams.length).toBeGreaterThanOrEqual(2);
    expect(discovery.requiresSelection).toBe(true);
    expect(discovery.sourceNavigation.some((entry) => entry.kind === "pipeline")).toBe(true);
  });
});

describe("easyopencv replay heuristics", () => {
  it("marks Android-dependent pipelines unlikely for desktop replay", () => {
    const result = assessDesktopReplayCompatibility(`
      import android.graphics.Bitmap;
      public class BadPipeline extends OpenCvPipeline {
        public Mat processFrame(Mat input) { return input; }
      }
    `);
    expect(result.compatible).toBe("unlikely");
    expect(result.blockers).toContain("Android SDK import");
  });
});

describe("easyopencv normalize and templates", () => {
  it("parses diagnostic summaries and renders setup templates", () => {
    const normalized = normalizeEasyOpenCvDiagnosticResult({
      pipelineClassName: "SamplePipeline",
      summary: "fps: 28.5 latency=12 ms",
    });
    expect(normalized.fps).toBe(28.5);
    expect(normalized.latencyMs).toBe(12);

    const pipelineSource = renderEasyOpenCvPipelineSource({
      packageName: "org.firstinspires.ftc.teamcode.vision",
      className: "SamplePipeline",
    });
    expect(pipelineSource).toContain("extends OpenCvPipeline");

    const initSnippet = renderEasyOpenCvWebcamInitSnippet({
      packageName: "org.firstinspires.ftc.teamcode.vision",
      cameraName: "Webcam 1",
      pipelineClassName: "SamplePipeline",
      useDashboardStream: true,
    });
    expect(initSnippet).toContain("startCameraStream");
  });
});

describe("easyopencv status", () => {
  it("reports missing EasyOpenCV on minimal project without dependency", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-eocv-status-"));
    tempDirs.push(root);
    await fs.writeFile(
      path.join(root, "settings.gradle"),
      "include ':FtcRobotController', ':TeamCode'\n",
    );
    await fs.writeFile(path.join(root, "build.common.gradle"), "// common\n");
    await fs.mkdir(path.join(root, "FtcRobotController"), { recursive: true });
    await fs.mkdir(
      path.join(root, "TeamCode", "src", "main", "java", "org", "firstinsparks", "ftc", "teamcode"),
      { recursive: true },
    );
    await fs.writeFile(path.join(root, "build.dependencies.gradle"), "dependencies {\n}\n");

    const report = await getEasyOpenCvStatus(root);
    expect(report.discovery.easyOpenCvDetected).toBe(false);
    expect(report.message).toMatch(/not detected/i);
    expect(report.capabilities.desktopReplay).toBe(true);
    expect(report.capabilities.frameCapture).toBe(false);
  });
});
