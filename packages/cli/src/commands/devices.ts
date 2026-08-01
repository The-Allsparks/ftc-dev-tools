import type { Command } from "commander";
import { interpretFromUnknown } from "@ftc-dev-tools/shared";
import { createCliContext, printFriendlyError } from "../context.js";

export function registerDevicesCommand(program: Command): void {
  program
    .command("devices")
    .description("List connected robot devices")
    .option("--json", "Emit JSON")
    .action(async (options: { json?: boolean }) => {
      const ctx = createCliContext();
      try {
        const provider = await ctx.createDeviceProvider();
        const devices = await provider.listDevices();
        if (options.json) {
          console.log(JSON.stringify(devices, null, 2));
          return;
        }
        if (devices.length === 0) {
          console.log("No robot devices found.");
          process.exitCode = 1;
          return;
        }
        for (const device of devices) {
          const hubLabel =
            device.controlHubLikelihood === "probable"
              ? "probable Control Hub"
              : device.controlHubLikelihood === "unlikely"
                ? "likely not a Control Hub"
                : "Control Hub unknown";
          console.log(
            [
              device.serial,
              `state=${device.state}`,
              `auth=${device.authorization}`,
              `connection=${device.connectionType}`,
              device.model ? `model=${device.model}` : undefined,
              device.manufacturer ? `manufacturer=${device.manufacturer}` : undefined,
              hubLabel,
            ]
              .filter(Boolean)
              .join("  "),
          );
        }
        console.log(
          "\nNote: Control Hub identification is detected/probable only, never guaranteed.",
        );
      } catch (error) {
        await printFriendlyError(interpretFromUnknown(error), true);
        process.exitCode = 1;
      }
    });
}
