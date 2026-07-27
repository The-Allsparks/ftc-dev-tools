import type { ProcessRunner } from "../types/process.js";
import { DEFAULT_ROBOT_CONSOLE_URL } from "./defaults.js";

export function buildConsoleOpenCommand(
  url: string = DEFAULT_ROBOT_CONSOLE_URL,
  platform: NodeJS.Platform = process.platform,
): { command: string; args: string[] } {
  if (!/^https?:\/\//i.test(url)) {
    throw Object.assign(new Error("Console URL must be http or https."), {
      code: "WIFI_CONSOLE_UNREACHABLE",
    });
  }
  if (platform === "win32") {
    return { command: "cmd", args: ["/c", "start", "", url] };
  }
  if (platform === "darwin") {
    return { command: "open", args: [url] };
  }
  return { command: "xdg-open", args: [url] };
}

export async function openRobotConsole(
  runner: ProcessRunner,
  url: string = DEFAULT_ROBOT_CONSOLE_URL,
  platform: NodeJS.Platform = process.platform,
): Promise<{ url: string; opened: boolean; message: string }> {
  const spec = buildConsoleOpenCommand(url, platform);
  const result = await runner.run(spec);
  if (result.exitCode !== 0) {
    return {
      url,
      opened: false,
      message: `Could not open browser automatically. Open ${url} manually.`,
    };
  }
  return {
    url,
    opened: true,
    message: `Opened Robot Controller Console: ${url}`,
  };
}
