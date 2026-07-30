import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { NodeProcessRunner } from "../src/process/node-process-runner.js";
import {
  VISION_CODEGEN_LANGUAGE,
  renderLimelightOpModeSource,
  renderVisionPortalAprilTagOpModeSource,
  scaffoldVisionCodegen,
} from "../src/index.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

async function writeMinimalFtcProject(
  root: string,
  webcams: string[] = ["Webcam 1"],
): Promise<void> {
  await fs.writeFile(
    path.join(root, "settings.gradle"),
    "include ':FtcRobotController', ':TeamCode'\n",
  );
  await fs.writeFile(path.join(root, "build.common.gradle"), "// common\n");
  await fs.mkdir(path.join(root, "FtcRobotController"), { recursive: true });
  await fs.mkdir(path.join(root, "TeamCode", "src", "main", "java"), { recursive: true });
  const xmlDir = path.join(root, "TeamCode", "src", "main", "res", "xml");
  await fs.mkdir(xmlDir, { recursive: true });

  const webcamLines = webcams.map((name) => `<Webcam name="${name}" />`).join("\n  ");
  await fs.writeFile(
    path.join(xmlDir, "robot.xml"),
    `<Robot type="FirstTechChallenge">\n  ${webcamLines}\n</Robot>\n`,
  );
}

describe("vision codegen templates", () => {
  it("emits Java-only Limelight TeleOp with generated markers", () => {
    const source = renderLimelightOpModeSource({
      packageName: "org.firstinspires.ftc.teamcode.vision",
      className: "LimelightTeleOp",
      displayName: "Limelight TeleOp",
      opModeKind: "teleop",
      style: "linear",
      cameraName: "Webcam 1",
      limelightTableName: "limelight",
    });

    expect(source).toContain("public class LimelightTeleOp extends LinearOpMode");
    expect(source).toContain("NetworkTable");
    expect(source).toContain("VISION-12");
    expect(source).not.toContain("kotlin");
  });

  it("uses robot-config webcam name in VisionPortal AprilTag OpMode", () => {
    const source = renderVisionPortalAprilTagOpModeSource({
      packageName: "org.firstinspires.ftc.teamcode.vision",
      className: "AprilTagTeleOp",
      displayName: "AprilTag TeleOp",
      opModeKind: "teleop",
      style: "linear",
      cameraName: "Front Cam",
      robotConfigName: "robot",
    });

    expect(source).toContain('"Front Cam"');
    expect(source).toContain("Robot config: robot");
    expect(source).toContain("closeVisionPortal()");
  });
});

describe("scaffoldVisionCodegen", () => {
  it("dry-runs EasyOpenCV Java files using a single configured webcam", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vcodegen-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(root, ["Front Cam"]);

    const result = await scaffoldVisionCodegen({
      projectRoot: root,
      runner: new NodeProcessRunner(),
      kind: "easyopencv",
      className: "EasyOpenCvTeleOp",
      dryRun: true,
    });

    expect(result.success).toBe(true);
    expect(result.language).toBe(VISION_CODEGEN_LANGUAGE);
    expect(result.cameraName).toBe("Front Cam");
    expect(result.plan).toHaveLength(2);
    expect(result.plan.every((entry) => entry.relativePath.endsWith(".java"))).toBe(true);
    expect(result.sourcePreview).toContain("OpenCvWebcam");
  });

  it("requires explicit camera when multiple webcams are configured", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vcodegen-multi-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(root, ["Cam A", "Cam B"]);

    const result = await scaffoldVisionCodegen({
      projectRoot: root,
      runner: new NodeProcessRunner(),
      kind: "visionportal-apriltag",
      className: "VisionPortalTeleOp",
      dryRun: true,
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("Multiple webcams");
  });

  it("refuses to overwrite existing generated Java without force", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-vcodegen-exists-"));
    tempDirs.push(root);
    await writeMinimalFtcProject(root);

    const target = path.join(
      root,
      "TeamCode/src/main/java/org/firstinspires/ftc/teamcode/vision/LimelightTeleOp.java",
    );
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, "public class LimelightTeleOp {}", "utf8");

    const result = await scaffoldVisionCodegen({
      projectRoot: root,
      runner: new NodeProcessRunner(),
      kind: "limelight",
      className: "LimelightTeleOp",
      dryRun: true,
    });

    expect(result.success).toBe(false);
    expect(result.plan[0]?.action).toBe("skip");
  });
});
