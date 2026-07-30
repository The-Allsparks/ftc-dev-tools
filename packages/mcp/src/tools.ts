import {
  addPedroPathing,
  applySdkUpdate,
  buildProject,
  checkHubUpdate,
  checkSdkStatus,
  codegenHardwareMapOpMode,
  createIntegrationRegistrySnapshot,
  createModuleRegistrySnapshot,
  createOpMode,
  createProviderRegistrySnapshot,
  deployProject,
  detectPedroStatus,
  getHubStatus,
  getWifiStatus,
  getVisionStatus,
  discoverVisionWorkspace,
  discoverVisionDevices,
  interpretFromUnknown,
  listOpModes,
  listRobotConfigs,
  pullRobotConfigs,
  scaffoldPedroPathing,
  showHardwareMap,
  showRobotConfig,
  runDoctor,
  validateRobotConfig,
} from "@ftc-dev-tools/shared";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { createMcpContext, tryCreateDeviceProvider } from "./context.js";
import { runGatedMutation } from "./mutation-gate.js";
import { jsonResult } from "./result.js";
import { maybeReportMcpToolError } from "./error-report.js";

export interface ProjectRootArgs {
  projectRoot?: string;
}

function ctxFrom(args: ProjectRootArgs, verbose = false) {
  return createMcpContext(args.projectRoot, verbose);
}

type ConfirmArgs = {
  yes?: boolean;
  dryRun?: boolean;
  confirmPlanId?: string;
  confirmPlanHash?: string;
};

export async function toolDoctor(args: ProjectRootArgs): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  const deviceProvider = await tryCreateDeviceProvider(ctx);
  const report = await runDoctor({
    cwd: ctx.projectRoot,
    runner: ctx.runner,
    projectAdapter: ctx.adapter,
    deviceProvider,
  });
  return jsonResult({ ...report, projectRoot: ctx.projectRoot }, !report.ready);
}

export async function toolDevices(args: ProjectRootArgs): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  try {
    const provider = await ctx.createDeviceProvider();
    const devices = await provider.listDevices();
    return jsonResult({ projectRoot: ctx.projectRoot, devices });
  } catch (error) {
    return jsonResult({ projectRoot: ctx.projectRoot, error: interpretFromUnknown(error) }, true);
  }
}

export async function toolBuild(
  args: ProjectRootArgs & ConfirmArgs & { verbose?: boolean },
): Promise<CallToolResult> {
  const ctx = ctxFrom(args, args.verbose === true);
  const payload = { verbose: args.verbose === true };
  return runGatedMutation(
    args,
    "build",
    ctx.projectRoot,
    payload,
    "Run a Gradle build.",
    async (dryRun) => {
      if (dryRun) {
        return {
          success: true,
          dryRun: true,
          message: "Dry run: would run Gradle build for this project.",
        };
      }
      const outcome = await buildProject({
        adapter: ctx.adapter,
        runner: ctx.runner,
        logger: ctx.logger,
        cwd: ctx.projectRoot,
        verbose: args.verbose === true,
      });
      if (!outcome.result.success && outcome.friendlyError) {
        const errorReport = await maybeReportMcpToolError({
          toolName: "build",
          error: outcome.friendlyError,
        });
        return {
          success: outcome.result.success,
          dryRun: false,
          result: outcome.result,
          error: outcome.friendlyError,
          errorReport,
        };
      }
      return {
        success: outcome.result.success,
        dryRun: false,
        result: outcome.result,
        error: outcome.friendlyError,
      };
    },
  );
}

