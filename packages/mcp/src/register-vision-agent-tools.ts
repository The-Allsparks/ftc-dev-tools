import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  toolVisionAnalyzeRecording,
  toolVisionActivatePipeline,
  toolVisionCaptureFrame,
  toolVisionComparePipeline,
  toolVisionGenerateCode,
  toolVisionGetDiagnostics,
  toolVisionGetStatus,
  toolVisionInspectSession,
  toolVisionListDevices,
  toolVisionListPipelines,
  toolVisionListSessions,
  toolVisionUploadFieldmap,
  toolVisionUploadPipeline,
  toolVisionUploadPython,
  toolVisionValidatePipeline,
} from "./vision-agent-tools.js";

const visionAgentRootShape = {
  projectRoot: z
    .string()
    .optional()
    .describe("FTC project root (default: FTC_PROJECT_ROOT env or process cwd)"),
  redact: z
    .boolean()
    .optional()
    .describe("Redact IP addresses and adb serials in the response payload"),
};

const visionAgentEndpointShape = {
  ...visionAgentRootShape,
  endpointId: z
    .string()
    .optional()
    .describe("Explicit endpoint id from vision_list_devices (required for camera mutations)"),
  host: z.string().optional().describe("Limelight or robot hostname when endpointId is omitted"),
};

const confirmShape = {
  dryRun: z.boolean().optional().describe("Preview without writing or mutating devices"),
  confirmPlanId: z.string().optional().describe("Plan id from a prior dryRun preview"),
  confirmPlanHash: z.string().optional().describe("Plan hash from a prior dryRun preview"),
  yes: z
    .boolean()
    .optional()
    .describe("Not accepted alone; use dryRun then confirmPlanId/confirmPlanHash"),
};

