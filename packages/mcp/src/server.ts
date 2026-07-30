import { PACKAGE_VERSION } from "@ftc-dev-tools/shared";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  toolBuild,
  toolConfigList,
  toolConfigPull,
  toolConfigShow,
  toolConfigValidate,
  toolDeploy,
  toolDevices,
  toolDoctor,
  toolHubStatus,
  toolHubUpdateCheck,
  toolHwMapCodegen,
  toolHwMapShow,
  toolIntegrationsList,
  toolModulesList,
  toolOpModeCreate,
  toolOpModeList,
  toolPedroAdd,
  toolPedroScaffold,
  toolPedroStatus,
  toolProvidersList,
  toolVisionDiscover,
  toolVisionDevices,
  toolVisionLimelightStatus,
  toolVisionLimelightResults,
  toolVisionLimelightPipelinesList,
  toolVisionLimelightPipelinesValidate,
  toolVisionLimelightPipelinesDiff,
  toolVisionStatus,
  toolSdkCheck,
  toolSdkUpdate,
  toolWifiStatus,
} from "./tools.js";

/** Stable list of MCP tool names for docs and tests. */
export const FTC_MCP_TOOL_NAMES = [
  "doctor",
  "devices",
  "build",
  "deploy",
  "sdk_check",
  "sdk_update",
  "wifi_status",
  "hub_status",
  "hub_update_check",
  "pedro_status",
  "pedro_add",
  "pedro_scaffold",
  "opmode_list",
  "opmode_create",
  "config_list",
  "config_show",
  "config_validate",
  "config_pull",
  "hwmap_show",
  "hwmap_codegen",
  "integrations_list",
  "modules_list",
  "providers_list",
  "vision_status",
  "vision_discover",
  "vision_devices",
  "vision_limelight_status",
  "vision_limelight_results",
  "vision_limelight_pipelines_list",
  "vision_limelight_pipelines_validate",
  "vision_limelight_pipelines_diff",
] as const;

export type FtcMcpToolName = (typeof FTC_MCP_TOOL_NAMES)[number];

const projectRootShape = {
  projectRoot: z
    .string()
    .optional()
    .describe("FTC project root (default: FTC_PROJECT_ROOT env or process cwd)"),
};

const confirmShape = {
  dryRun: z.boolean().optional().describe("Preview without writing or mutating devices"),
  confirmPlanId: z
    .string()
    .optional()
    .describe("Plan id from a prior dryRun preview (required to apply)"),
  confirmPlanHash: z
    .string()
    .optional()
    .describe("Plan hash from a prior dryRun preview (required to apply)"),
  yes: z
    .boolean()
    .optional()
    .describe(
      "Not accepted alone for MCP mutations; use dryRun then confirmPlanId/confirmPlanHash",
    ),
};

/**
 * Create the FTC Dev Tools MCP server with tools registered.
 * Connect a transport (typically StdioServerTransport) separately.
 */