export async function toolDeploy(
  args: ProjectRootArgs &
    ConfirmArgs & {
      device?: string;
      verbose?: boolean;
    },
): Promise<CallToolResult> {
  const ctx = ctxFrom(args, args.verbose === true);
  const payload = {
    device: args.device,
    verbose: args.verbose === true,
  };
  return runGatedMutation(
    args,
    "deploy",
    ctx.projectRoot,
    payload,
    "Deploy to a connected Android device.",
    async (dryRun) => {
      try {
        const devices = await ctx.createDeviceProvider();
        const outcome = await deployProject({
          adapter: ctx.adapter,
          runner: ctx.runner,
          devices,
          logger: ctx.logger,
          cwd: ctx.projectRoot,
          deviceSerial: args.device,
          dryRun,
          verbose: args.verbose === true,
        });
        if (!outcome.result.success && outcome.friendlyError) {
          const errorReport = await maybeReportMcpToolError({
            toolName: "deploy",
            error: outcome.friendlyError,
            deploySteps: outcome.result.steps,
          });
          return {
            success: outcome.result.success,
            dryRun,
            result: outcome.result,
            error: outcome.friendlyError,
            errorReport,
          };
        }
        return {
          success: outcome.result.success,
          dryRun,
          result: outcome.result,
          error: outcome.friendlyError,
        };
      } catch (error) {
        return {
          success: false,
          dryRun,
          error: interpretFromUnknown(error),
        };
      }
    },
  );
}

export async function toolSdkCheck(
  args: ProjectRootArgs & { version?: string },
): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  const report = await checkSdkStatus({
    projectRoot: ctx.projectRoot,
    targetTag: args.version,
  });
  const failed =
    Boolean(report.error && !report.local.version) ||
    (report.freshness === "unknown" && report.error?.code === "SDK_UPDATE_NETWORK");
  return jsonResult({ ...report, projectRoot: ctx.projectRoot }, failed);
}

export async function toolSdkUpdate(
  args: ProjectRootArgs &
    ConfirmArgs & {
      force?: boolean;
      version?: string;
    },
): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  const payload = { force: args.force === true, version: args.version };
  return runGatedMutation(
    args,
    "sdk_update",
    ctx.projectRoot,
    payload,
    "Sync SDK-owned project files from an official FTC release.",
    async (dryRun) => {
      const result = await applySdkUpdate({
        projectRoot: ctx.projectRoot,
        runner: ctx.runner,
        dryRun,
        yes: true,
        force: args.force === true,
        targetTag: args.version,
      });
      return { ...result };
    },
  );
}

export async function toolWifiStatus(args: ProjectRootArgs): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  const deviceProvider = await tryCreateDeviceProvider(ctx);
  const report = await getWifiStatus({
    runner: ctx.runner,
    deviceProvider,
  });
  return jsonResult({ ...report, projectRoot: ctx.projectRoot });
}

export async function toolHubStatus(
  args: ProjectRootArgs & { device?: string; url?: string },
): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  const deviceProvider = await tryCreateDeviceProvider(ctx);
  const report = await getHubStatus({
    runner: ctx.runner,
    deviceProvider,
    deviceSerial: args.device,
    consoleUrl: args.url,
  });
  return jsonResult({ ...report, projectRoot: ctx.projectRoot }, Boolean(report.error));
}

export async function toolHubUpdateCheck(
  args: ProjectRootArgs & {
    device?: string;
    version?: string;
    localVersion?: string;
  },
): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  const deviceProvider = await tryCreateDeviceProvider(ctx);
  const report = await checkHubUpdate({
    runner: ctx.runner,
    deviceProvider,
    deviceSerial: args.device,
    version: args.version,
    localOsVersion: args.localVersion,
  });
  return jsonResult({ ...report, projectRoot: ctx.projectRoot }, Boolean(report.error));
}

export async function toolPedroStatus(args: ProjectRootArgs): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  const report = await detectPedroStatus(ctx.projectRoot);
  return jsonResult({ ...report, projectRoot: ctx.projectRoot }, Boolean(report.error));
}