/** Register agent-friendly vision MCP tools (VISION-16). Legacy vision_* tools remain registered separately. */
export function registerVisionAgentTools(server: McpServer): void {
  server.registerTool(
    "vision_list_devices",
    {
      title: "List vision devices",
      description:
        "Read-only: discover vision endpoints from config and connected robots. Use endpoint ids for mutations — never auto-select.",
      inputSchema: z.object({
        ...visionAgentRootShape,
        probeNetwork: z.boolean().optional(),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => toolVisionListDevices(args),
  );

  server.registerTool(
    "vision_get_status",
    {
      title: "Get vision status",
      description: "Read-only: vision configuration and workspace discovery signals.",
      inputSchema: z.object(visionAgentRootShape),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolVisionGetStatus(args),
  );

  server.registerTool(
    "vision_get_diagnostics",
    {
      title: "Get vision diagnostics",
      description: "Read-only: aggregated vision setup diagnostics with student-friendly codes.",
      inputSchema: z.object({
        ...visionAgentRootShape,
        probeNetwork: z.boolean().optional(),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => toolVisionGetDiagnostics(args),
  );

  server.registerTool(
    "vision_list_pipelines",
    {
      title: "List vision pipelines",
      description: "Read-only: list Limelight pipeline-as-code artifacts in the workspace.",
      inputSchema: z.object(visionAgentRootShape),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolVisionListPipelines(args),
  );

  server.registerTool(
    "vision_validate_pipeline",
    {
      title: "Validate vision pipeline",
      description: "Read-only: validate workspace Limelight pipeline JSON files.",
      inputSchema: z.object(visionAgentRootShape),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolVisionValidatePipeline(args),
  );

  server.registerTool(
    "vision_compare_pipeline",
    {
      title: "Compare vision pipeline",
      description:
        "Read-only: compare workspace pipeline JSON with a camera slot. Requires slot and endpointId or host.",
      inputSchema: z.object({
        ...visionAgentEndpointShape,
        slot: z.number().int().min(0).max(9),
        path: z.string().optional(),
        raw: z.boolean().optional(),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => toolVisionComparePipeline(args),
  );

  server.registerTool(
    "vision_list_sessions",
    {
      title: "List vision sessions",
      description: "Read-only (deferred): list recorded vision sessions.",
      inputSchema: z.object(visionAgentRootShape),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolVisionListSessions(args),
  );

  server.registerTool(
    "vision_inspect_session",
    {
      title: "Inspect vision session",
      description: "Read-only (deferred): inspect a recorded session file.",
      inputSchema: z.object(visionAgentRootShape),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolVisionInspectSession(args),
  );

  server.registerTool(
    "vision_analyze_recording",
    {
      title: "Analyze vision recording",
      description: "Read-only (deferred): analyze a session recording for vision metrics.",
      inputSchema: z.object(visionAgentRootShape),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolVisionAnalyzeRecording(args),
  );

  server.registerTool(
    "vision_generate_code",
    {
      title: "Generate vision code",
      description:
        "Mutating: generate Java TeamCode vision stubs. Requires dryRun preview then confirmPlanId/confirmPlanHash. Kotlin not supported.",
      inputSchema: z.object({
        ...visionAgentRootShape,
        ...confirmShape,
        kind: z.string(),
        className: z.string(),
        pipelineClassName: z.string().optional(),
        packageName: z.string().optional(),
        cameraName: z.string().optional(),
        configName: z.string().optional(),
        type: z.enum(["teleop", "autonomous"]).optional(),
        style: z.enum(["linear", "iterative"]).optional(),
        group: z.string().optional(),
        name: z.string().optional(),
        limelightTableName: z.string().optional(),
        useDashboardStream: z.boolean().optional(),
        force: z.boolean().optional(),
      }),
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async (args) => toolVisionGenerateCode(args),
  );

  server.registerTool(
    "vision_capture_frame",
    {
      title: "Capture vision frame",
      description:
        "Mutating (deferred): capture a still frame. Requires endpointId or host plus confirmation. Returns file references only when implemented.",
      inputSchema: z.object({
        ...visionAgentEndpointShape,
        ...confirmShape,
      }),
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async (args) => toolVisionCaptureFrame(args),
  );

  server.registerTool(
    "vision_upload_pipeline",
    {
      title: "Upload vision pipeline",
      description:
        "Mutating (deferred): upload workspace pipeline JSON to Limelight. Requires endpointId, artifactPath, and confirmation.",
      inputSchema: z.object({
        ...visionAgentEndpointShape,
        ...confirmShape,
        artifactPath: z.string(),
      }),
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async (args) => toolVisionUploadPipeline(args),
  );

  server.registerTool(
    "vision_activate_pipeline",
    {
      title: "Activate vision pipeline",
      description:
        "Mutating (deferred): activate a pipeline slot on Limelight. Requires endpointId, slot, and confirmation.",
      inputSchema: z.object({
        ...visionAgentEndpointShape,
        ...confirmShape,
        slot: z.number().int().min(0).max(9),
      }),
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async (args) => toolVisionActivatePipeline(args),
  );

  server.registerTool(
    "vision_upload_python",
    {
      title: "Upload Limelight Python",
      description:
        "Mutating (deferred): upload SnapScript Python. Requires endpointId, artifactPath, and confirmation.",
      inputSchema: z.object({
        ...visionAgentEndpointShape,
        ...confirmShape,
        artifactPath: z.string(),
      }),
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async (args) => toolVisionUploadPython(args),
  );

  server.registerTool(
    "vision_upload_fieldmap",
    {
      title: "Upload Limelight field map",
      description:
        "Mutating (deferred): upload field map JSON. Requires endpointId, artifactPath, and confirmation.",
      inputSchema: z.object({
        ...visionAgentEndpointShape,
        ...confirmShape,
        artifactPath: z.string(),
      }),
      annotations: { readOnlyHint: false, openWorldHint: true },
    },
    async (args) => toolVisionUploadFieldmap(args),
  );
}
