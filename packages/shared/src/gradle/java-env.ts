import type { CommandSpec } from "../types/process.js";
import type { ProcessRunner } from "../types/process.js";
import { resolveJdkEnvForFtcBuild } from "../discovery/java-home.js";

export async function withFtcJdkEnv(
  command: CommandSpec,
  runner: ProcessRunner,
  env: NodeJS.ProcessEnv = process.env,
): Promise<CommandSpec> {
  const jdkEnv = await resolveJdkEnvForFtcBuild(runner, env);
  if (!jdkEnv) {
    return command;
  }
  return {
    ...command,
    env: {
      ...command.env,
      ...jdkEnv,
    },
  };
}
