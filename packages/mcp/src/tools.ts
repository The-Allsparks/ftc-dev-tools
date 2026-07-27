import {
  addPedroPathing,
  applySdkUpdate,
  buildProject,
  checkHubUpdate,
  checkSdkStatus,
  codegenHardwareMapOpMode,
  createOpMode,
  deployProject,
  detectPedroStatus,
  getHubStatus,
  getWifiStatus,
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
import { confirmationRequired, jsonResult } from "./result.js";

export interface ProjectRootArgs {
  projectRoot?: string;
}

function ctxFrom(args: ProjectRootArgs, verbose = false) {
  return createMcpContext(args.projectRoot, verbose);
}

function needsYes(args: { yes?: boolean; dryRun?: boolean }): boolean {
  return args.dryRun !== true && args.yes !== true;
}

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
  args: ProjectRootArgs & { yes?: boolean; verbose?: boolean },
): Promise<CallToolResult> {
  if (args.yes !== true) {
    return confirmationRequired("run a Gradle build");
  }
  const ctx = ctxFrom(args, args.verbose === true);
  const outcome = await buildProject({
    adapter: ctx.adapter,
    runner: ctx.runner,
    logger: ctx.logger,
    cwd: ctx.projectRoot,
    verbose: args.verbose === true,
  });
  return jsonResult(
    {
      projectRoot: ctx.projectRoot,
      success: outcome.result.success,
      result: outcome.result,
      error: outcome.friendlyError,
    },
    !outcome.result.success,
  );
}

export async function toolDeploy(
  args: ProjectRootArgs & {
    yes?: boolean;
    dryRun?: boolean;
    device?: string;
    verbose?: boolean;
  },
): Promise<CallToolResult> {
  if (needsYes(args)) {
    return confirmationRequired("deploy to a device");
  }
  const ctx = ctxFrom(args, args.verbose === true);
  try {
    const devices = await ctx.createDeviceProvider();
    const outcome = await deployProject({
      adapter: ctx.adapter,
      runner: ctx.runner,
      devices,
      logger: ctx.logger,
      cwd: ctx.projectRoot,
      deviceSerial: args.device,
      dryRun: args.dryRun === true,
      verbose: args.verbose === true,
    });
    return jsonResult(
      {
        projectRoot: ctx.projectRoot,
        success: outcome.result.success,
        result: outcome.result,
        error: outcome.friendlyError,
      },
      !outcome.result.success,
    );
  } catch (error) {
    return jsonResult(
      { projectRoot: ctx.projectRoot, success: false, error: interpretFromUnknown(error) },
      true,
    );
  }
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
  args: ProjectRootArgs & {
    yes?: boolean;
    dryRun?: boolean;
    force?: boolean;
    version?: string;
  },
): Promise<CallToolResult> {
  if (needsYes(args)) {
    return confirmationRequired("update FTC SDK-owned project files");
  }
  const ctx = ctxFrom(args);
  const result = await applySdkUpdate({
    projectRoot: ctx.projectRoot,
    runner: ctx.runner,
    dryRun: args.dryRun === true,
    yes: args.yes === true || args.dryRun === true,
    force: args.force === true,
    targetTag: args.version,
  });
  return jsonResult({ ...result, projectRoot: ctx.projectRoot }, !result.success);
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
  args: ProjectRootArgs & {
    yes?: boolean;
    dryRun?: boolean;
    force?: boolean;
    version?: string;
    patchCompileSdk?: boolean;
  },
): Promise<CallToolResult> {
  if (needsYes(args)) {
    return confirmationRequired("add Pedro Pathing dependencies");
  }
  const ctx = ctxFrom(args);
  const result = await addPedroPathing({
    projectRoot: ctx.projectRoot,
    runner: ctx.runner,
    version: args.version,
    dryRun: args.dryRun === true,
    yes: args.yes === true || args.dryRun === true,
    force: args.force === true,
    patchCompileSdk: args.patchCompileSdk !== false,
  });
  return jsonResult({ ...result, projectRoot: ctx.projectRoot }, !result.success);
}

