import {
  AdbDeviceProvider,
  ConsoleLogger,
  OfficialFtcProjectAdapter,
  NodeProcessRunner,
  discoverAdb,
} from "@ftc-dev-tools/shared";
import type { DeviceProvider, Logger, ProcessRunner, ProjectAdapter } from "@ftc-dev-tools/shared";

export interface CliContext {
  cwd: string;
  runner: ProcessRunner;
  adapter: ProjectAdapter;
  logger: Logger;
  createDeviceProvider(): Promise<DeviceProvider>;
}

export function createCliContext(cwd: string = process.cwd(), verbose = false): CliContext {
  const runner = new NodeProcessRunner();
  const adapter = new OfficialFtcProjectAdapter();
  const logger = new ConsoleLogger(verbose ? "debug" : "info");

  return {
    cwd,
    runner,
    adapter,
    logger,
    async createDeviceProvider(): Promise<DeviceProvider> {
      const adb = await discoverAdb(runner);
      if (!adb.found || !adb.adbPath) {
        throw Object.assign(new Error("adb not found"), { code: "ADB_NOT_FOUND" });
      }
      return new AdbDeviceProvider(runner, adb.adbPath);
    },
  };
}

export function printFriendlyError(
  error: {
    title: string;
    summary: string;
    suggestedActions: string[];
    technicalDetails?: string;
    code: string;
  },
  showTechnical: boolean,
): void {
  console.error(`\n${error.title} (${error.code})`);
  console.error(error.summary);
  console.error("\nNext steps:");
  for (const action of error.suggestedActions) {
    console.error(`  - ${action}`);
  }
  if (showTechnical && error.technicalDetails) {
    console.error("\nTechnical details:");
    console.error(error.technicalDetails);
  } else if (error.technicalDetails) {
    console.error("\nRe-run with --verbose for technical details when available.");
  }
}
