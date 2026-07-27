import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  preferInternetInterface,
  preferRobotInterface,
  setAdapterAdminState,
} from "../src/wifi/interface-metrics.js";
import { setRobotNetworkInterface } from "../src/wifi/interface-preference.js";
import { parseNetshInterfacesOutput } from "../src/wifi/list-interfaces.js";
import type { CommandResult, CommandSpec, ProcessRunner } from "../src/types/process.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

const NETSH_IFACES = `
Idx     Met         MTU          State                Name
---  ----------  ----------  ------------  ---------------------------
 12          25        1500  connected     Wi-Fi 2
 15          35        1500  connected     Ethernet
  1          75  4294967295  connected     Loopback Pseudo-Interface 1
`;

class FakeRunner implements ProcessRunner {
  readonly commands: CommandSpec[] = [];
  exitCode = 0;
  stdout = "ok";

  async run(spec: CommandSpec): Promise<CommandResult> {
    this.commands.push(spec);
    if (spec.command === "netsh" && spec.args.includes("show") && spec.args.includes("interfaces")) {
      return {
        exitCode: 0,
        signal: null,
        stdout: NETSH_IFACES,
        stderr: "",
        timedOut: false,
        durationMs: 1,
      };
    }
    return {
      exitCode: this.exitCode,
      signal: null,
      stdout: this.stdout,
      stderr: "",
      timedOut: false,
      durationMs: 1,
    };
  }

  spawn(): never {
    throw new Error("not used");
  }
}

describe("interface metrics parsing", () => {
  it("captures Met column from netsh", () => {
    const ifaces = parseNetshInterfacesOutput(NETSH_IFACES);
    expect(ifaces.find((i) => i.name === "Wi-Fi 2")?.metric).toBe(25);
    expect(ifaces.find((i) => i.name === "Ethernet")?.metric).toBe(35);
  });
});

describe("prefer internet / robot", () => {
  it("plans prefer-internet dry-run with robot NIC deprioritized", async () => {
    const runner = new FakeRunner();
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-wifi-p3-"));
    tempDirs.push(dir);
    const prefPath = path.join(dir, "wifi.json");
    await setRobotNetworkInterface({ name: "Wi-Fi 2", index: 12 }, prefPath);

    const result = await preferInternetInterface({
      runner,
      interfaceName: "Ethernet",
      preferencePath: prefPath,
      platform: "win32",
      dryRun: true,
    });

    expect(result.success).toBe(true);
    expect(result.changes).toHaveLength(2);
    expect(result.changes[0]?.name).toBe("Ethernet");
    expect(result.changes[0]?.nextMetric).toBe(10);
    expect(result.changes[1]?.name).toBe("Wi-Fi 2");
    expect(result.changes[1]?.nextMetric).toBe(50);
    expect(runner.commands.some((c) => c.args.includes("metric=10"))).toBe(false);
  });

  it("applies prefer-internet metrics with --yes", async () => {
    const runner = new FakeRunner();
    const result = await preferInternetInterface({
      runner,
      interfaceName: "Ethernet",
      robotInterfaceName: "Wi-Fi 2",
      platform: "win32",
      yes: true,
    });
    expect(result.success).toBe(true);
    const metricCmds = runner.commands.filter(
      (c) => c.command === "netsh" && c.args.some((a) => a.startsWith("metric=")),
    );
    expect(metricCmds.length).toBeGreaterThanOrEqual(2);
  });

  it("prefer-robot dry-run includes route + metric plan", async () => {
    const runner = new FakeRunner();
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-wifi-p3-"));
    tempDirs.push(dir);
    const prefPath = path.join(dir, "wifi.json");
    await setRobotNetworkInterface({ name: "Wi-Fi 2", index: 12 }, prefPath);

    const result = await preferRobotInterface({
      runner,
      preferencePath: prefPath,
      platform: "win32",
      dryRun: true,
    });
    expect(result.success).toBe(true);
    expect(result.planLines.some((l) => /subnet route/i.test(l))).toBe(true);
    expect(result.changes[0]?.nextMetric).toBe(50);
  });
});

describe("adapter enable/disable", () => {
  it("refuses disabling the last up non-loopback interface", async () => {
    // With a single non-loopback up NIC, disable without --force must fail.
    const singleUp = `
Idx     Met         MTU          State                Name
---  ----------  ----------  ------------  ---------------------------
 15          35        1500  connected     Ethernet
  1          75  4294967295  connected     Loopback Pseudo-Interface 1
`;
    class SingleUpRunner extends FakeRunner {
      override async run(spec: CommandSpec): Promise<CommandResult> {
        this.commands.push(spec);
        if (spec.command === "netsh" && spec.args.includes("show") && spec.args.includes("interfaces")) {
          return {
            exitCode: 0,
            signal: null,
            stdout: singleUp,
            stderr: "",
            timedOut: false,
            durationMs: 1,
          };
        }
        return {
          exitCode: 0,
          signal: null,
          stdout: "ok",
          stderr: "",
          timedOut: false,
          durationMs: 1,
        };
      }
    }
    const single = new SingleUpRunner();
    const result = await setAdapterAdminState({
      runner: single,
      interfaceName: "Ethernet",
      action: "disable",
      platform: "win32",
      yes: true,
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("WIFI_ADAPTER_LAST_UP");
  });

  it("allows last-up disable with --force", async () => {
    const singleUp = `
Idx     Met         MTU          State                Name
---  ----------  ----------  ------------  ---------------------------
 15          35        1500  connected     Ethernet
  1          75  4294967295  connected     Loopback Pseudo-Interface 1
`;
    class SingleUpRunner extends FakeRunner {
      override async run(spec: CommandSpec): Promise<CommandResult> {
        this.commands.push(spec);
        if (spec.command === "netsh" && spec.args.includes("show") && spec.args.includes("interfaces")) {
          return {
            exitCode: 0,
            signal: null,
            stdout: singleUp,
            stderr: "",
            timedOut: false,
            durationMs: 1,
          };
        }
        return {
          exitCode: 0,
          signal: null,
          stdout: "ok",
          stderr: "",
          timedOut: false,
          durationMs: 1,
        };
      }
    }
    const single = new SingleUpRunner();
    const result = await setAdapterAdminState({
      runner: single,
      interfaceName: "Ethernet",
      action: "disable",
      platform: "win32",
      yes: true,
      force: true,
    });
    expect(result.success).toBe(true);
    expect(
      single.commands.some(
        (c) => c.command === "netsh" && c.args.includes("admin=DISABLED"),
      ),
    ).toBe(true);
  });

  it("requires --yes for adapter enable", async () => {
    const runner = new FakeRunner();
    const result = await setAdapterAdminState({
      runner,
      interfaceName: "Ethernet",
      action: "enable",
      platform: "win32",
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("WIFI_ADAPTER_FAILED");
  });
});
