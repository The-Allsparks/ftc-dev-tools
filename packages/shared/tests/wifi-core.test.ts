import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  getWifiPreferencePath,
  loadWifiPreference,
  setRobotNetworkInterface,
} from "../src/wifi/interface-preference.js";
import { parseNetshInterfacesOutput } from "../src/wifi/list-interfaces.js";
import { buildRoutePlan, ensureRobotRoute } from "../src/wifi/robot-route.js";
import type { CommandResult, CommandSpec, ProcessRunner } from "../src/types/process.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

class FakeRunner implements ProcessRunner {
  readonly commands: CommandSpec[] = [];
  routeExitCode = 0;
  routeOutput = "";

  async run(spec: CommandSpec): Promise<CommandResult> {
    this.commands.push(spec);
    if (spec.command === "route") {
      return {
        exitCode: this.routeExitCode,
        signal: null,
        stdout: this.routeOutput,
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

describe("wifi interfaces and preference", () => {
  it("parses netsh interface output", () => {
    const ifaces = parseNetshInterfacesOutput(`
Idx     Met         MTU          State                Name
---  ----------  ----------  ------------  ---------------------------
 12          25        1500  connected     Wi-Fi 2
  1          75  4294967295  connected     Loopback Pseudo-Interface 1
`);
    expect(ifaces).toHaveLength(2);
    expect(ifaces[0]?.name).toBe("Wi-Fi 2");
    expect(ifaces[0]?.index).toBe(12);
    expect(ifaces[0]?.metric).toBe(25);
  });

  it("saves robot interface preference", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-wifi-pref-"));
    tempDirs.push(dir);
    const prefPath = path.join(dir, "wifi.json");
    const selected = await setRobotNetworkInterface({ name: "Wi-Fi 2", index: 12 }, prefPath);
    expect(selected.name).toBe("Wi-Fi 2");
    const loaded = await loadWifiPreference(prefPath);
    expect(loaded.preference.robotNetworkInterface?.name).toBe("Wi-Fi 2");
  });

  it("getWifiPreferencePath is under app config", () => {
    const p = getWifiPreferencePath("win32", { APPDATA: "C:\\Users\\me\\AppData\\Roaming" });
    expect(p).toContain("ftc-dev-tools");
    expect(p).toContain("wifi.json");
  });
});

describe("robot route", () => {
  it("builds Windows route plan with interface index", () => {
    const plan = buildRoutePlan({
      platform: "win32",
      destinationCidr: "192.168.43.0/24",
      interfaceIndex: 12,
      interfaceName: "Wi-Fi 2",
    });
    expect(plan.commandDisplay).toContain("route add 192.168.43.0");
    expect(plan.commandDisplay).toContain("IF 12");
  });

  it("ensureRobotRoute requires --yes", async () => {
    const runner = new FakeRunner();
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-wifi-route-"));
    tempDirs.push(dir);
    const prefPath = path.join(dir, "wifi.json");
    await setRobotNetworkInterface({ name: "Wi-Fi 2", index: 12 }, prefPath);
    const result = await ensureRobotRoute({
      runner,
      platform: "win32",
      preferencePath: prefPath,
      yes: false,
    });
    expect(result.success).toBe(false);
    expect(runner.commands).toHaveLength(0);
  });

  it("ensureRobotRoute adds route on Windows when yes", async () => {
    const runner = new FakeRunner();
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-wifi-route-"));
    tempDirs.push(dir);
    const prefPath = path.join(dir, "wifi.json");
    await setRobotNetworkInterface({ name: "Wi-Fi 2", index: 12 }, prefPath);
    const result = await ensureRobotRoute({
      runner,
      platform: "win32",
      preferencePath: prefPath,
      yes: true,
    });
    expect(result.success).toBe(true);
    expect(runner.commands[0]?.command).toBe("route");
    expect(runner.commands[0]?.args).toContain("IF");
    expect(runner.commands[0]?.args).toContain("12");
  });
});
