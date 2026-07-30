import { EASYOPENCV_CAPABILITIES } from "./capabilities.js";
import { discoverEasyOpenCvWorkspace } from "./discover.js";
import type { EasyOpenCvStatusReport } from "./types.js";

export async function getEasyOpenCvStatus(projectRoot: string): Promise<EasyOpenCvStatusReport> {
  const generatedAt = new Date().toISOString();
  const discovery = await discoverEasyOpenCvWorkspace(projectRoot);
  const humanSummary: string[] = [];

  if (!discovery.isOfficialFtcProject) {
    humanSummary.push("Project layout: not an official FTC project");
  } else {
    humanSummary.push("Project layout: official FTC project");
  }

  if (discovery.gradleDependency.detected) {
    humanSummary.push(
      discovery.gradleDependency.version
        ? `Gradle dependency: EasyOpenCV ${discovery.gradleDependency.version}`
        : "Gradle dependency: EasyOpenCV detected",
    );
  } else {
    humanSummary.push("Gradle dependency: not detected");
  }

  humanSummary.push(
    `FTC Dashboard: ${discovery.ftcDashboardDetected ? "detected/referenced" : "not detected"}`,
  );

  if (discovery.robotConfigWebcams.length > 0) {
    humanSummary.push(`Robot config webcams: ${discovery.robotConfigWebcams.join(", ")}`);
  }

  if (discovery.pipelines.length === 0) {
    humanSummary.push("Pipeline classes: none found");
  } else {
    humanSummary.push(`Pipeline classes: ${discovery.pipelines.length}`);
    for (const pipeline of discovery.pipelines) {
      humanSummary.push(
        `  ${pipeline.className} (${pipeline.relativePath}) | replay=${pipeline.desktopReplayCompatible}${pipeline.hasDashboardConfig ? " | @Config" : ""}`,
      );
    }
  }

  if (discovery.webcams.length === 0) {
    humanSummary.push("Webcam initialization: none found");
  } else {
    humanSummary.push(`Webcam initialization: ${discovery.webcams.length} site(s)`);
    for (const webcam of discovery.webcams) {
      const parts = [webcam.relativePath];
      if (webcam.cameraName) {
        parts.push(`camera=${webcam.cameraName}`);
      }
      if (webcam.pipelineClassName) {
        parts.push(`pipeline=${webcam.pipelineClassName}`);
      }
      if (webcam.dashboardStream) {
        parts.push("dashboard-stream=yes");
      }
      humanSummary.push(`  ${parts.join(" | ")}`);
    }
  }

  if (discovery.sourceNavigation.length > 0) {
    humanSummary.push("Source navigation:");
    for (const entry of discovery.sourceNavigation) {
      humanSummary.push(`  [${entry.kind}] ${entry.label} → ${entry.relativePath}`);
    }
  }

  let message: string;
  if (!discovery.isOfficialFtcProject) {
    message = "Not an official FTC project; EasyOpenCV status is limited.";
  } else if (!discovery.easyOpenCvDetected) {
    message = "EasyOpenCV was not detected in this project.";
  } else if (discovery.requiresSelection) {
    message = discovery.selectionReasons[0] ?? "Multiple EasyOpenCV targets require selection.";
  } else {
    message = "EasyOpenCV configuration detected in this project.";
  }

  return {
    projectRoot: discovery.projectRoot,
    discovery,
    capabilities: { ...EASYOPENCV_CAPABILITIES },
    message,
    humanSummary,
    generatedAt,
  };
}
