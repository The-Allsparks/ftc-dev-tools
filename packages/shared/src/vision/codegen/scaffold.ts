import fs from "node:fs/promises";
import path from "node:path";
import { interpretFromUnknown } from "../../errors/interpret.js";
import { isValidJavaClassName, isValidJavaPackageName } from "../../opmode/defaults.js";
import { isGitWorkingTreeDirty } from "../../sdk/sync-sdk-update.js";
import { resolveVisionCodegenContext } from "./context.js";
import { DEFAULT_VISION_CODEGEN_PACKAGE, VISION_CODEGEN_LANGUAGE } from "./constants.js";
import { renderVisionCodegenSource } from "./templates.js";
import type {
  ScaffoldVisionCodegenOptions,
  VisionCodegenKind,
  VisionCodegenPlanEntry,
  VisionCodegenResult,
} from "./types.js";

function normalizeKind(value: string): VisionCodegenKind | undefined {
  const normalized = value.trim().toLowerCase();
  const kinds: VisionCodegenKind[] = [
    "easyopencv",
    "visionportal-apriltag",
    "visionportal-color",
    "limelight",
    "dashboard-stream",
  ];
  return kinds.find((kind) => kind === normalized);
}

export function parseVisionCodegenKind(value: string): VisionCodegenKind | undefined {
  return normalizeKind(value);
}

