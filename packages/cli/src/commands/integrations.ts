import type { Command } from "commander";
import {
  createIntegrationRegistrySnapshot,
  listIntegrationRegistryEntries,
} from "@ftc-dev-tools/shared";

export function registerIntegrationsCommand(program: Command): void {
  const integrations = program
    .command("integrations")
    .description("List known FTC ecosystem integrations and adapter metadata");

  integrations
    .command("list")
    .description("List integrations from the built-in registry")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--shipped", "Only integrations with shipped CLI commands")
    .option("--with-adapters", "Include adapter operation readiness")
    .action((options: { json?: boolean; shipped?: boolean; withAdapters?: boolean }) => {
      if (options.withAdapters && options.json) {
        const entries = options.shipped
          ? listIntegrationRegistryEntries().filter(
              (entry) => entry.manifest.cliCommand !== undefined,
            )
          : listIntegrationRegistryEntries();
        console.log(
          JSON.stringify(
            {
              schemaVersion: createIntegrationRegistrySnapshot().schemaVersion,
              generatedAt: new Date().toISOString(),
              entries,
            },
            null,
            2,
          ),
        );
        return;
      }

      const snapshot = createIntegrationRegistrySnapshot();
      const manifestEntries = options.shipped
        ? snapshot.integrations.filter((entry) => entry.cliCommand !== undefined)
        : snapshot.integrations;

      if (options.json) {
        console.log(JSON.stringify({ ...snapshot, integrations: manifestEntries }, null, 2));
        return;
      }

      console.log("FTC Dev Tools — known integrations\n");
      for (const entry of manifestEntries) {
        const adapter = snapshot.adapters.find((candidate) => candidate.manifestId === entry.id);
        const adapterOps = adapter
          ? adapter.operations
              .filter((op) => op.supported)
              .map((op) => op.operation)
              .join(", ")
          : undefined;
        const flags = [
          entry.classification,
          entry.experimental ? "experimental" : undefined,
          entry.deprecated ? "deprecated" : undefined,
          entry.cliCommand ? `cli: ftc ${entry.cliCommand}` : undefined,
          adapterOps ? `adapter: ${adapterOps}` : adapter ? "adapter: metadata only" : undefined,
        ]
          .filter(Boolean)
          .join(", ");
        console.log(`${entry.displayName} (${entry.id})`);
        console.log(`  ${entry.summary}`);
        console.log(`  ${flags}`);
        console.log(`  ${entry.documentationUrl}\n`);
      }
    });
}