export function createFtcMcpServer(): McpServer {
  const server = new McpServer({
    name: "ftc-dev-tools",
    version: PACKAGE_VERSION,
  });

  server.registerTool(
    "doctor",
    {
      title: "Environment doctor",
      description: "Run the FTC environment checklist (Java, adb, project, devices).",
      inputSchema: z.object(projectRootShape),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolDoctor(args),
  );

  server.registerTool(
    "devices",
    {
      title: "List devices",
      description:
        "List connected Android devices via adb (Control Hub labeling is probable only).",
      inputSchema: z.object(projectRootShape),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolDevices(args),
  );

  server.registerTool(
    "build",
    {
      title: "Build project",
      description: "Build the FTC app with the project Gradle Wrapper. Requires yes=true.",
      inputSchema: z.object({
        ...projectRootShape,
        yes: z.boolean().optional().describe("Must be true to run the build"),
        verbose: z.boolean().optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async (args) => toolBuild(args),
  );

  server.registerTool(
    "deploy",
    {
      title: "Deploy to device",
      description:
        "Build and deploy to a connected Android device. Requires yes=true unless dryRun=true. Never silently picks among multiple devices.",
      inputSchema: z.object({
        ...projectRootShape,
        ...confirmShape,
        device: z.string().optional().describe("Target device serial"),
        verbose: z.boolean().optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    },
    async (args) => toolDeploy(args),
  );

  server.registerTool(
    "sdk_check",
    {
      title: "Check FTC SDK",
      description: "Compare local FTC Maven SDK version to GitHub Releases.",
      inputSchema: z.object({
        ...projectRootShape,
        version: z.string().optional().describe("Compare against a specific release tag"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => toolSdkCheck(args),
  );

  server.registerTool(
    "sdk_update",
    {
      title: "Update FTC SDK",
      description:
        "Sync SDK-owned project files from an official FTC release (never TeamCode). Requires yes=true unless dryRun=true.",
      inputSchema: z.object({
        ...projectRootShape,
        ...confirmShape,
        force: z.boolean().optional().describe("Allow when git working tree is dirty"),
        version: z.string().optional().describe("Update to a specific release tag"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    },
    async (args) => toolSdkUpdate(args),
  );

  server.registerTool(
    "wifi_status",
    {
      title: "Wi-Fi status",
      description: "Show wireless adb, console reachability, and robot network interface status.",
      inputSchema: z.object(projectRootShape),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolWifiStatus(args),
  );

  server.registerTool(
    "hub_status",
    {
      title: "Control Hub status",
      description:
        "Show Control Hub identity, OS/RC versions when readable, and console reachability.",
      inputSchema: z.object({
        ...projectRootShape,
        device: z.string().optional(),
        url: z.string().optional().describe("Robot Controller Console base URL"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => toolHubStatus(args),
  );

  server.registerTool(
    "hub_update_check",
    {
      title: "Check Hub OS update",
      description: "Compare hub OS version to the published REV changelog catalog (read-only).",
      inputSchema: z.object({
        ...projectRootShape,
        device: z.string().optional(),
        version: z.string().optional(),
        localVersion: z.string().optional(),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async (args) => toolHubUpdateCheck(args),
  );

  server.registerTool(
    "pedro_status",
    {
      title: "Pedro Pathing status",
      description: "Show Pedro Pathing dependency and package status for the project.",
      inputSchema: z.object(projectRootShape),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolPedroStatus(args),
  );

  server.registerTool(
    "pedro_add",
    {
      title: "Add Pedro Pathing",
      description:
        "Add Pedro Pathing Maven repo + dependencies. Requires yes=true unless dryRun=true.",
      inputSchema: z.object({
        ...projectRootShape,
        ...confirmShape,
        force: z.boolean().optional(),
        version: z.string().optional().describe("Pin com.pedropathing:ftc version"),
        patchCompileSdk: z
          .boolean()
          .optional()
          .describe("Bump compileSdk to 34 when below (default true)"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    },
    async (args) => toolPedroAdd(args),
  );

  server.registerTool(
    "pedro_scaffold",
    {
      title: "Scaffold Pedro Pathing",
      description:
        "Scaffold Quickstart pedroPathing package into TeamCode. Requires yes=true unless dryRun=true.",
      inputSchema: z.object({
        ...projectRootShape,
        ...confirmShape,
        force: z.boolean().optional(),
        tag: z.string().optional().describe("Quickstart release tag"),
      }),
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
    },
    async (args) => toolPedroScaffold(args),
  );

  server.registerTool(
    "opmode_list",
    {
      title: "List OpModes",
      description: "List @TeleOp / @Autonomous classes under TeamCode.",
      inputSchema: z.object(projectRootShape),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolOpModeList(args),
  );

  server.registerTool(
    "opmode_create",
    {
      title: "Create OpMode",
      description:
        "Create a TeleOp or Autonomous OpMode stub. Requires yes=true unless dryRun=true.",
      inputSchema: z.object({
        ...projectRootShape,
        ...confirmShape,
        className: z.string().describe("Java class name (e.g. MyTeleOp)"),
        type: z.enum(["teleop", "autonomous"]),
        style: z.enum(["linear", "iterative"]).optional(),
        group: z.string().optional(),
        name: z.string().optional().describe("Driver Station display name"),
        packageName: z.string().optional(),
        force: z.boolean().optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async (args) => toolOpModeCreate(args),
  );

  server.registerTool(
    "config_list",
    {
      title: "List robot configs",
      description: "List robot config XML under TeamCode/src/main/res/xml.",
      inputSchema: z.object(projectRootShape),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolConfigList(args),
  );

  server.registerTool(
    "config_show",
    {
      title: "Show robot config",
      description: "Show devices/modules from a robot config XML.",
      inputSchema: z.object({
        ...projectRootShape,
        nameOrPath: z.string().describe("Config base name or path under the project"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolConfigShow(args),
  );

  server.registerTool(
    "config_validate",
    {
      title: "Validate robot config",
      description: "Validate a robot config XML (names, duplicates, Robot root).",
      inputSchema: z.object({
        ...projectRootShape,
        nameOrPath: z.string(),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolConfigValidate(args),
  );

  server.registerTool(
    "config_pull",
    {
      title: "Pull robot configs",
      description:
        "adb pull hub /sdcard/FIRST/*.xml into TeamCode res/xml. Requires yes=true unless dryRun=true.",
      inputSchema: z.object({
        ...projectRootShape,
        ...confirmShape,
        device: z.string().optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async (args) => toolConfigPull(args),
  );

  server.registerTool(
    "hwmap_show",
    {
      title: "Show hardware map",
      description: "Show name → type mapping from a robot config XML.",
      inputSchema: z.object({
        ...projectRootShape,
        config: z.string().optional().describe("Config base name (required if multiple configs)"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolHwMapShow(args),
  );

  server.registerTool(
    "hwmap_codegen",
    {
      title: "Generate hardware-map OpMode",
      description:
        "Generate a new OpMode with hardwareMap.get stubs from a robot config. Requires yes=true unless dryRun=true.",
      inputSchema: z.object({
        ...projectRootShape,
        ...confirmShape,
        className: z.string(),
        config: z.string().optional(),
        type: z.enum(["teleop", "autonomous"]).optional(),
        style: z.enum(["linear", "iterative"]).optional(),
        group: z.string().optional(),
        name: z.string().optional(),
        packageName: z.string().optional(),
        force: z.boolean().optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    },
    async (args) => toolHwMapCodegen(args),
  );

  server.registerTool(
    "integrations_list",
    {
      title: "List integrations",
      description:
        "List known FTC ecosystem integrations and adapter metadata from the built-in registry.",
      inputSchema: z.object({
        shipped: z
          .boolean()
          .optional()
          .describe("When true, only integrations with shipped CLI commands"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolIntegrationsList(args),
  );

  server.registerTool(
    "modules_list",
    {
      title: "List modules",
      description: "List capability and workflow module manifests from the built-in registry.",
      inputSchema: z.object({
        layer: z
          .enum(["core", "capability", "workflow", "adapter"])
          .optional()
          .describe("Filter by module layer"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolModulesList(args),
  );

  server.registerTool(
    "providers_list",
    {
      title: "List providers",
      description: "List frame, vision, telemetry, simulation, and replay provider descriptors.",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => toolProvidersList(),
  );

  server.registerTool(
    "vision_status",
    {
      title: "Vision status",
      description: "Show vision configuration and workspace discovery signals for the FTC project.",
      inputSchema: z.object(projectRootShape),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolVisionStatus(args),
  );

  server.registerTool(
    "vision_discover",
    {
      title: "Vision discover",
      description: "Scan TeamCode and Gradle for vision library signals.",
      inputSchema: z.object(projectRootShape),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolVisionDiscover(args),
  );

  server.registerTool(
    "vision_devices",
    {
      title: "Vision devices",
      description:
        "Discover vision endpoints from config, robot XML, and connected devices; probe local-network services when available.",
      inputSchema: z.object(projectRootShape),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolVisionDevices(args),
  );

  server.registerTool(
    "vision_limelight_status",
    {
      title: "Limelight Vision status",
      description: "Read Limelight Vision device status from the HTTP API (port 5807).",
      inputSchema: z.object({
        ...projectRootShape,
        host: z.string().optional().describe("Limelight Vision hostname or IP"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolVisionLimelightStatus(args),
  );

  server.registerTool(
    "vision_limelight_results",
    {
      title: "Limelight Vision results",
      description: "Read normalized Limelight Vision targeting results from the HTTP API.",
      inputSchema: z.object({
        ...projectRootShape,
        host: z.string().optional().describe("Limelight Vision hostname or IP"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolVisionLimelightResults(args),
  );

  server.registerTool(
    "vision_limelight_pipelines_list",
    {
      title: "Limelight pipelines list",
      description: "List Limelight Vision pipeline-as-code artifacts in the workspace.",
      inputSchema: z.object(projectRootShape),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolVisionLimelightPipelinesList(args),
  );

  server.registerTool(
    "vision_limelight_pipelines_validate",
    {
      title: "Limelight pipelines validate",
      description: "Validate Limelight Vision pipeline JSON files and slot assignments.",
      inputSchema: z.object(projectRootShape),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolVisionLimelightPipelinesValidate(args),
  );

  server.registerTool(
    "vision_limelight_pipelines_diff",
    {
      title: "Limelight pipelines diff",
      description: "Compare a workspace pipeline file with the camera pipeline at a slot.",
      inputSchema: z.object({
        ...projectRootShape,
        host: z.string().optional().describe("Limelight Vision hostname or IP"),
        slot: z.number().int().min(0).max(9).describe("Pipeline slot index"),
        path: z.string().optional().describe("Workspace pipeline file path"),
        raw: z.boolean().optional().describe("Include full workspace and camera JSON"),
      }),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async (args) => toolVisionLimelightPipelinesDiff(args),
  );

  return server;
}