export async function toolPedroAdd(
  args: ProjectRootArgs &
    ConfirmArgs & {
      force?: boolean;
      version?: string;
      patchCompileSdk?: boolean;
    },
): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  const payload = {
    force: args.force === true,
    version: args.version,
    patchCompileSdk: args.patchCompileSdk !== false,
  };
  return runGatedMutation(
    args,
    "pedro_add",
    ctx.projectRoot,
    payload,
    "Add Pedro Pathing Maven repo and dependencies.",
    async (dryRun) => {
      const result = await addPedroPathing({
        projectRoot: ctx.projectRoot,
        runner: ctx.runner,
        version: args.version,
        dryRun,
        yes: true,
        force: args.force === true,
        patchCompileSdk: args.patchCompileSdk !== false,
      });
      return { ...result };
    },
  );
}

export async function toolPedroScaffold(
  args: ProjectRootArgs &
    ConfirmArgs & {
      force?: boolean;
      tag?: string;
    },
): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  const payload = { force: args.force === true, tag: args.tag };
  return runGatedMutation(
    args,
    "pedro_scaffold",
    ctx.projectRoot,
    payload,
    "Scaffold Pedro Pathing into TeamCode.",
    async (dryRun) => {
      const result = await scaffoldPedroPathing({
        projectRoot: ctx.projectRoot,
        runner: ctx.runner,
        tag: args.tag,
        dryRun,
        yes: true,
        force: args.force === true,
      });
      return { ...result };
    },
  );
}

export async function toolOpModeList(args: ProjectRootArgs): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  const report = await listOpModes(ctx.projectRoot);
  return jsonResult({ ...report, projectRoot: ctx.projectRoot }, Boolean(report.error));
}

export async function toolOpModeCreate(
  args: ProjectRootArgs &
    ConfirmArgs & {
      className: string;
      type: "teleop" | "autonomous";
      style?: "linear" | "iterative";
      group?: string;
      name?: string;
      packageName?: string;
      force?: boolean;
    },
): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  const payload = {
    className: args.className,
    type: args.type,
    style: args.style ?? "linear",
    group: args.group,
    name: args.name,
    packageName: args.packageName,
    force: args.force === true,
  };
  return runGatedMutation(
    args,
    "opmode_create",
    ctx.projectRoot,
    payload,
    "Create an OpMode stub in TeamCode.",
    async (dryRun) => {
      const result = await createOpMode({
        projectRoot: ctx.projectRoot,
        runner: ctx.runner,
        className: args.className,
        kind: args.type,
        style: args.style ?? "linear",
        group: args.group,
        name: args.name,
        packageName: args.packageName,
        dryRun,
        yes: true,
        force: args.force === true,
      });
      return { ...result };
    },
  );
}

export async function toolConfigList(args: ProjectRootArgs): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  const report = await listRobotConfigs(ctx.projectRoot);
  return jsonResult({ ...report, projectRoot: ctx.projectRoot }, Boolean(report.error));
}

export async function toolConfigShow(
  args: ProjectRootArgs & { nameOrPath: string },
): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  const result = await showRobotConfig(ctx.projectRoot, args.nameOrPath);
  return jsonResult({ ...result, projectRoot: ctx.projectRoot }, !result.success);
}

export async function toolConfigValidate(
  args: ProjectRootArgs & { nameOrPath: string },
): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  const result = await validateRobotConfig(ctx.projectRoot, args.nameOrPath);
  return jsonResult({ ...result, projectRoot: ctx.projectRoot }, !result.success);
}

export async function toolConfigPull(
  args: ProjectRootArgs &
    ConfirmArgs & {
      device?: string;
    },
): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  const payload = { device: args.device };
  return runGatedMutation(
    args,
    "config_pull",
    ctx.projectRoot,
    payload,
    "Pull robot configs from the Control Hub.",
    async (dryRun) => {
      try {
        const deviceProvider = await ctx.createDeviceProvider();
        const result = await pullRobotConfigs({
          projectRoot: ctx.projectRoot,
          runner: ctx.runner,
          deviceProvider,
          deviceSerial: args.device,
          dryRun,
          yes: true,
        });
        return { ...result };
      } catch (error) {
        return { success: false, dryRun, error: interpretFromUnknown(error) };
      }
    },
  );
}

