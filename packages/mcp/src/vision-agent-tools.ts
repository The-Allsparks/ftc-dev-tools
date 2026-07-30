import {
  assertVisionMutationTarget,
  buildDeferredVisionMcpResult,
  collectVisionDiagnostics,
  diffLimelightPipeline,
  discoverVisionDevices,
  getVisionStatus,
  hostFromVisionTarget,
  resolveVisionEndpoint,
  sanitizeVisionMcpPayload,
  scanLimelightArtifacts,
  validateLimelightArtifacts,
} from "@ftc-dev-tools/shared";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { createMcpContext, tryCreateDeviceProvider } from "./context.js";
import { runGatedMutation, type MutationConfirmArgs } from "./mutation-gate.js";
import { jsonResult } from "./result.js";
import { toolVisionCodegen } from "./tools.js";

export interface VisionAgentProjectArgs {
  projectRoot?: string;
  redact?: boolean;
}

export interface VisionAgentEndpointArgs extends VisionAgentProjectArgs {
  endpointId?: string;
  host?: string;
}

function ctxFrom(args: VisionAgentProjectArgs) {
  return createMcpContext(args.projectRoot);
}

function wrapReadOnly<T>(
  tool: string,
  data: T,
  args: VisionAgentProjectArgs,
  isError = false,
): CallToolResult {
  return jsonResult(
    sanitizeVisionMcpPayload(
      {
        tool,
        ...((typeof data === "object" && data !== null ? data : { data }) as Record<
          string,
          unknown
        >),
      },
      { redact: args.redact === true },
    ),
    isError,
  );
}

export async function toolVisionListDevices(
  args: VisionAgentProjectArgs & { probeNetwork?: boolean },
): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  const deviceProvider = await tryCreateDeviceProvider(ctx);
  const report = await discoverVisionDevices(ctx.projectRoot, {
    deviceProvider,
    runner: ctx.runner,
    probeNetwork: args.probeNetwork ?? Boolean(deviceProvider),
  });
  return wrapReadOnly("vision_list_devices", report, args, report.requiresSelection);
}

export async function toolVisionGetStatus(args: VisionAgentProjectArgs): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  return wrapReadOnly("vision_get_status", await getVisionStatus(ctx.projectRoot), args);
}

export async function toolVisionGetDiagnostics(
  args: VisionAgentProjectArgs & { probeNetwork?: boolean },
): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  const deviceProvider = await tryCreateDeviceProvider(ctx);
  const report = await collectVisionDiagnostics(ctx.projectRoot, {
    deviceProvider,
    runner: ctx.runner,
    probeNetwork: args.probeNetwork,
  });
  return wrapReadOnly("vision_get_diagnostics", report, args, report.summary.errorCount > 0);
}

export async function toolVisionListPipelines(
  args: VisionAgentProjectArgs,
): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  return wrapReadOnly("vision_list_pipelines", await scanLimelightArtifacts(ctx.projectRoot), args);
}

export async function toolVisionValidatePipeline(
  args: VisionAgentProjectArgs,
): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  const report = await validateLimelightArtifacts(ctx.projectRoot);
  return wrapReadOnly("vision_validate_pipeline", report, args, !report.success);
}

export async function toolVisionComparePipeline(
  args: VisionAgentEndpointArgs & { slot: number; path?: string; raw?: boolean },
): Promise<CallToolResult> {
  const target = assertVisionMutationTarget({
    tool: "vision_compare_pipeline",
    endpointId: args.endpointId,
    host: args.host,
  });
  if (!target.ok) {
    return jsonResult({ code: target.code, message: target.message }, true);
  }
  const ctx = ctxFrom(args);
  const deviceProvider = await tryCreateDeviceProvider(ctx);
  const resolved = args.endpointId
    ? await resolveVisionEndpoint(ctx.projectRoot, args.endpointId, {
        deviceProvider,
        runner: ctx.runner,
      })
    : undefined;
  if (args.endpointId && !resolved) {
    return jsonResult(
      { code: "VISION_SELECTION_REQUIRED", message: `Unknown endpointId: ${args.endpointId}` },
      true,
    );
  }
  const host = hostFromVisionTarget({ host: args.host, resolved });
  const report = await diffLimelightPipeline(ctx.projectRoot, {
    slot: args.slot,
    host,
    workspacePath: args.path,
    includeRaw: args.raw === true,
    deviceProvider,
    runner: ctx.runner,
  });
  return wrapReadOnly("vision_compare_pipeline", report, args);
}

export async function toolVisionListSessions(
  args: VisionAgentProjectArgs,
): Promise<CallToolResult> {
  return wrapReadOnly(
    "vision_list_sessions",
    buildDeferredVisionMcpResult("vision_list_sessions"),
    args,
    true,
  );
}

