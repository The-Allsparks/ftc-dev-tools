import type { Command } from "commander";
import { discoverVisionWorkspace, getVisionStatus } from "@ftc-dev-tools/shared";

export function registerVisionCommand(program: Command): void {
  const vision = program
    .command("vision")
    .description("Vision Lab configuration and workspace discovery");

  vision
    .command("status")
    .description("Show vision config and detected workspace signals")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (options: { json?: boolean }) => {
      const report = await getVisionStatus(process.cwd());
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      console.log("Vision Lab Status\n");
      console.log(report.message);
      if (report.config.defaultProviderId) {
        console.log(`Configured default provider: ${report.config.defaultProviderId}`);
      }
      if (report.config.enabledProviderIds?.length) {
        console.log(`Enabled providers: ${report.config.enabledProviderIds.join(", ")}`);
      }
      if (report.discovery.suggestedDefaultProviderId) {
        console.log(`Suggested default provider: ${report.discovery.suggestedDefaultProviderId}`);
      }
      for (const signal of report.discovery.signals) {
        console.log(
          `  [${signal.kind}] ${signal.evidence}${signal.relativePath ? ` (${signal.relativePath})` : ""}`,
        );
      }
      for (const dir of report.discovery.pipelineDirectories) {
        console.log(`  Pipeline dir: ${dir.relativePath} (${dir.fileCount} files)`);
      }
      for (const warning of [...report.configWarnings, ...report.discovery.warnings]) {
        console.log(`Warning: ${warning}`);
      }
      for (const error of report.configErrors) {
        console.log(`Error: ${error}`);
      }
    });

  vision
    .command("discover")
    .description("Scan TeamCode and Gradle for vision library signals")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (options: { json?: boolean }) => {
      const discovery = await discoverVisionWorkspace(process.cwd());
      if (options.json) {
        console.log(JSON.stringify(discovery, null, 2));
        return;
      }

      console.log("Vision workspace discovery\n");
      if (!discovery.isOfficialFtcProject) {
        console.log("Not an official FTC project.");
        return;
      }
      if (discovery.signals.length === 0) {
        console.log("No vision signals detected.");
      } else {
        for (const signal of discovery.signals) {
          console.log(`${signal.kind} → ${signal.suggestedProviderId}`);
          console.log(`  ${signal.evidence}`);
        }
      }
      for (const dir of discovery.pipelineDirectories) {
        console.log(`Pipeline directory: ${dir.relativePath} (${dir.fileCount} files)`);
      }
    });
}
