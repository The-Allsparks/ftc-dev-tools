/** Public GitHub URLs for JDK/SDK install scripts (VSIX-only users; no repo clone). */

import { REQUIRED_JDK_MAJOR } from "./constants.js";

export const FTC_DEV_TOOLS_GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/The-Allsparks/ftc-dev-tools/main";

export const INSTALL_WITHOUT_ANDROID_STUDIO_DOCS_URL =
  "https://github.com/The-Allsparks/ftc-dev-tools/blob/main/docs/install-without-android-studio.md";

export const INSTALL_DEPS_ANDROID_CMDLINE_TOOLS_JSON_RAW_URL = `${FTC_DEV_TOOLS_GITHUB_RAW_BASE}/scripts/android-cmdline-tools.json`;

export const INSTALL_DEPS_WINDOWS_PS1_RAW_URL = `${FTC_DEV_TOOLS_GITHUB_RAW_BASE}/scripts/install-deps-windows.ps1`;
export const INSTALL_DEPS_MACOS_SH_RAW_URL = `${FTC_DEV_TOOLS_GITHUB_RAW_BASE}/scripts/install-deps-macos.sh`;
export const INSTALL_DEPS_LINUX_SH_RAW_URL = `${FTC_DEV_TOOLS_GITHUB_RAW_BASE}/scripts/install-deps-linux.sh`;

export type InstallDepsOs = "windows" | "macos" | "linux";

export interface BuildInstallDepsOptions {
  skipJdk?: boolean;
  skipSdk?: boolean;
}

export function installDepsOsForPlatform(platform: NodeJS.Platform): InstallDepsOs | undefined {
  if (platform === "win32") {
    return "windows";
  }
  if (platform === "darwin") {
    return "macos";
  }
  if (platform === "linux") {
    return "linux";
  }
  return undefined;
}

function unixInstallEnvPrefix(options?: BuildInstallDepsOptions): string {
  const parts: string[] = [];
  if (options?.skipJdk) {
    parts.push("SKIP_JDK=1");
  }
  if (options?.skipSdk) {
    parts.push("SKIP_SDK=1");
  }
  return parts.length > 0 ? `${parts.join(" ")} ` : "";
}

/** curl.exe flags for large/binary downloads (Windows 10+ includes curl). */
const WINDOWS_CURL_DOWNLOAD = "curl.exe -fSL --retry 5 --retry-all-errors --connect-timeout 30";

function windowsInstallScriptInvocation(options?: BuildInstallDepsOptions): string {
  const flags: string[] = [];
  if (options?.skipJdk) {
    flags.push("-SkipJdk");
  }
  if (options?.skipSdk) {
    flags.push("-SkipSdk");
  }
  const suffix = flags.length > 0 ? ` ${flags.join(" ")}` : "";
  return `powershell -ExecutionPolicy Bypass -File (Join-Path $dir "install-deps-windows.ps1")${suffix}`;
}

/** Copy-ready command: downloads script + manifest into one folder, then runs the installer. */
export function buildInstallDepsCommand(
  os: InstallDepsOs,
  options?: BuildInstallDepsOptions,
): string {
  switch (os) {
    case "windows":
      return [
        '$dir = Join-Path $env:TEMP "ftc-dev-tools-install-deps"',
        "New-Item -ItemType Directory -Force -Path $dir | Out-Null",
        `${WINDOWS_CURL_DOWNLOAD} -o (Join-Path $dir "install-deps-windows.ps1") "${INSTALL_DEPS_WINDOWS_PS1_RAW_URL}"`,
        `${WINDOWS_CURL_DOWNLOAD} -o (Join-Path $dir "android-cmdline-tools.json") "${INSTALL_DEPS_ANDROID_CMDLINE_TOOLS_JSON_RAW_URL}"`,
        windowsInstallScriptInvocation(options),
      ].join("; ");
    case "macos":
      return [
        'dir="$(mktemp -d)"',
        `curl -fSL --retry 5 --retry-all-errors --connect-timeout 30 -o "$dir/install-deps-macos.sh" "${INSTALL_DEPS_MACOS_SH_RAW_URL}"`,
        `curl -fSL --retry 5 --retry-all-errors --connect-timeout 30 -o "$dir/android-cmdline-tools.json" "${INSTALL_DEPS_ANDROID_CMDLINE_TOOLS_JSON_RAW_URL}"`,
        `${unixInstallEnvPrefix(options)}bash "$dir/install-deps-macos.sh"`,
      ].join(" && ");
    case "linux":
      return [
        'dir="$(mktemp -d)"',
        `curl -fSL --retry 5 --retry-all-errors --connect-timeout 30 -o "$dir/install-deps-linux.sh" "${INSTALL_DEPS_LINUX_SH_RAW_URL}"`,
        `curl -fSL --retry 5 --retry-all-errors --connect-timeout 30 -o "$dir/android-cmdline-tools.json" "${INSTALL_DEPS_ANDROID_CMDLINE_TOOLS_JSON_RAW_URL}"`,
        `${unixInstallEnvPrefix(options)}bash "$dir/install-deps-linux.sh"`,
      ].join(" && ");
  }
}

/** Plain-language summary for install-deps consent modals (extension UI). */
export function describeInstallDepsConsentMessage(
  os: InstallDepsOs,
  options: BuildInstallDepsOptions = {},
): string {
  const skipJdk = options.skipJdk === true;
  const skipSdk = options.skipSdk === true;

  const jdkLine = skipJdk
    ? "JDK: skipped (you chose not to install Java)."
    : `JDK: Eclipse Temurin JDK ${REQUIRED_JDK_MAJOR} (via the trusted install-deps script).`;

  const sdkDefaultRoot =
    os === "windows"
      ? "%LOCALAPPDATA%\\Android\\Sdk"
      : os === "macos"
        ? "~/Library/Android/sdk"
        : "~/Android/Sdk";

  const sdkLine = skipSdk
    ? "Android SDK: skipped (you chose not to install adb/SDK packages)."
    : `Android SDK: command-line tools, platform-tools (adb), Android 34 platform, and build-tools under ${sdkDefaultRoot}.`;

  const envLine =
    skipJdk && skipSdk
      ? "Environment: no PATH or ANDROID_HOME changes (both JDK and SDK steps skipped)."
      : "Environment: updates your user PATH and sets ANDROID_HOME when JDK and/or SDK are installed.";

  const downloadLine =
    "The extension will download the official install-deps script and android-cmdline-tools.json from GitHub, then run the installer in an integrated terminal.";

  return [jdkLine, sdkLine, envLine, downloadLine].join("\n\n");
}

/** npm install-deps scripts when working from a cloned ftc-dev-tools repo root. */
export const INSTALL_DEPS_CONTRIBUTOR_COMMANDS: Record<InstallDepsOs, string> = {
  windows: "npm run install-deps:windows",
  macos: "npm run install-deps:macos",
  linux: "npm run install-deps:linux",
};
