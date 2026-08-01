import {
  VISION_CLI_EXIT,
  wrapVisionCliJson,
  tryCreateOptionalDeviceProvider,
  type DeviceProvider,
  type VisionCliDeferredResult,
} from "@ftc-dev-tools/shared";
import type { Command } from "commander";

/** Attach shared vision CLI flags documented in VISION-15. */
export function attachVisionCommonOptions(command: Command): Command {
  return command
    .option(
      "--provider <id>",
      "Vision provider id (vision:limelight, telemetry:ftc-dashboard, auto)",
    )
    .option("--endpoint <id>", "Explicit endpoint id from `ftc vision devices --json`")
    .option("--host <address>", "Hostname or IP for Limelight or robot dashboard")
    .option("--url <address>", "Full dashboard URL")
    .option("--device <serial>", "Connected adb device serial (never auto-selected)")
    .option("--timeout <ms>", "Network probe timeout in milliseconds", (value) =>
      Number.parseInt(value, 10),
    )
    .option("--redact", "Redact serial numbers and IP addresses in JSON output");
}

export interface VisionOutputOptions {
  json?: boolean;
  redact?: boolean;
}

export function emitVisionJson<T>(command: string, data: T, options: VisionOutputOptions): void {
  console.log(
    JSON.stringify(wrapVisionCliJson(command, data, { redact: options.redact }), null, 2),
  );
}

export function emitDeferredVisionCommand(
  result: VisionCliDeferredResult,
  options: VisionOutputOptions,
): void {
  if (options.json) {
    emitVisionJson(result.command, result, options);
  } else {
    console.log(`${result.command} (deferred)\n`);
    console.log(result.message);
    if (result.followUp?.length) {
      for (const line of result.followUp) {
        console.log(line);
      }
    }
  }
  process.exitCode = result.exitCode ?? VISION_CLI_EXIT.DEFERRED;
}

export async function tryCreateVisionDeviceProvider(
  createDeviceProvider: () => Promise<DeviceProvider | undefined>,
): Promise<DeviceProvider | undefined> {
  return tryCreateOptionalDeviceProvider(createDeviceProvider);
}
