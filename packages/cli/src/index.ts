import { Command } from "commander";
import { PACKAGE_VERSION } from "@ftc-dev-tools/shared";
import { registerBuildCommand } from "./commands/build.js";
import { registerCleanCommand } from "./commands/clean.js";
import { registerDeployCommand } from "./commands/deploy.js";
import { registerDevicesCommand } from "./commands/devices.js";
import { registerDoctorCommand } from "./commands/doctor.js";
import { registerLogsCommand } from "./commands/logs.js";
import { registerSdkCommand } from "./commands/sdk.js";
import { registerHubCommand } from "./commands/hub.js";
import { registerConfigCommand } from "./commands/config.js";
import { registerHwMapCommand } from "./commands/hwmap.js";
import { registerOpModeCommand } from "./commands/opmode.js";
import { registerPedroCommand } from "./commands/pedro.js";
import { registerWifiCommand } from "./commands/wifi.js";
import { registerSetupCommand } from "./commands/setup.js";
import { registerInstallCliCommand } from "./commands/install-cli.js";

import { registerGitHubCommand } from "./commands/github.js";
import { registerIntegrationsCommand } from "./commands/integrations.js";
import { registerModulesCommand } from "./commands/modules.js";
import { registerProvidersCommand } from "./commands/providers.js";
import { registerVisionCommand } from "./commands/vision.js";

export async function runCli(argv: string[]): Promise<void> {
  const program = new Command();
  program
    .name("ftc")
    .description("Build, deploy, and diagnose FIRST Tech Challenge Android robot projects")
    .version(PACKAGE_VERSION);

  registerDoctorCommand(program);
  registerDevicesCommand(program);
  registerBuildCommand(program);
  registerDeployCommand(program);
  registerLogsCommand(program);
  registerCleanCommand(program);
  registerSdkCommand(program);
  registerWifiCommand(program);
  registerSetupCommand(program);
  registerInstallCliCommand(program);
  registerHubCommand(program);
  registerPedroCommand(program);
  registerOpModeCommand(program);
  registerConfigCommand(program);
  registerHwMapCommand(program);
  registerGitHubCommand(program);
  registerIntegrationsCommand(program);
  registerModulesCommand(program);
  registerProvidersCommand(program);
  registerVisionCommand(program);

  await program.parseAsync(argv);
}
