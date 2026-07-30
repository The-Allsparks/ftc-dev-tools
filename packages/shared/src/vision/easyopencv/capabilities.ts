import type { EasyOpenCvCapabilities } from "./types.js";

/** Desktop-side EasyOpenCV capabilities (VISION-09 foundation). */
export const EASYOPENCV_CAPABILITIES: EasyOpenCvCapabilities = {
  staticAnalysis: true,
  sourceNavigation: true,
  ftcDashboardStreaming: true,
  pipelineTemplates: true,
  diagnosticResultAdapter: true,
  desktopReplay: true,
  frameCapture: false,
  dashboardPipelineVariables: true,
};
