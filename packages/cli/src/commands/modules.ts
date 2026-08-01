import type { Command } from "commander";
import { createModuleRegistrySnapshot, isModuleLayer } from "@ftc-dev-tools/shared";

export function registerModulesCommand(program: Command): void {
  const modules = program
    .command("modules")
    .description("List FTC Dev Tools capability and workflow modules");

  modules
    .command("list")
    .description("List modules from the built-in module registry")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--layer <layer>", "Filter by layer: core, capability, workflow, adapter")
    .action((options: { json?: boolean; layer?: string }) => {
      const snapshot = createModuleRegistrySnapshot();
      const entries =
        options.layer && isModuleLayer(options.layer)
          ? snapshot.modules.filter((entry) => entry.layer === options.layer)
          : snapshot.modules;

      if (options.json) {
        console.log(JSON.stringify({ ...snapshot, modules: entries }, null, 2));
        return;
      }

      console.log("FTC Dev Tools — modules\n");
      for (const entry of entries) {
        const flags = [
          entry.layer,
          entry.experimental ? "experimental" : undefined,
          entry.deprecated ? "deprecated" : undefined,
          entry.epicIssue ? `epic #${entry.epicIssue}` : undefined,
        ]
          .filter(Boolean)
          .join(", ");
        console.log(`${entry.displayName} (${entry.id})`);
        console.log(`  ${entry.summary}`);
        console.log(`  ${flags}\n`);
      }
    });
}
