import { spawn } from "node:child_process";
import type {
  ChildProcessHandle,
  CommandResult,
  CommandSpec,
  ProcessRunner,
  RunOptions,
  SpawnOptions,
} from "../types/process.js";
import { assertSafeCommandSpec } from "./sanitize.js";

async function* streamLines(stream: NodeJS.ReadableStream | null): AsyncIterable<string> {
  if (!stream) {
    return;
  }
  let buffer = "";
  for await (const chunk of stream) {
    buffer += typeof chunk === "string" ? chunk : chunk.toString("utf8");
    let index = buffer.indexOf("\n");
    while (index >= 0) {
      const line = buffer.slice(0, index).replace(/\r$/, "");
      buffer = buffer.slice(index + 1);
      yield line;
      index = buffer.indexOf("\n");
    }
  }
  if (buffer.length > 0) {
    yield buffer.replace(/\r$/, "");
  }
}

export class NodeProcessRunner implements ProcessRunner {
  async run(spec: CommandSpec, options: RunOptions = {}): Promise<CommandResult> {
    assertSafeCommandSpec(spec);
    const started = Date.now();
    return await new Promise<CommandResult>((resolve, reject) => {
      const child = spawn(spec.command, spec.args, {
        cwd: spec.cwd,
        env: { ...process.env, ...spec.env },
        shell: false,
        windowsHide: true,
        stdio: options.inheritStdio ? ["ignore", "inherit", "inherit"] : ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;
      let settled = false;

      const finish = (result: CommandResult): void => {
        if (settled) {
          return;
        }
        settled = true;
        resolve(result);
      };

      if (!options.inheritStdio) {
        child.stdout?.setEncoding("utf8");
        child.stderr?.setEncoding("utf8");
        child.stdout?.on("data", (chunk: string) => {
          stdout += chunk;
        });
        child.stderr?.on("data", (chunk: string) => {
          stderr += chunk;
        });
      }

      let timeout: NodeJS.Timeout | undefined;
      if (options.timeoutMs !== undefined) {
        timeout = setTimeout(() => {
          timedOut = true;
          child.kill("SIGTERM");
        }, options.timeoutMs);
      }

      const onAbort = (): void => {
        child.kill("SIGTERM");
      };
      options.signal?.addEventListener("abort", onAbort, { once: true });

      child.on("error", (error) => {
        if (timeout) {
          clearTimeout(timeout);
        }
        options.signal?.removeEventListener("abort", onAbort);
        reject(error);
      });

      child.on("close", (exitCode, signal) => {
        if (timeout) {
          clearTimeout(timeout);
        }
        options.signal?.removeEventListener("abort", onAbort);
        finish({
          exitCode,
          signal,
          stdout,
          stderr,
          timedOut,
          durationMs: Date.now() - started,
        });
      });
    });
  }

  spawn(spec: CommandSpec, options: SpawnOptions = {}): ChildProcessHandle {
    assertSafeCommandSpec(spec);
    const started = Date.now();
    const child = spawn(spec.command, spec.args, {
      cwd: spec.cwd,
      env: { ...process.env, ...spec.env },
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    const onAbort = (): void => {
      child.kill("SIGTERM");
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });

    return {
      pid: child.pid,
      kill(signal?: NodeJS.Signals): void {
        child.kill(signal);
      },
      stdout: streamLines(child.stdout),
      stderr: streamLines(child.stderr),
      wait(): Promise<CommandResult> {
        return new Promise((resolve, reject) => {
          let stdout = "";
          let stderr = "";
          child.stdout?.setEncoding("utf8");
          child.stderr?.setEncoding("utf8");
          child.stdout?.on("data", (chunk: string) => {
            stdout += chunk;
          });
          child.stderr?.on("data", (chunk: string) => {
            stderr += chunk;
          });
          child.on("error", (error) => {
            options.signal?.removeEventListener("abort", onAbort);
            reject(error);
          });
          child.on("close", (exitCode, signal) => {
            options.signal?.removeEventListener("abort", onAbort);
            resolve({
              exitCode,
              signal,
              stdout,
              stderr,
              timedOut: false,
              durationMs: Date.now() - started,
            });
          });
        });
      },
    };
  }
}
