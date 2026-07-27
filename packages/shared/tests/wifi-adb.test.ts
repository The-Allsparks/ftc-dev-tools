import { describe, expect, it } from "vitest";
import { probeRobotConsole } from "../src/wifi/probe-console.js";
import { connectWifiAdb } from "../src/wifi/wireless-adb.js";
import type { CommandResult, CommandSpec, ProcessRunner } from "../src/types/process.js";
import type { FetchLike } from "../src/wifi/types.js";

class FakeRunner implements ProcessRunner {
  async run(spec: CommandSpec): Promise<CommandResult> {
    if (spec.command.includes("adb")) {
      return {
        exitCode: 0,
        signal: null,
        stdout: "connected to 192.168.43.1:5555",
        stderr: "",
        timedOut: false,
        durationMs: 1,
      };
    }
    if (spec.command === "where" || spec.command === "which") {
      return {
        exitCode: 0,
        signal: null,
        stdout: "C:\\platform-tools\\adb.exe",
        stderr: "",
        timedOut: false,
        durationMs: 1,
      };
    }
    if (spec.args.includes("version")) {
      return {
        exitCode: 0,
        signal: null,
        stdout: "Android Debug Bridge version 1.0.41",
        stderr: "",
        timedOut: false,
        durationMs: 1,
      };
    }
    return {
      exitCode: 0,
      signal: null,
      stdout: "",
      stderr: "",
      timedOut: false,
      durationMs: 1,
    };
  }

  spawn(): never {
    throw new Error("not used");
  }
}

describe("wifi probe and adb", () => {
  it("probeRobotConsole reports reachable on HTTP 200", async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      async json() {
        return {};
      },
      async text() {
        return "";
      },
      async arrayBuffer() {
        return new ArrayBuffer(0);
      },
    });
    const result = await probeRobotConsole({ fetchImpl });
    expect(result.reachable).toBe(true);
  });

  it("connectWifiAdb calls adb connect", async () => {
    const runner = new FakeRunner();
    const originalRun = runner.run.bind(runner);
    let adbConnectArgs: string[] | undefined;
    runner.run = async (spec, options) => {
      if (spec.command.includes("adb") && spec.args[0] === "connect") {
        adbConnectArgs = spec.args;
      }
      return originalRun(spec, options);
    };
    const result = await connectWifiAdb({
      runner,
      endpoint: "192.168.43.1:5555",
      ensureRoute: false,
    });
    expect(result.success).toBe(true);
    expect(adbConnectArgs).toEqual(["connect", "192.168.43.1:5555"]);
  });
});
