import type { Command } from "commander";
import { createProviderRegistrySnapshot } from "@ftc-dev-tools/shared";

export function registerProvidersCommand(program: Command): void {
  const providers = program
    .command("providers")
    .description("List provider registries for vision, telemetry, simulation, and replay");

  providers
    .command("list")
    .description("List registered provider descriptors")
    .option("--json", "Emit stable machine-readable JSON")
    .action((options: { json?: boolean }) => {
      const snapshot = createProviderRegistrySnapshot();
      if (options.json) {
        console.log(JSON.stringify(snapshot, null, 2));
        return;
      }

      console.log("FTC Dev Tools — providers\n");
      console.log(`Frame providers (${snapshot.frameProviders.length})`);
      for (const entry of snapshot.frameProviders) {
        console.log(`  ${entry.id}: ${entry.displayName} [${entry.source}]`);
      }
      console.log(`\nVision providers (${snapshot.visionProviders.length})`);
      for (const entry of snapshot.visionProviders) {
        console.log(`  ${entry.id} → ${entry.frameProviderId}`);
      }
      console.log(`\nTelemetry providers (${snapshot.telemetryProviders.length})`);
      for (const entry of snapshot.telemetryProviders) {
        console.log(`  ${entry.id}: ${entry.displayName}`);
      }
      console.log(`\nSimulation runtimes (${snapshot.simulationRuntimes.length})`);
      for (const entry of snapshot.simulationRuntimes) {
        console.log(`  ${entry.id}: ${entry.displayName}`);
      }
      console.log(`\nReplay backends (${snapshot.replayBackends.length})`);
      for (const entry of snapshot.replayBackends) {
        console.log(`  ${entry.id}: ${entry.displayName}`);
      }
    });
}
