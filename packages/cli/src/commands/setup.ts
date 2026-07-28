import type { Command } from "commander";
import { listSetupBackups, restoreSetupBackup } from "@ftc-dev-tools/shared";
import { createCliContext } from "../context.js";

export function registerSetupCommand(program: Command): void {
  const setup = program.command("setup").description("FTC project workspace setup helpers");

  setup
    .command("backups")
    .description("List .vscode / setup file backups under .ftc-dev-tools/backups/setup/")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (options: { json?: boolean }) => {
      const ctx = createCliContext(process.cwd(), false);
      const backups = await listSetupBackups(ctx.cwd);
      if (options.json) {
        console.log(JSON.stringify({ backups }, null, 2));
        return;
      }
      if (backups.length === 0) {
        console.log("No setup backups found.");
        return;
      }
      console.log("Setup backups:\n");
      for (const backup of backups) {
        console.log(`  ${backup.id}  (${backup.createdAt}) — ${backup.files.join(", ")}`);
      }
    });

  setup
    .command("restore")
    .description("Restore workspace setup files from a backup")
    .argument("<backup-id>", "Backup folder id (see ftc setup backups)")
    .option("--yes", "Apply restore without an interactive confirmation prompt")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (backupId: string, options: { yes?: boolean; json?: boolean }) => {
      const ctx = createCliContext(process.cwd(), false);
      if (!options.yes && process.stdin.isTTY) {
        process.stdout.write(`Restore setup backup ${backupId}? [y/N] `);
        const ok = await new Promise<boolean>((resolve) => {
          const onData = (chunk: Buffer): void => {
            process.stdin.off("data", onData);
            process.stdin.pause();
            const answer = chunk.toString("utf8").trim().toLowerCase();
            resolve(answer === "y" || answer === "yes");
          };
          process.stdin.resume();
          process.stdin.once("data", onData);
        });
        if (!ok) {
          process.exitCode = 1;
          console.log("Cancelled.");
          return;
        }
      } else if (!options.yes) {
        console.error("Refusing restore without --yes in non-interactive mode.");
        process.exitCode = 1;
        return;
      }

      const result = await restoreSetupBackup(ctx.cwd, backupId);
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(result.message);
        for (const p of result.restoredPaths) {
          console.log(`  ${p}`);
        }
      }
      process.exitCode = result.success ? 0 : 1;
    });
}