export async function toolHwMapShow(
  args: ProjectRootArgs & { config?: string },
): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  const report = await showHardwareMap(ctx.projectRoot, args.config);
  return jsonResult({ ...report, projectRoot: ctx.projectRoot }, !report.success);
}

export async function toolHwMapCodegen(
  args: ProjectRootArgs &
    ConfirmArgs & {
      className: string;
      config?: string;
      type?: "teleop" | "autonomous";
      style?: "linear" | "iterative";
      group?: string;
      name?: string;
      packageName?: string;
      force?: boolean;
    },
): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  const payload = {
    className: args.className,
    config: args.config,
    type: args.type ?? "teleop",
    style: args.style ?? "linear",
    group: args.group,
    name: args.name,
    packageName: args.packageName,
    force: args.force === true,
  };
  return runGatedMutation(
    args,
    "hwmap_codegen",
    ctx.projectRoot,
    payload,
    "Generate a hardware-map OpMode from a robot config.",
    async (dryRun) => {
      const result = await codegenHardwareMapOpMode({
        projectRoot: ctx.projectRoot,
        runner: ctx.runner,
        configName: args.config,
        className: args.className,
        kind: args.type ?? "teleop",
        style: args.style ?? "linear",
        group: args.group,
        name: args.name,
        packageName: args.packageName,
        dryRun,
        yes: true,
        force: args.force === true,
      });
      return { ...result };
    },
  );
}

export async function toolIntegrationsList(args: { shipped?: boolean }): Promise<CallToolResult> {
  try {
    const snapshot = createIntegrationRegistrySnapshot();
    const integrations = args.shipped
      ? snapshot.integrations.filter((entry) => entry.cliCommand !== undefined)
      : snapshot.integrations;
    return jsonResult({ ...snapshot, integrations });
  } catch (err) {
    return jsonResult({
      error: interpretFromUnknown(err).summary,
    });
  }
}

export async function toolModulesList(args: { layer?: string }): Promise<CallToolResult> {
  try {
    const snapshot = createModuleRegistrySnapshot();
    const validLayers = new Set(["core", "capability", "workflow", "adapter"]);
    const modules =
      args.layer && validLayers.has(args.layer)
        ? snapshot.modules.filter((entry) => entry.layer === args.layer)
        : snapshot.modules;
    return jsonResult({ ...snapshot, modules });
  } catch (err) {
    return jsonResult({
      error: interpretFromUnknown(err).summary,
    });
  }
}

export async function toolProvidersList(): Promise<CallToolResult> {
  try {
    return jsonResult(createProviderRegistrySnapshot());
  } catch (err) {
    return jsonResult({
      error: interpretFromUnknown(err).summary,
    });
  }
}

export async function toolVisionStatus(args: ProjectRootArgs): Promise<CallToolResult> {
  try {
    const ctx = ctxFrom(args);
    return jsonResult(await getVisionStatus(ctx.projectRoot));
  } catch (err) {
    return jsonResult({
      error: interpretFromUnknown(err).summary,
    });
  }
}

export async function toolVisionDiscover(args: ProjectRootArgs): Promise<CallToolResult> {
  try {
    const ctx = ctxFrom(args);
    return jsonResult(await discoverVisionWorkspace(ctx.projectRoot));
  } catch (err) {
    return jsonResult({
      error: interpretFromUnknown(err).summary,
    });
  }
}

export async function toolVisionDevices(args: ProjectRootArgs): Promise<CallToolResult> {
  try {
    const ctx = ctxFrom(args);
    const deviceProvider = await tryCreateDeviceProvider(ctx);
    return jsonResult(
      await discoverVisionDevices(ctx.projectRoot, {
        deviceProvider,
        runner: ctx.runner,
      }),
    );
  } catch (err) {
    return jsonResult({
      error: interpretFromUnknown(err).summary,
    });
  }
}
