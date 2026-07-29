import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { getWifiPreferencePath } from "../wifi/interface-preference.js";

const SERVICE = "ftc-dev-tools-github-report";

function secretsDir(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  home: string = os.homedir(),
): string {
  return path.dirname(getWifiPreferencePath(platform, env, home));
}

export function githubReportTokenPath(
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  home: string = os.homedir(),
): string {
  return path.join(secretsDir(platform, env, home), "github-report-token.enc");
}

function machineKey(): Buffer {
  const material = `${os.hostname()}|${os.userInfo().username}|${SERVICE}|ftc-github-v1`;
  return crypto.createHash("sha256").update(material).digest();
}

function encryptToken(token: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", machineKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

function decryptToken(blob: string): string {
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", machineKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export async function storeGitHubReportToken(
  token: string,
  options: { tokenPath?: string } = {},
): Promise<void> {
  const trimmed = token.trim();
  if (!trimmed) {
    throw Object.assign(new Error("GitHub token is required."), { code: "GITHUB_LINK_FAILED" });
  }
  const filePath = options.tokenPath ?? githubReportTokenPath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${encryptToken(trimmed)}\n`, { mode: 0o600 });
}

export async function loadGitHubReportToken(
  options: { tokenPath?: string } = {},
): Promise<string | undefined> {
  const filePath = options.tokenPath ?? githubReportTokenPath();
  try {
    const text = (await fs.readFile(filePath, "utf8")).trim();
    if (!text) {
      return undefined;
    }
    return decryptToken(text);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

export async function clearGitHubReportToken(
  options: { tokenPath?: string } = {},
): Promise<void> {
  const filePath = options.tokenPath ?? githubReportTokenPath();
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

/** Token from env (CI) or encrypted local store (CLI link). */
export async function resolveGitHubReportToken(): Promise<string | undefined> {
  const fromEnv = process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  return loadGitHubReportToken();
}

export function isAutoErrorReportEnabled(): boolean {
  const raw = process.env.FTC_AUTO_ERROR_REPORT?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}
