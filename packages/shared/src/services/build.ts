import type { Logger } from "../logger.js";
import { interpretError, interpretFromUnknown } from "../errors/interpret.js";
import { formatCommandForDisplay } from "../process/sanitize.js";
import { withFtcJdkEnv } from "../gradle/java-env.js";
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
  /** Overrides process env when resolving JDK 17 for Gradle (e.g. `FTC_JAVA_HOME` from settings). */
  env?: NodeJS.ProcessEnv;
}

export interface BuildServiceOutcome {
  result: BuildResult;
  friendlyError?: FriendlyError;
}

type GradleTask = "build" | "clean";

async function executeGradleTask(
  options: BuildServiceOptions,
  task: GradleTask,
): Promise<BuildServiceOutcome> {
  const started = Date.now();
  try {
    const project = await options.adapter.inspect(options.cwd);
    const rawCommand =
      task === "build"
        ? await options.adapter.getBuildCommand(project)
        : await options.adapter.getCleanCommand(project);
    const command = await withFtcJdkEnv(rawCommand, options.runner, options.env ?? process.env);
    if (command.env?.JAVA_HOME) {
      options.logger.info(`Using JAVA_HOME=${command.env.JAVA_HOME} for Gradle`);
    }
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

    const successResult: BuildResult = {
      success: true,
      durationMs: Date.now() - started,
      stdout: commandResult.stdout,
      stderr: commandResult.stderr,
      exitCode: commandResult.exitCode,
    };

    if (task === "build") {
      successResult.apkPath = await options.adapter.locateApk(project);
    }

    return { result: successResult };
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

export async function buildProject(options: BuildServiceOptions): Promise<BuildServiceOutcome> {
  return executeGradleTask(options, "build");
}

export async function cleanProject(options: BuildServiceOptions): Promise<BuildServiceOutcome> {
  return executeGradleTask(options, "clean");
}