export async function toolPedroScaffold(
  args: ProjectRootArgs & {
    yes?: boolean;
    dryRun?: boolean;
    force?: boolean;
    tag?: string;
  },
): Promise<CallToolResult> {
  if (needsYes(args)) {
    return confirmationRequired("scaffold Pedro Pathing into TeamCode");
  }
  const ctx = ctxFrom(args);
  const result = await scaffoldPedroPathing({
    projectRoot: ctx.projectRoot,
    runner: ctx.runner,
    tag: args.tag,
    dryRun: args.dryRun === true,
    yes: args.yes === true || args.dryRun === true,
    force: args.force === true,
  });
  return jsonResult({ ...result, projectRoot: ctx.projectRoot }, !result.success);
}

export async function toolOpModeList(args: ProjectRootArgs): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  const report = await listOpModes(ctx.projectRoot);
  return jsonResult({ ...report, projectRoot: ctx.projectRoot }, Boolean(report.error));
}

export async function toolOpModeCreate(
  args: ProjectRootArgs & {
    className: string;
    type: "teleop" | "autonomous";
    style?: "linear" | "iterative";
    group?: string;
    name?: string;
    packageName?: string;
    yes?: boolean;
    dryRun?: boolean;
    force?: boolean;
  },
): Promise<CallToolResult> {
  if (needsYes(args)) {
    return confirmationRequired("create an OpMode");
  }
  const ctx = ctxFrom(args);
  const result = await createOpMode({
    projectRoot: ctx.projectRoot,
    runner: ctx.runner,
    className: args.className,
    kind: args.type,
    style: args.style ?? "linear",
    group: args.group,
    name: args.name,
    packageName: args.packageName,
    dryRun: args.dryRun === true,
    yes: args.yes === true || args.dryRun === true,
    force: args.force === true,
  });
  return jsonResult({ ...result, projectRoot: ctx.projectRoot }, !result.success);
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
  args: ProjectRootArgs & {
    yes?: boolean;
    dryRun?: boolean;
    device?: string;
  },
): Promise<CallToolResult> {
  if (needsYes(args)) {
    return confirmationRequired("pull robot configs from the hub");
  }
  const ctx = ctxFrom(args);
  try {
    const deviceProvider = await ctx.createDeviceProvider();
    const result = await pullRobotConfigs({
      projectRoot: ctx.projectRoot,
      runner: ctx.runner,
      deviceProvider,
      deviceSerial: args.device,
      dryRun: args.dryRun === true,
      yes: args.yes === true || args.dryRun === true,
    });
    return jsonResult({ ...result, projectRoot: ctx.projectRoot }, !result.success);
  } catch (error) {
    return jsonResult(
      { projectRoot: ctx.projectRoot, success: false, error: interpretFromUnknown(error) },
      true,
    );
  }
}

export async function toolHwMapShow(
  args: ProjectRootArgs & { config?: string },
): Promise<CallToolResult> {
  const ctx = ctxFrom(args);
  const report = await showHardwareMap(ctx.projectRoot, args.config);
  return jsonResult({ ...report, projectRoot: ctx.projectRoot }, !report.success);
}

export async function toolHwMapCodegen(
  args: ProjectRootArgs & {
    className: string;
    config?: string;
    type?: "teleop" | "autonomous";
    style?: "linear" | "iterative";
    group?: string;
    name?: string;
    packageName?: string;
    yes?: boolean;
    dryRun?: boolean;
    force?: boolean;
  },
): Promise<CallToolResult> {
  if (needsYes(args)) {
    return confirmationRequired("generate a hardware-map OpMode");
  }
  const ctx = ctxFrom(args);
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
    dryRun: args.dryRun === true,
    yes: args.yes === true || args.dryRun === true,
    force: args.force === true,
  });
  return jsonResult({ ...result, projectRoot: ctx.projectRoot }, !result.success);
}
