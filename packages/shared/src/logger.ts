export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export class ConsoleLogger implements Logger {
  constructor(
    private readonly minLevel: LogLevel = "info",
    private readonly sink: (line: string) => void = console.error,
  ) {}

  debug(message: string, meta?: Record<string, unknown>): void {
    this.write("debug", message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.write("info", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.write("warn", message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.write("error", message, meta);
  }

  private write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (!shouldLog(this.minLevel, level)) {
      return;
    }
    const suffix = meta ? ` ${JSON.stringify(meta)}` : "";
    this.sink(`[ftc:${level}] ${message}${suffix}`);
  }
}

const ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function shouldLog(min: LogLevel, level: LogLevel): boolean {
  return ORDER[level] >= ORDER[min];
}
