export interface CommandSpec {
  /** Executable path or name. Never pass through an unsanitized shell string. */
  command: string;
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
}

export interface CommandResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
}

export interface RunOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  /** When true, inherit and also capture; default captures only. */
  inheritStdio?: boolean;
}

export interface SpawnOptions {
  signal?: AbortSignal;
}

export interface ChildProcessHandle {
  pid?: number;
  kill(signal?: NodeJS.Signals): void;
  stdout: AsyncIterable<string>;
  stderr: AsyncIterable<string>;
  wait(): Promise<CommandResult>;
}

export interface ProcessRunner {
  run(spec: CommandSpec, options?: RunOptions): Promise<CommandResult>;
  spawn(spec: CommandSpec, options?: SpawnOptions): ChildProcessHandle;
}
