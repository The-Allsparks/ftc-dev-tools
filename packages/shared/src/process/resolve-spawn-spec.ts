import type { CommandSpec } from "../types/process.js";

export type ResolvedSpawnSpec = CommandSpec & {
  shell: boolean;
};

/** Quote a Windows cmd.exe token when it contains spaces or quotes. */
export function quoteWindowsCmdToken(value: string): string {
  if (!/[ \t"]/.test(value)) {
    return value;
  }
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Node.js on Windows cannot spawn `.bat`/`.cmd` directly with `shell: false`
 * (EINVAL on recent Node versions). Route through cmd.exe with a quoted line
 * so paths containing spaces (e.g. team folders) work.
 */
export function resolveSpawnSpec(spec: CommandSpec): ResolvedSpawnSpec {
  if (process.platform === "win32" && /\.(bat|cmd)$/i.test(spec.command)) {
    const commandLine = [
      quoteWindowsCmdToken(spec.command),
      ...spec.args.map(quoteWindowsCmdToken),
    ].join(" ");
    return {
      ...spec,
      command: commandLine,
      args: [],
      shell: true,
    };
  }
  return { ...spec, shell: false };
}
