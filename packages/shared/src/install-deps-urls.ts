/** Public GitHub URLs for JDK/SDK install scripts (VSIX-only users; no repo clone). */

export const FTC_DEV_TOOLS_GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/The-Allsparks/ftc-dev-tools/main";

export const INSTALL_WITHOUT_ANDROID_STUDIO_DOCS_URL =
  "https://github.com/The-Allsparks/ftc-dev-tools/blob/main/docs/install-without-android-studio.md";

export const INSTALL_DEPS_ANDROID_CMDLINE_TOOLS_JSON_RAW_URL = `${FTC_DEV_TOOLS_GITHUB_RAW_BASE}/scripts/android-cmdline-tools.json`;

export const INSTALL_DEPS_WINDOWS_PS1_RAW_URL = `${FTC_DEV_TOOLS_GITHUB_RAW_BASE}/scripts/install-deps-windows.ps1`;
export const INSTALL_DEPS_MACOS_SH_RAW_URL = `${FTC_DEV_TOOLS_GITHUB_RAW_BASE}/scripts/install-deps-macos.sh`;
export const INSTALL_DEPS_LINUX_SH_RAW_URL = `${FTC_DEV_TOOLS_GITHUB_RAW_BASE}/scripts/install-deps-linux.sh`;

export type InstallDepsOs = "windows" | "macos" | "linux";

/** Copy-ready command: downloads script + manifest into one folder, then runs the installer. */
export function buildInstallDepsCommand(os: InstallDepsOs): string {
  switch (os) {
    case "windows":
      return [
        '$dir = Join-Path $env:TEMP "ftc-dev-tools-install-deps"',
        "New-Item -ItemType Directory -Force -Path $dir | Out-Null",
        `Invoke-WebRequest -Uri "${INSTALL_DEPS_WINDOWS_PS1_RAW_URL}" -OutFile (Join-Path $dir "install-deps-windows.ps1")`,
        `Invoke-WebRequest -Uri "${INSTALL_DEPS_ANDROID_CMDLINE_TOOLS_JSON_RAW_URL}" -OutFile (Join-Path $dir "android-cmdline-tools.json")`,
        'powershell -ExecutionPolicy Bypass -File (Join-Path $dir "install-deps-windows.ps1")',
      ].join("; ");
    case "macos":
      return [
        'dir="$(mktemp -d)"',
        `curl -fsSL -o "$dir/install-deps-macos.sh" "${INSTALL_DEPS_MACOS_SH_RAW_URL}"`,
        `curl -fsSL -o "$dir/android-cmdline-tools.json" "${INSTALL_DEPS_ANDROID_CMDLINE_TOOLS_JSON_RAW_URL}"`,
        'bash "$dir/install-deps-macos.sh"',
      ].join(" && ");
    case "linux":
      return [
        'dir="$(mktemp -d)"',
        `curl -fsSL -o "$dir/install-deps-linux.sh" "${INSTALL_DEPS_LINUX_SH_RAW_URL}"`,
        `curl -fsSL -o "$dir/android-cmdline-tools.json" "${INSTALL_DEPS_ANDROID_CMDLINE_TOOLS_JSON_RAW_URL}"`,
        'bash "$dir/install-deps-linux.sh"',
      ].join(" && ");
  }
}

/** npm install-deps scripts when working from a cloned ftc-dev-tools repo root. */
export const INSTALL_DEPS_CONTRIBUTOR_COMMANDS: Record<InstallDepsOs, string> = {
  windows: "npm run install-deps:windows",
  macos: "npm run install-deps:macos",
  linux: "npm run install-deps:linux",
};
