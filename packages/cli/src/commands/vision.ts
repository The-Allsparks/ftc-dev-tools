import type { Command } from "commander";
import {
  discoverVisionDevices,
  discoverVisionWorkspace,
  getVisionStatus,
} from "@ftc-dev-tools/shared";
import { createCliContext } from "../context.js";

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

  vision
    .command("devices")
    .description("Discover vision endpoints and probe local-network services")
    .option("--json", "Emit stable machine-readable JSON")
    .option("--no-probe", "Skip network reachability checks")
    .action(async (options: { json?: boolean; probe?: boolean }) => {
      const ctx = createCliContext();
      let deviceProvider;
      try {
        deviceProvider = await ctx.createDeviceProvider();
      } catch {
        deviceProvider = undefined;
      }

      const report = await discoverVisionDevices(ctx.cwd, {
        deviceProvider,
        runner: ctx.runner,
        probeNetwork: options.probe !== false,
      });

      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      console.log("Vision endpoint discovery\n");
      console.log(report.message);
      if (report.requiresSelection) {
        for (const reason of report.selectionReasons) {
          console.log(`Selection required: ${reason}`);
        }
      }
      for (const endpoint of report.endpoints) {
        const hostLabel = endpoint.host ? `${endpoint.host}:${endpoint.port ?? ""}` : "config";
        console.log(
          `[${endpoint.kind}] ${hostLabel} (${endpoint.probe.reachable}) — ${endpoint.providerId}`,
        );
        console.log(`  sources: ${endpoint.sources.join(", ")}`);
        for (const line of endpoint.evidence) {
          console.log(`  ${line}`);
        }
      }
      for (const warning of report.warnings) {
        console.log(`Warning: ${warning}`);
      }
    });
}
