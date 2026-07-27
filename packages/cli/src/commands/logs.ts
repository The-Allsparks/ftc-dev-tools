import type { Command } from "commander";
import {
  formatLogEntry,
  interpretFromUnknown,
  loadProjectConfig,
  selectDeploymentDevice,
} from "@ftc-dev-tools/shared";
import { createCliContext, printFriendlyError } from "../context.js";

export function registerLogsCommand(program: Command): void {
  program
    .command("logs")
    .description("Stream Logcat from a connected Android device")
    .option("--device <serial>", "Target device serial")
    .option("--errors", "Show error-level logs only")
    .option("--teamcode", "Show likely TeamCode-related logs")
    .option("--raw", "Show raw log lines")
    .action(
      async (options: { device?: string; errors?: boolean; teamcode?: boolean; raw?: boolean }) => {
        const ctx = createCliContext();
        try {
          const provider = await ctx.createDeviceProvider();
          const devices = await provider.listDevices();
          const config = await loadProjectConfig(ctx.cwd);
          const selection = selectDeploymentDevice({
            devices,
            explicitSerial: options.device,
            preferredSerial: config.config.deployment?.preferredDeviceSerial || undefined,
            preferredConnection: config.config.deployment?.preferredConnection ?? "any",
          });
          if (!selection.ok) {
            throw Object.assign(new Error(selection.message), { code: selection.code });
          }

          let filter: "all" | "teamcode" | "errors" | "raw" =
            config.config.logs?.defaultFilter ?? "teamcode";
          if (options.raw) {
            filter = "raw";
          } else if (options.errors) {
            filter = "errors";
          } else if (options.teamcode) {
            filter = "teamcode";
          }

          console.error(
            `Streaming logs from ${selection.device.serial} (filter=${filter}). Press Ctrl+C to stop.`,
          );
          const controller = new AbortController();
          const onSigInt = (): void => {
            controller.abort();
            console.error("\nLog streaming stopped.");
            process.exit(0);
          };
          process.on("SIGINT", onSigInt);

          try {
            for await (const entry of provider.streamLogs(selection.device, {
              filter,
              signal: controller.signal,
            })) {
              if (controller.signal.aborted) {
                break;
              }
              console.log(formatLogEntry(entry, filter === "raw"));
            }
          } catch (error) {
            console.error("Device connection lost while streaming logs.");
            console.error("Reconnect the device, then run `ftc devices` and `ftc logs` again.");
            printFriendlyError(interpretFromUnknown(error), true);
            process.exitCode = 1;
          } finally {
            process.off("SIGINT", onSigInt);
          }
        } catch (error) {
          printFriendlyError(interpretFromUnknown(error), true);
          process.exitCode = 1;
        }
      },
    );
}