export async function toolVisionInspectSession(
  args: VisionAgentProjectArgs,
): Promise<CallToolResult> {
  return wrapReadOnly(
    "vision_inspect_session",
    buildDeferredVisionMcpResult("vision_inspect_session"),
    args,
    true,
  );
}

export async function toolVisionAnalyzeRecording(
  args: VisionAgentProjectArgs,
): Promise<CallToolResult> {
  return wrapReadOnly(
    "vision_analyze_recording",
    buildDeferredVisionMcpResult("vision_analyze_recording"),
    args,
    true,
  );
}

export async function toolVisionGenerateCode(
  args: VisionAgentProjectArgs &
    MutationConfirmArgs & {
      kind: string;
      className: string;
      pipelineClassName?: string;
      packageName?: string;
      cameraName?: string;
      configName?: string;
      type?: "teleop" | "autonomous";
      style?: "linear" | "iterative";
      group?: string;
      name?: string;
      limelightTableName?: string;
      useDashboardStream?: boolean;
      force?: boolean;
    },
): Promise<CallToolResult> {
  return toolVisionCodegen(args);
}

async function gatedDeferredVisionMutation(
  args: VisionAgentEndpointArgs &
    MutationConfirmArgs & {
      artifactPath?: string;
      slot?: number;
    },
  tool: string,
  previewMessage: string,
): Promise<CallToolResult> {
  const target = assertVisionMutationTarget({
    tool,
    endpointId: args.endpointId,
    host: args.host,
  });
  if (!target.ok) {
    return jsonResult({ code: target.code, message: target.message }, true);
  }
  const ctx = ctxFrom(args);
  const payload = {
    endpointId: args.endpointId,
    host: args.host,
    artifactPath: args.artifactPath,
    slot: args.slot,
  };
  return runGatedMutation(args, tool, ctx.projectRoot, payload, previewMessage, async (dryRun) => {
    const deferred = buildDeferredVisionMcpResult(tool);
    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        preview: deferred,
        message: `${previewMessage} (dry-run — implementation deferred).`,
      };
    }
    return {
      success: false,
      ...deferred,
    };
  });
}

export async function toolVisionCaptureFrame(
  args: VisionAgentEndpointArgs & MutationConfirmArgs,
): Promise<CallToolResult> {
  return gatedDeferredVisionMutation(
    args,
    "vision_capture_frame",
    "Capture a still frame from the named vision endpoint.",
  );
}

export async function toolVisionUploadPipeline(
  args: VisionAgentEndpointArgs & MutationConfirmArgs & { artifactPath: string },
): Promise<CallToolResult> {
  if (!args.artifactPath?.trim()) {
    return jsonResult(
      { code: "VISION_PIPELINE_ARTIFACT_ERROR", message: "artifactPath is required." },
      true,
    );
  }
  return gatedDeferredVisionMutation(
    args,
    "vision_upload_pipeline",
    "Upload workspace Limelight pipeline JSON to the named endpoint.",
  );
}

export async function toolVisionActivatePipeline(
  args: VisionAgentEndpointArgs & MutationConfirmArgs & { slot: number },
): Promise<CallToolResult> {
  if (args.slot === undefined || Number.isNaN(args.slot)) {
    return jsonResult(
      { code: "VISION_PIPELINE_ARTIFACT_ERROR", message: "slot (0-9) is required." },
      true,
    );
  }
  return gatedDeferredVisionMutation(
    args,
    "vision_activate_pipeline",
    "Activate a Limelight pipeline slot on the named endpoint.",
  );
}

export async function toolVisionUploadPython(
  args: VisionAgentEndpointArgs & MutationConfirmArgs & { artifactPath: string },
): Promise<CallToolResult> {
  if (!args.artifactPath?.trim()) {
    return jsonResult(
      { code: "VISION_PIPELINE_ARTIFACT_ERROR", message: "artifactPath is required." },
      true,
    );
  }
  return gatedDeferredVisionMutation(
    args,
    "vision_upload_python",
    "Upload Limelight SnapScript Python to the named endpoint.",
  );
}

export async function toolVisionUploadFieldmap(
  args: VisionAgentEndpointArgs & MutationConfirmArgs & { artifactPath: string },
): Promise<CallToolResult> {
  if (!args.artifactPath?.trim()) {
    return jsonResult(
      { code: "VISION_PIPELINE_ARTIFACT_ERROR", message: "artifactPath is required." },
      true,
    );
  }
  return gatedDeferredVisionMutation(
    args,
    "vision_upload_fieldmap",
    "Upload Limelight field map JSON to the named endpoint.",
  );
}
