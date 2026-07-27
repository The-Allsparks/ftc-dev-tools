import type { Logger } from "../logger.js";
import { interpretError, interpretFromUnknown } from "../errors/interpret.js";
import { formatCommandForDisplay } from "../process/sanitize.js";
import type { ProcessRunner } from "../types/process.js";
import type { BuildResult, ProjectAdapter } from "../types/project.js";
import type { FriendlyError } from "../types/errors.js";

export interface BuildServiceOptions {
  adapter: ProjectAdapter;
  runner: ProcessRunner;
  logger: Logger;
  cwd: string;
  verbose?: boolean;
  signal?: AbortSignal;
}

export interface BuildServiceOutcome {
  result: BuildResult;
  friendlyError?: FriendlyError;
}

export async function buildProject(options: BuildServiceOptions): Promise<BuildServiceOutcome> {
  const started = Date.now();
  try {
    const project = await options.adapter.inspect(options.cwd);
    const command = await options.adapter.getBuildCommand(project);
    options.logger.info(`Running ${formatCommandForDisplay(command)}`);

    const commandResult = await options.runner.run(command, {
      timeoutMs: 30 * 60_000,
      signal: options.signal,
      inheritStdio: options.verbose === true,
    });

    if (commandResult.exitCode !== 0) {
      const combined = `${commandResult.stdout}\n${commandResult.stderr}`;
      return {
        result: {
          success: false,
          durationMs: Date.now() - started,
          stdout: commandResult.stdout,
          stderr: commandResult.stderr,
          exitCode: commandResult.exitCode,
        },
        friendlyError: interpretError(combined),
      };
    }

    const apkPath = await options.adapter.locateApk(project);
    return {
      result: {
        success: true,
        apkPath,
        durationMs: Date.now() - started,
        stdout: commandResult.stdout,
        stderr: commandResult.stderr,
        exitCode: commandResult.exitCode,
      },
    };
  } catch (error) {
    return {
      result: {
        success: false,
        durationMs: Date.now() - started,
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1,
      },
      friendlyError: interpretFromUnknown(error),
    };
  }
}

export async function cleanProject(options: BuildServiceOptions): Promise<BuildServiceOutcome> {
  const started = Date.now();
  try {
    const project = await options.adapter.inspect(options.cwd);
    const command = await options.adapter.getCleanCommand(project);
    options.logger.info(`Running ${formatCommandForDisplay(command)}`);
    const commandResult = await options.runner.run(command, {
      timeoutMs: 30 * 60_000,
      signal: options.signal,
      inheritStdio: options.verbose === true,
    });
    if (commandResult.exitCode !== 0) {
      return {
        result: {
          success: false,
          durationMs: Date.now() - started,
          stdout: commandResult.stdout,
          stderr: commandResult.stderr,
          exitCode: commandResult.exitCode,
        },
        friendlyError: interpretError(`${commandResult.stdout}\n${commandResult.stderr}`),
      };
    }
    return {
      result: {
        success: true,
        durationMs: Date.now() - started,
        stdout: commandResult.stdout,
        stderr: commandResult.stderr,
        exitCode: commandResult.exitCode,
      },
    };
  } catch (error) {
    return {
      result: {
        success: false,
        durationMs: Date.now() - started,
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1,
      },
      friendlyError: interpretFromUnknown(error),
    };
  }
}
