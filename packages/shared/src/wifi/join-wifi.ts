import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { interpretFromUnknown } from "../errors/interpret.js";
import type { ProcessRunner } from "../types/process.js";
import { loadWifiPassword, storeWifiPassword, redactSecrets } from "./credentials.js";
import { loadWifiPreference, saveWifiPreference } from "./interface-preference.js";
import type { WifiJoinResult } from "./types.js";

export interface JoinWifiOptions {
  runner: ProcessRunner;
  ssid: string;
  password?: string;
  interfaceName?: string;
  /** Persist password in machine-local encrypted store. Default true when password provided. */
  remember?: boolean;
  passwordEnvVar?: string;
  preferencePath?: string;
  secretsPath?: string;
  platform?: NodeJS.Platform;
  yes?: boolean;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildWindowsWlanProfile(ssid: string, password: string): string {
  const hexSsid = Buffer.from(ssid, "utf8").toString("hex").toUpperCase();
  return `<?xml version="1.0"?>
<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
  <name>${escapeXml(ssid)}</name>
  <SSIDConfig>
    <SSID>
      <hex>${hexSsid}</hex>
      <name>${escapeXml(ssid)}</name>
    </SSID>
  </SSIDConfig>
  <connectionType>ESS</connectionType>
  <connectionMode>manual</connectionMode>
  <MSM>
    <security>
      <authEncryption>
        <authentication>WPA2PSK</authentication>
        <encryption>AES</encryption>
        <useOneX>false</useOneX>
      </authEncryption>
      <sharedKey>
        <keyType>passPhrase</keyType>
        <protected>false</protected>
        <keyMaterial>${escapeXml(password)}</keyMaterial>
      </sharedKey>
    </security>
  </MSM>
</WLANProfile>
`;
}

export async function joinRobotWifi(options: JoinWifiOptions): Promise<WifiJoinResult> {
  const platform = options.platform ?? process.platform;
  const ssid = options.ssid.trim();
  if (!ssid) {
    return {
      success: false,
      ssid: "",
      message: "SSID is required.",
      error: interpretFromUnknown(
        Object.assign(new Error("SSID is required."), { code: "WIFI_JOIN_FAILED" }),
      ),
    };
  }

  if (!options.yes) {
    return {
      success: false,
      ssid,
      message: "Refusing to join Wi-Fi without --yes.",
      error: interpretFromUnknown(
        Object.assign(new Error("Wi-Fi join requires --yes."), { code: "WIFI_JOIN_FAILED" }),
      ),
    };
  }

  let interfaceName = options.interfaceName;
  if (!interfaceName) {
    const { preference } = await loadWifiPreference(options.preferencePath);
    interfaceName = preference.robotNetworkInterface?.name;
  }

  let password = options.password;
  if (!password) {
    password = await loadWifiPassword(ssid, {
      secretsPath: options.secretsPath,
      passwordEnvVar: options.passwordEnvVar,
    });
  }
  if (!password) {
    return {
      success: false,
      ssid,
      interfaceName,
      message:
        "No password provided. Pass --password-env FTC_WIFI_PASSWORD, provide a stored password, or set the env var.",
      error: interpretFromUnknown(
        Object.assign(new Error("Wi-Fi password missing."), { code: "WIFI_PASSWORD_MISSING" }),
      ),
    };
  }

  try {
    if (platform === "win32") {
      await joinWindows(options.runner, ssid, password, interfaceName);
    } else if (platform === "darwin") {
      await joinMacos(options.runner, ssid, password, interfaceName);
    } else {
      await joinLinux(options.runner, ssid, password, interfaceName);
    }

    if (options.remember !== false) {
      await storeWifiPassword(ssid, password, {
        secretsPath: options.secretsPath,
        preferencePath: options.preferencePath,
      });
    } else {
      const { path: prefPath, preference } = await loadWifiPreference(options.preferencePath);
      await saveWifiPreference({ ...preference, rememberedSsid: ssid }, prefPath);
    }

    return {
      success: true,
      ssid,
      interfaceName,
      message: interfaceName
        ? `Joined Wi-Fi "${ssid}" on interface ${interfaceName}.`
        : `Joined Wi-Fi "${ssid}".`,
    };
  } catch (error) {
    const friendly = interpretFromUnknown(error);
    const technical = redactSecrets(friendly.technicalDetails ?? friendly.summary, [password]);
    return {
      success: false,
      ssid,
      interfaceName,
      message: `Failed to join Wi-Fi "${ssid}".`,
      error: {
        ...friendly,
        technicalDetails: technical,
        code: friendly.code || "WIFI_JOIN_FAILED",
      },
    };
  }
}

async function joinWindows(
  runner: ProcessRunner,
  ssid: string,
  password: string,
  interfaceName?: string,
): Promise<void> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-wlan-"));
  const profilePath = path.join(tmpDir, `${ssid.replace(/[^\w.-]+/g, "_")}.xml`);
  try {
    await fs.writeFile(profilePath, buildWindowsWlanProfile(ssid, password), "utf8");
    const add = await runner.run({
      command: "netsh",
      args: ["wlan", "add", "profile", `filename=${profilePath}`, "user=current"],
    });
    if (add.exitCode !== 0) {
      throw Object.assign(
        new Error(
          redactSecrets(add.stderr || add.stdout || "netsh add profile failed", [password]),
        ),
        { code: "WIFI_JOIN_FAILED" },
      );
    }
    const connectArgs = ["wlan", "connect", `name=${ssid}`];
    if (interfaceName) {
      connectArgs.push(`interface=${interfaceName}`);
    }
    const connect = await runner.run({ command: "netsh", args: connectArgs });
    if (connect.exitCode !== 0) {
      throw Object.assign(
        new Error(
          redactSecrets(connect.stderr || connect.stdout || "netsh connect failed", [password]),
        ),
        { code: "WIFI_JOIN_FAILED" },
      );
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function joinMacos(
  runner: ProcessRunner,
  ssid: string,
  password: string,
  interfaceName?: string,
): Promise<void> {
  const device = interfaceName ?? "en0";
  const result = await runner.run({
    command: "networksetup",
    args: ["-setairportnetwork", device, ssid, password],
  });
  if (result.exitCode !== 0) {
    throw Object.assign(
      new Error(redactSecrets(result.stderr || result.stdout || "networksetup failed", [password])),
      { code: "WIFI_JOIN_FAILED" },
    );
  }
}

async function joinLinux(
  runner: ProcessRunner,
  ssid: string,
  password: string,
  interfaceName?: string,
): Promise<void> {
  const args = ["device", "wifi", "connect", ssid, "password", password];
  if (interfaceName) {
    args.push("ifname", interfaceName);
  }
  const result = await runner.run({ command: "nmcli", args });
  if (result.exitCode !== 0) {
    throw Object.assign(
      new Error(
        redactSecrets(result.stderr || result.stdout || "nmcli connect failed", [password]),
      ),
      { code: "WIFI_JOIN_FAILED" },
    );
  }
}

export { buildWindowsWlanProfile };
