import { loadProjectConfig } from "../config/load.js";
import { interpretFromUnknown } from "../errors/interpret.js";
import type { Logger } from "../logger.js";
import { selectDeploymentDevice } from "../devices/selection.js";
import type { DeviceProvider } from "../types/device.js";
import type { FriendlyError } from "../types/errors.js";
import type { DeployResult, ProjectAdapter } from "../types/project.js";
import { buildProject } from "./build.js";
import type { ProcessRunner } from "../types/process.js";

export interface DeployServiceOptions {
  adapter: ProjectAdapter;
  runner: ProcessRunner;
  devices: DeviceProvider;
  logger: Logger;
  cwd: string;
  deviceSerial?: string;
  dryRun?: boolean;
  verbose?: boolean;
  signal?: AbortSignal;
  skipBuild?: boolean;
  apkPath?: string;
}

export interface DeployServiceOutcome {
  result: DeployResult;
  friendlyError?: FriendlyError;
}

export async function deployProject(options: DeployServiceOptions): Promise<DeployServiceOutcome> {
  const started = Date.now();
  const steps: string[] = [];

  try {
    steps.push("Detect and validate FTC project");
    const project = await options.adapter.inspect(options.cwd);
    const configResult = await loadProjectConfig(project.rootDirectory);
    for (const warning of configResult.warnings) {
      options.logger.warn(warning);
    }
    if (configResult.errors.length > 0) {
      throw Object.assign(new Error(configResult.errors.join("; ")), {
        code: "UNSUPPORTED_PROJECT_LAYOUT",
      });
    }

    steps.push("Resolve deployment device");
    const listed = await options.devices.listDevices();
    const preferredConnection = configResult.config.deployment?.preferredConnection ?? "any";
    const selection = selectDeploymentDevice({
      devices: listed,
      explicitSerial: options.deviceSerial,
      preferredSerial: configResult.config.deployment?.preferredDeviceSerial || undefined,
      preferredConnection,
    });
    if (!selection.ok) {
      throw Object.assign(new Error(selection.message), { code: selection.code });
    }
    const device = selection.device;
    steps.push(
      `Selected device ${device.serial} (${selection.reason}; connection=${device.connectionType}; preferredConnection=${preferredConnection})`,
    );

    let apkPath = options.apkPath;
    if (!options.skipBuild) {
      steps.push("Build application with Gradle Wrapper");
      if (options.dryRun) {
        const buildCommand = await options.adapter.getBuildCommand(project);
        steps.push(`DRY RUN: would run ${buildCommand.command} ${buildCommand.args.join(" ")}`);
      } else {
        const buildOutcome = await buildProject({
          adapter: options.adapter,
          runner: options.runner,
          logger: options.logger,
          cwd: options.cwd,
          verbose: options.verbose,
          signal: options.signal,
        });
        if (!buildOutcome.result.success || !buildOutcome.result.apkPath) {
          return {
            result: {
              success: false,
              dryRun: false,
              deviceSerial: device.serial,
              durationMs: Date.now() - started,
              steps,
              message: "Build failed before deployment.",
            },
            friendlyError: buildOutcome.friendlyError,
          };
        }
        apkPath = buildOutcome.result.apkPath;
      }
    }

    if (!apkPath && !options.dryRun) {
      apkPath = await options.adapter.locateApk(project);
    }
    if (options.dryRun && !apkPath) {
      apkPath = "<apk-after-build>";
    }

    steps.push(`Locate APK: ${apkPath}`);
    const applicationId = await options.adapter.resolveApplicationId(project);
    steps.push(`Application ID: ${applicationId}`);

    if (options.dryRun) {
      steps.push(`DRY RUN: would install APK on ${device.serial}`);
      steps.push(`DRY RUN: would launch ${applicationId} on ${device.serial}`);
      return {
        result: {
          success: true,
          dryRun: true,
          deviceSerial: device.serial,
          apkPath,
          applicationId,
          durationMs: Date.now() - started,
          steps,
          message: "Dry run complete. No device changes were made.",
        },
      };
    }

    steps.push(`Install APK on ${device.serial}`);
    await options.devices.installApk(device, apkPath!);
    steps.push(`Launch ${applicationId}`);
    await options.devices.launchApp(device, applicationId);

    return {
      result: {
        success: true,
        dryRun: false,
        deviceSerial: device.serial,
        apkPath,
        applicationId,
        durationMs: Date.now() - started,
        steps,
        message: `Deployed to ${device.serial}.`,
      },
    };
  } catch (error) {
    return {
      result: {
        success: false,
        dryRun: options.dryRun === true,
        durationMs: Date.now() - started,
        steps,
        message: error instanceof Error ? error.message : String(error),
      },
      friendlyError: interpretFromUnknown(error),
    };
  }
}
