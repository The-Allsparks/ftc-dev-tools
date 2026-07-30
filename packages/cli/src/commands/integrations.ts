import type { Command } from "commander";
import { createIntegrationRegistrySnapshot } from "@ftc-dev-tools/shared";

export function registerIntegrationsCommand(program: Command): void {
  const integrations = program
    .command("integrations")
    .description("List known FTC ecosystem integrations and adapter metadata");

  integrations
    .command("list")
    .description("List integrations from the built-in registry")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--shipped", "Only integrations with shipped CLI commands")
    .action((options: { json?: boolean; shipped?: boolean }) => {
      const snapshot = createIntegrationRegistrySnapshot();
      const entries = options.shipped
        ? snapshot.integrations.filter((entry) => entry.cliCommand !== undefined)
        : snapshot.integrations;

      if (options.json) {
        console.log(JSON.stringify({ ...snapshot, integrations: entries }, null, 2));
        return;
      }

      console.log("FTC Dev Tools — known integrations\n");
      for (const entry of entries) {
        const flags = [
          entry.classification,
          entry.experimental ? "experimental" : undefined,
          entry.deprecated ? "deprecated" : undefined,
          entry.cliCommand ? `cli: ftc ${entry.cliCommand}` : undefined,
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
