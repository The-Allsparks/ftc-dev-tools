import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  clearWifiPassword,
  loadWifiPassword,
  redactSecrets,
  storeWifiPassword,
} from "../src/wifi/credentials.js";
import { buildWindowsWlanProfile, joinRobotWifi } from "../src/wifi/join-wifi.js";
import {
  getHubWifiSettings,
  parseHubWifiSettingsFromHtml,
  setHubWifiSettings,
} from "../src/wifi/manage-hub-wifi.js";
import type { CommandResult, CommandSpec, ProcessRunner } from "../src/types/process.js";
import type { FetchLike } from "../src/sdk/types.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

class FakeRunner implements ProcessRunner {
  readonly commands: CommandSpec[] = [];
  exitCode = 0;

  async run(spec: CommandSpec): Promise<CommandResult> {
    this.commands.push(spec);
    return {
      exitCode: this.exitCode,
      signal: null,
      stdout: "ok",
      stderr: "",
      timedOut: false,
      durationMs: 1,
    };
  }

  spawn(): never {
    throw new Error("not used");
  }
}

describe("wifi credentials", () => {
  it("stores and loads encrypted password without plaintext file contents", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-wifi-sec-"));
    tempDirs.push(dir);
    const secrets = path.join(dir, "wifi-secrets.enc");
    const pref = path.join(dir, "wifi.json");
    await storeWifiPassword("FTC-TEST", "s3cret-pass", {
      secretsPath: secrets,
      preferencePath: pref,
    });
    const loaded = await loadWifiPassword("FTC-TEST", { secretsPath: secrets });
    expect(loaded).toBe("s3cret-pass");
    const raw = await fs.readFile(secrets, "utf8");
    expect(raw).not.toContain("s3cret-pass");
    const prefRaw = await fs.readFile(pref, "utf8");
    expect(prefRaw).toContain("FTC-TEST");
    expect(prefRaw).not.toContain("s3cret-pass");
    await clearWifiPassword("FTC-TEST", { secretsPath: secrets });
    expect(await loadWifiPassword("FTC-TEST", { secretsPath: secrets })).toBeUndefined();
  });

  it("prefers env password", async () => {
    const loaded = await loadWifiPassword("ANY", {
      env: { FTC_WIFI_PASSWORD: "from-env" },
      secretsPath: path.join(os.tmpdir(), "missing-secrets.json"),
    });
    expect(loaded).toBe("from-env");
  });

  it("redacts secrets", () => {
    expect(redactSecrets("password=hunter2 connected", ["hunter2"])).toContain("***");
  });
});

describe("join wifi", () => {
  it("builds a windows profile containing ssid", () => {
    const xml = buildWindowsWlanProfile("FTC-ABC", "password");
    expect(xml).toContain("<name>FTC-ABC</name>");
    expect(xml).toContain("keyMaterial");
  });

  it("issues netsh connect on Windows", async () => {
    const runner = new FakeRunner();
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-join-"));
    tempDirs.push(dir);
    const result = await joinRobotWifi({
      runner,
      ssid: "FTC-ABC",
      password: "password",
      interfaceName: "Wi-Fi 2",
      preferencePath: path.join(dir, "wifi.json"),
      secretsPath: path.join(dir, "sec.enc"),
      platform: "win32",
      yes: true,
      remember: true,
    });
    expect(result.success).toBe(true);
    expect(runner.commands.some((c) => c.command === "netsh" && c.args.includes("connect"))).toBe(
      true,
    );
  });

  it("requires --yes", async () => {
    const runner = new FakeRunner();
    const result = await joinRobotWifi({
      runner,
      ssid: "FTC-ABC",
      password: "password",
      yes: false,
      platform: "win32",
    });
    expect(result.success).toBe(false);
    expect(runner.commands).toHaveLength(0);
  });
});

describe("hub wifi manage", () => {
  it("parses connection info html", () => {
    const html = `
      <div>Network Name: FTC-1Ybr</div>
      <div>Password: hunter2</div>
      <div>Channel: 36</div>
      <div>Band: 5 GHz</div>
    `;
    const parsed = parseHubWifiSettingsFromHtml(html, "http://192.168.43.1:8080/");
    expect(parsed.ssid).toBe("FTC-1Ybr");
    expect(parsed.password).toBe("hunter2");
    expect(parsed.channel).toBe("36");
  });

  it("getHubWifiSettings returns publicSettings without password", async () => {
    const html = `<div>Network Name: FTC-ZZ</div><div>Password: secret</div>`;
    const fetchImpl: FetchLike = async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      async json() {
        return {};
      },
      async text() {
        return html;
      },
      async arrayBuffer() {
        return new ArrayBuffer(0);
      },
    });
    const result = await getHubWifiSettings({ fetchImpl });
    expect(result.success).toBe(true);
    expect(result.publicSettings?.ssid).toBe("FTC-ZZ");
    expect(result.publicSettings?.passwordSet).toBe(true);
    expect(JSON.stringify(result.publicSettings)).not.toContain("secret");
  });

  it("setHubWifiSettings dry-run does not POST", async () => {
    let posts = 0;
    const fetchImpl: FetchLike = async (_url, init) => {
      if (init?.method === "POST") {
        posts += 1;
      }
      return {
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
      };
    };
    const result = await setHubWifiSettings({
      fetchImpl,
      dryRun: true,
      input: { ssid: "FTC-NEW", password: "newpass" },
    });
    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(posts).toBe(0);
  });

  it("setHubWifiSettings applies via first successful endpoint", async () => {
    const fetchImpl: FetchLike = async (url, init) => {
      const ok = init?.method === "POST" && String(url).includes("/network_settings");
      return {
        ok,
        status: ok ? 200 : 404,
        statusText: ok ? "OK" : "Missing",
        async json() {
          return {};
        },
        async text() {
          return "";
        },
        async arrayBuffer() {
          return new ArrayBuffer(0);
        },
      };
    };
    const result = await setHubWifiSettings({
      fetchImpl,
      yes: true,
      input: { ssid: "FTC-NEW" },
    });
    expect(result.success).toBe(true);
    expect(result.attemptedEndpoints.some((u) => u.includes("/network_settings"))).toBe(true);
  });
});
