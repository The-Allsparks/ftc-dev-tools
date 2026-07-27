import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import {
  getWifiPreferencePath,
  loadWifiPreference,
  saveWifiPreference,
} from "./interface-preference.js";

const SERVICE = "ftc-dev-tools-wifi";

function secretsDir(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  home: string = os.homedir(),
): string {
  return path.dirname(getWifiPreferencePath(platform, env, home));
}

function secretsPath(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  home: string = os.homedir(),
): string {
  return path.join(secretsDir(platform, env, home), "wifi-secrets.enc");
}

function machineKey(): Buffer {
  const material = `${os.hostname()}|${os.userInfo().username}|${SERVICE}|ftc-wifi-v1`;
  return crypto.createHash("sha256").update(material).digest();
}

function encryptPassword(password: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", machineKey(), iv);
  const encrypted = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function decryptPassword(blob: string): string {
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", machineKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

interface SecretsFile {
  /** map ssid -> encrypted password */
  bySsid: Record<string, string>;
}

async function loadSecretsFile(filePath?: string): Promise<{ path: string; secrets: SecretsFile }> {
  const resolved = filePath ?? secretsPath();
  try {
    const text = await fs.readFile(resolved, "utf8");
    const parsed = JSON.parse(text) as SecretsFile;
    return { path: resolved, secrets: { bySsid: parsed.bySsid ?? {} } };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return { path: resolved, secrets: { bySsid: {} } };
    }
    throw error;
  }
}

export async function storeWifiPassword(
  ssid: string,
  password: string,
  options: { secretsPath?: string; preferencePath?: string } = {},
): Promise<void> {
  if (!ssid.trim()) {
    throw Object.assign(new Error("SSID is required to store a Wi-Fi password."), {
      code: "WIFI_JOIN_FAILED",
    });
  }
  const { path: resolved, secrets } = await loadSecretsFile(options.secretsPath);
  await fs.mkdir(path.dirname(resolved), { recursive: true });
  secrets.bySsid[ssid] = encryptPassword(password);
  await fs.writeFile(resolved, `${JSON.stringify(secrets, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });

  const { path: prefPath, preference } = await loadWifiPreference(options.preferencePath);
  await saveWifiPreference({ ...preference, rememberedSsid: ssid }, prefPath);
}

export async function loadWifiPassword(
  ssid: string,
  options: { secretsPath?: string; env?: NodeJS.ProcessEnv; passwordEnvVar?: string } = {},
): Promise<string | undefined> {
  const env = options.env ?? process.env;
  const envVar = options.passwordEnvVar ?? "FTC_WIFI_PASSWORD";
  const fromEnv = env[envVar];
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }
  const { secrets } = await loadSecretsFile(options.secretsPath);
  const blob = secrets.bySsid[ssid];
  if (!blob) {
    return undefined;
  }
  try {
    return decryptPassword(blob);
  } catch {
    return undefined;
  }
}

export async function clearWifiPassword(
  ssid: string,
  options: { secretsPath?: string } = {},
): Promise<void> {
  const { path: resolved, secrets } = await loadSecretsFile(options.secretsPath);
  if (!(ssid in secrets.bySsid)) {
    return;
  }
  delete secrets.bySsid[ssid];
  await fs.writeFile(resolved, `${JSON.stringify(secrets, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

/** Redact password-like values from a string for logging. */
export function redactSecrets(text: string, secrets: string[] = []): string {
  let out = text;
  for (const secret of secrets) {
    if (secret && secret.length > 0) {
      out = out.split(secret).join("***");
    }
  }
  return out.replace(/(password|passphrase|pwd)\s*[:=]\s*\S+/gi, "$1=***");
}

export { secretsPath as getWifiSecretsPath };