export async function scaffoldVisionCodegen(
  options: ScaffoldVisionCodegenOptions,
): Promise<VisionCodegenResult> {
  const projectRoot = path.resolve(options.projectRoot);
  const dryRun = options.dryRun === true;
  const kind = options.kind;
  const className = options.className.trim();
  const packageName = (options.packageName ?? DEFAULT_VISION_CODEGEN_PACKAGE).trim();
  const opModeKind =
    options.opModeKind ??
    (kind === "limelight" || kind === "dashboard-stream" ? "teleop" : "teleop");
  const style = options.style ?? "linear";
  const displayName = (options.name ?? className).trim();
  const warnings: string[] = [
    "Generated Java TeamCode only — Kotlin OpModes are not supported by vision codegen.",
    "Review generated imports against your FTC SDK version before deploying to a robot.",
  ];

  if (kind === "limelight" || kind === "dashboard-stream") {
    if (options.opModeKind === "autonomous") {
      warnings.push(
        `${kind} generator always produces a TeleOp skeleton for development streaming.`,
      );
    }
  }

  const baseFailure = (
    message: string,
    code: string,
    plan: VisionCodegenPlanEntry[] = [],
  ): VisionCodegenResult => ({
    success: false,
    dryRun,
    kind,
    language: VISION_CODEGEN_LANGUAGE,
    plan,
    appliedPaths: [],
    packageName,
    className,
    message,
    warnings,
    error: interpretFromUnknown(Object.assign(new Error(message), { code })),
  });

  if (!isValidJavaClassName(className)) {
    return baseFailure(`Invalid Java class name: ${className}`, "VISION_CODEGEN_INVALID_NAME");
  }

  if (!isValidJavaPackageName(packageName)) {
    return baseFailure(
      `Invalid Java package name: ${packageName}`,
      "VISION_CODEGEN_INVALID_PACKAGE",
    );
  }

  try {
    const context = await resolveVisionCodegenContext({
      projectRoot,
      packageName,
      cameraName: options.cameraName,
      configName: options.configName,
    });

    if (!context.teamCodeSourcePath) {
      return baseFailure(
        "Official FTC project with TeamCode is required for vision codegen.",
        "VISION_CODEGEN_PROJECT_UNSUPPORTED",
      );
    }

    const needsCamera =
      kind === "easyopencv" ||
      kind === "visionportal-apriltag" ||
      kind === "visionportal-color" ||
      kind === "dashboard-stream";

    if (needsCamera && context.requiresCameraSelection) {
      return {
        ...baseFailure(
          context.cameraSelectionMessage ?? "Explicit camera selection required.",
          "VISION_CODEGEN_CAMERA_SELECTION",
        ),
        cameraName: options.cameraName,
        configName: context.robotConfigName,
      };
    }

    const useDashboardStream =
      options.useDashboardStream === true ||
      (options.useDashboardStream !== false &&
        kind === "easyopencv" &&
        context.ftcDashboardDetected);

    if (useDashboardStream && !context.ftcDashboardDetected) {
      warnings.push(
        "FTC Dashboard dependency was not detected in Gradle files; verify imports compile.",
      );
    }

    const templateInput = {
      packageName,
      className,
      displayName,
      opModeKind,
      style,
      group: options.group,
      cameraName: context.cameraName ?? "Webcam 1",
      pipelineClassName: options.pipelineClassName?.trim(),
      limelightTableName: options.limelightTableName?.trim(),
      useDashboardStream,
      robotConfigName: context.robotConfigName,
    };

    const rendered = renderVisionCodegenSource(kind, templateInput);
    if (rendered.files.length === 0) {
      return baseFailure(`Unsupported vision codegen kind: ${kind}`, "VISION_CODEGEN_UNSUPPORTED");
    }

    const plan: VisionCodegenPlanEntry[] = [];
    for (const file of rendered.files) {
      const relativePath = file.relativePath.replace(/\\/g, "/");
      let action: VisionCodegenPlanEntry["action"] = "add";
      try {
        await fs.access(path.join(projectRoot, relativePath));
        action = options.force ? "overwrite" : "skip";
      } catch {
        action = "add";
      }
      plan.push({ relativePath, action });
    }

    const blocked = plan.filter((entry) => entry.action === "skip");
    if (blocked.length > 0 && !options.force) {
      return {
        ...baseFailure(
          `Generated file(s) already exist (${blocked.map((entry) => entry.relativePath).join(", ")}). Pass --force to overwrite.`,
          "VISION_CODEGEN_EXISTS",
          plan,
        ),
        cameraName: templateInput.cameraName,
        configName: context.robotConfigName,
        sourcePreview: rendered.files
          .map((file) => file.content)
          .join("\n\n// --- next file ---\n\n"),
      };
    }

    const preview = rendered.files.map((file) => file.content).join("\n\n// --- next file ---\n\n");

    if (!dryRun && !options.yes) {
      return {
        success: false,
        dryRun: true,
        kind,
        language: VISION_CODEGEN_LANGUAGE,
        plan,
        appliedPaths: [],
        packageName,
        className,
        cameraName: templateInput.cameraName,
        configName: context.robotConfigName,
        message: "Refusing to write generated Java without --yes.",
        warnings,
        sourcePreview: preview,
        error: interpretFromUnknown(
          Object.assign(new Error("Vision codegen requires --yes."), {
            code: "VISION_CODEGEN_ABORTED",
          }),
        ),
      };
    }

    if (!dryRun && !options.force) {
      const dirty = await isGitWorkingTreeDirty(options.runner, projectRoot);
      if (dirty) {
        return {
          success: false,
          dryRun: false,
          kind,
          language: VISION_CODEGEN_LANGUAGE,
          plan,
          appliedPaths: [],
          packageName,
          className,
          cameraName: templateInput.cameraName,
          configName: context.robotConfigName,
          message: "Refusing vision codegen while the git working tree is dirty.",
          warnings,
          sourcePreview: preview,
          error: interpretFromUnknown(
            Object.assign(new Error("Refusing vision codegen while git working tree is dirty."), {
              code: "VISION_CODEGEN_DIRTY_TREE",
            }),
          ),
        };
      }
    }

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        kind,
        language: VISION_CODEGEN_LANGUAGE,
        plan,
        appliedPaths: [],
        packageName,
        className,
        cameraName: templateInput.cameraName,
        configName: context.robotConfigName,
        message: `Dry run: would write ${plan.length} Java file(s) for ${kind}.`,
        warnings,
        sourcePreview: preview,
      };
    }

    const appliedPaths: string[] = [];
    for (const file of rendered.files) {
      const relativePath = file.relativePath.replace(/\\/g, "/");
      const entry = plan.find((item) => item.relativePath === relativePath);
      if (entry?.action === "skip") {
        continue;
      }
      const absolutePath = path.join(projectRoot, relativePath);
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, file.content, "utf8");
      appliedPaths.push(relativePath);
    }

    return {
      success: true,
      dryRun: false,
      kind,
      language: VISION_CODEGEN_LANGUAGE,
      plan,
      appliedPaths,
      packageName,
      className,
      cameraName: templateInput.cameraName,
      configName: context.robotConfigName,
      message: `Generated ${appliedPaths.length} Java file(s) for ${kind} under ${packageName}.`,
      warnings,
      sourcePreview: preview,
    };
  } catch (error) {
    return {
      success: false,
      dryRun,
      kind,
      language: VISION_CODEGEN_LANGUAGE,
      plan: [],
      appliedPaths: [],
      packageName,
      className,
      message: "Failed to generate vision Java source.",
      warnings,
      error: interpretFromUnknown(error),
    };
  }
}
