import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getVisionBridgeStatus } from "../src/vision/bridge/status.js";
import { renderVisionDiagnosticBridgeSource } from "../src/vision/bridge/templates.js";
import { discoverVisionPortalWorkspace } from "../src/vision/visionportal/discover.js";
import {
  normalizeVisionPortalProcessorKind,
  normalizeVisionPortalProcessorResult,
} from "../src/vision/visionportal/normalize.js";
import { scanVisionPortalJavaSource } from "../src/vision/visionportal/scan.js";
import { getVisionPortalStatus } from "../src/vision/visionportal/status.js";

const tempDirs: string[] = [];
const fixturePath = path.join(
  import.meta.dirname,
  "fixtures",
  "visionportal",
  "sample-opmode.java",
);

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
  await fs.writeFile(path.join(root, "build.dependencies.gradle"), "dependencies {\n}\n");
}

describe("visionportal java scan", () => {
  it("extracts camera, resolution, stream format, and processors from fixture", async () => {
    const source = await fs.readFile(fixturePath, "utf8");
    const configs = scanVisionPortalJavaSource("TeamCode/.../SampleVisionOpMode.java", source);
    expect(configs).toHaveLength(1);
    const config = configs[0]!;
    expect(config.initPattern).toBe("builder");
    expect(config.cameraName).toBe("Webcam 1");
    expect(config.resolution).toEqual({ width: 640, height: 480 });
    expect(config.streamFormat).toBe("MJPEG");
    expect(config.processors).toHaveLength(1);
    expect(config.processors[0]?.kind).toBe("apriltag");
    expect(config.processors[0]?.variableName).toBe("aprilTag");
  });
});

describe("visionportal workspace discovery", () => {
  it("cross-references robot config webcams and flags ambiguous cameras", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vp-"));
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
      `import org.firstinspires.ftc.vision.VisionPortal;
public class VisionB {
  VisionPortal portal = VisionPortal.easyInitializeFromCameraName("Webcam 2");
}`,
    );

    await fs.mkdir(path.join(root, "TeamCode", "src", "main", "res", "xml"), { recursive: true });
    await fs.writeFile(
      path.join(root, "TeamCode", "src", "main", "res", "xml", "robot.xml"),
      `<Robot type="FirstTechChallenge">
  <Webcam name="Webcam 1" />
  <Webcam name="Webcam 2" />
</Robot>`,
    );

    const discovery = await discoverVisionPortalWorkspace(root);
    expect(discovery.configs).toHaveLength(2);
    expect(discovery.robotConfigWebcams).toEqual(["Webcam 1", "Webcam 2"]);
    expect(discovery.requiresSelection).toBe(true);
    expect(
      discovery.selectionReasons.some((reason) =>
        /Multiple VisionPortal camera names/i.test(reason),
      ),
    ).toBe(true);
  });
});

describe("visionportal normalize", () => {
  it("normalizes processor kinds and AprilTag summaries", () => {
    expect(normalizeVisionPortalProcessorKind("AprilTagProcessor")).toBe("apriltag");
    expect(normalizeVisionPortalProcessorKind("ColorProcessor")).toBe("color");

    const result = normalizeVisionPortalProcessorResult({
      kind: "apriltag",
      summary: "3 tags ids: 1, 2, 5",
    });
    expect(result.aprilTag?.tagCount).toBe(3);
    expect(result.aprilTag?.tagIds).toEqual([1, 2, 5]);
  });
});

describe("visionportal status", () => {
  it("reports missing VisionPortal on minimal project", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vp-status-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(root);

    const report = await getVisionPortalStatus(root);
    expect(report.discovery.configs).toHaveLength(0);
    expect(report.message).toMatch(/not detected/i);
    expect(report.capabilities.staticAnalysis).toBe(true);
    expect(report.capabilities.cameraControls).toBe(false);
  });
});

describe("visionportal bridge integration", () => {
  it("enables liveVisionPortalDiagnostics when detailed config exists", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vp-bridge-"));
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
      path.join(teamCodeJava, "Vision.java"),
      await fs.readFile(fixturePath, "utf8"),
    );

    const report = await getVisionBridgeStatus(root);
    expect(report.visionPortalDetected).toBe(true);
    expect(report.capabilities.liveVisionPortalDiagnostics).toBe(true);
  });

  it("renders VisionPortal helpers when requested", () => {
    const source = renderVisionDiagnosticBridgeSource({
      packageName: "org.firstinspires.ftc.teamcode.vision",
      includeVisionPortalHelpers: true,
    });
    expect(source).toContain("cameraFromPortal");
    expect(source).toContain("processorsFromPortal");
    expect(source).toContain("import org.firstinspires.ftc.vision.VisionPortal");
  });
});
