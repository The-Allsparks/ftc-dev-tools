import * as fs from "node:fs";
import * as path from "node:path";
import {
  OfficialFtcProjectAdapter,
  NodeProcessRunner,
  analyzeMachineInstallNeeds,
  buildInstallDepsOptionsFromNeeds,
  buildSetUpComputerDoctorOptions,
  discoverFtcCliOnPath,
  estimateInstallDepsSetupTime,
  installDepsOsForPlatform,
  macPackageArchFromNode,
  mergeExtensionsJson,
  parseJsonStrict,
  runDoctor,
  type StartHereMachineScan,
} from "@ftc-dev-tools/shared";
import { cacheMachineInstallNeeds } from "./machine-install-cache.js";

function extensionsConfigured(root: string | undefined): boolean {
  if (!root) {
    return false;
  }
  const target = path.join(root, ".vscode", "extensions.json");
  if (!fs.existsSync(target)) {
    return false;
  }
  const parsed = parseJsonStrict(fs.readFileSync(target, "utf8"));
  if (!parsed.ok) {
    return false;
  }
  const merged = mergeExtensionsJson(parsed.value) as { recommendations?: string[] };
  return (merged.recommendations?.length ?? 0) > 0;
}

export async function scanMachineForStartHere(
  getWorkspaceRoot: () => string | undefined,
): Promise<StartHereMachineScan> {
  const runner = new NodeProcessRunner();
  const adapter = new OfficialFtcProjectAdapter();
  const cwd = getWorkspaceRoot() ?? process.cwd();

  const report = await runDoctor({
    ...buildSetUpComputerDoctorOptions(cwd, runner, adapter),
  });

  const installNeeds = analyzeMachineInstallNeeds(report.checks);
  cacheMachineInstallNeeds(cwd, installNeeds);

  const cli = await discoverFtcCliOnPath(runner);
  let installTimeEstimateSummary: string | undefined;
  if (!installNeeds.machineDepsSatisfied) {
    const os = installDepsOsForPlatform(process.platform);
    if (os) {
      const est = await estimateInstallDepsSetupTime(
        os,
        buildInstallDepsOptionsFromNeeds(installNeeds),
        macPackageArchFromNode(),
      );
      installTimeEstimateSummary = est.summaryLine;
    }
  }

  return {
    extensionsConfigured: extensionsConfigured(getWorkspaceRoot()),
    installNeeds,
    cliOnPath: cli.found,
    doctorSummaryLine: report.summaryLine,
    installTimeEstimateSummary,
  };
}
