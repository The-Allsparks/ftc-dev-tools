import {
  AdbDeviceProvider,
  ConsoleLogger,
  NodeProcessRunner,
  OfficialFtcProjectAdapter,
  discoverAdb,
  tryCreateOptionalDeviceProvider,
} from "@ftc-dev-tools/shared";
import type { DeviceProvider, Logger, ProcessRunner, ProjectAdapter } from "@ftc-dev-tools/shared";
import path from "node:path";

export interface McpContext {
  projectRoot: string;
  runner: ProcessRunner;
  adapter: ProjectAdapter;
  logger: Logger;
  createDeviceProvider(): Promise<DeviceProvider>;
}

export function resolveProjectRoot(explicit?: string): string {
  const raw = explicit?.trim() || process.env.FTC_PROJECT_ROOT?.trim() || process.cwd();
  return path.resolve(raw);
}

export function createMcpContext(projectRoot?: string, verbose = false): McpContext {
  const runner = new NodeProcessRunner();
  const adapter = new OfficialFtcProjectAdapter();
  const logger = new ConsoleLogger(verbose ? "debug" : "warn");

  return {
    projectRoot: resolveProjectRoot(projectRoot),
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

export async function tryCreateDeviceProvider(
  ctx: McpContext,
): Promise<DeviceProvider | undefined> {
  return tryCreateOptionalDeviceProvider(() => ctx.createDeviceProvider());
}
