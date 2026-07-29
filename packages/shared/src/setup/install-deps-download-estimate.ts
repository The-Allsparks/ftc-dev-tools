import {
  INSTALL_DEPS_ANDROID_CMDLINE_TOOLS_JSON_RAW_URL,
  type BuildInstallDepsOptions,
  type InstallDepsOs,
} from "../install-deps-urls.js";

const CMDLINE_URL: Record<InstallDepsOs, string> = {
  windows: "https://dl.google.com/android/repository/commandlinetools-win-15859902_latest.zip",
  macos: "https://dl.google.com/android/repository/commandlinetools-mac_arm64-15859902_latest.zip",
  linux: "https://dl.google.com/android/repository/commandlinetools-linux-15859902_latest.zip",
};

const SDK_EXTRA_BYTES = 135 * 1024 * 1024;
const JDK_BYTES = 175 * 1024 * 1024;
const POST_JDK_SEC = 120;
const POST_SDK_SEC = 240;

export interface InstallDepsTimeEstimate {
  totalDownloadBytes: number;
  estimatedTotalSeconds: number;
  summaryLine: string;
}

export type MacPackageArch = "arm64" | "x64";

export function macPackageArchFromNode(nodeProcess: NodeJS.Process = process): MacPackageArch {
  return nodeProcess.arch === "arm64" ? "arm64" : "x64";
}

function cmdlineUrl(os: InstallDepsOs, macArch: MacPackageArch): string {
  if (os === "macos" && macArch === "x64") {
    return "https://dl.google.com/android/repository/commandlinetools-mac_x86_64-15859902_latest.zip";
  }
  return CMDLINE_URL[os];
}

export function formatDurationRange(totalSeconds: number): string {
  const mid = totalSeconds / 60;
  if (mid < 2) {
    return "about 1–2 minutes";
  }
  const low = Math.max(2, Math.round(mid * 0.75));
  const high = Math.max(low + 1, Math.round(mid * 1.35));
  return low >= 60 ? "more than an hour" : `about ${low}–${high} minutes`;
}

export async function estimateInstallDepsSetupTime(
  os: InstallDepsOs,
  options: BuildInstallDepsOptions = {},
  macArch: MacPackageArch = "x64",
): Promise<InstallDepsTimeEstimate> {
  let total = 0;
  let post = 0;
  if (options.skipJdk !== true) {
    total += JDK_BYTES;
    post += POST_JDK_SEC;
  }
  if (options.skipSdk !== true) {
    total += 127 * 1024 * 1024 + SDK_EXTRA_BYTES;
    post += POST_SDK_SEC;
  }

  let bps = 3.125 * 1024 * 1024;
  if (options.skipSdk !== true) {
    const probe = await probeDownloadSpeed(cmdlineUrl(os, macArch));
    if (probe) {
      bps = probe;
    } else {
      const fallback = await probeDownloadSpeed(INSTALL_DEPS_ANDROID_CMDLINE_TOOLS_JSON_RAW_URL);
      if (fallback) {
        bps = fallback;
      }
    }
  }

  const downloadSec = total / bps;
  const estimatedTotalSeconds = downloadSec + post;
  const mb = Math.round(total / (1024 * 1024));
  const summaryLine = `${formatDurationRange(estimatedTotalSeconds)} (≈${mb} MB to download).`;
  return { totalDownloadBytes: total, estimatedTotalSeconds, summaryLine };
}

async function probeDownloadSpeed(url: string): Promise<number | undefined> {
  try {
    const start = performance.now();
    const res = await fetch(url, {
      headers: { Range: "bytes=0-131071" },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.status !== 206 && res.status !== 200) {
      return undefined;
    }
    const buf = await res.arrayBuffer();
    const sec = (performance.now() - start) / 1000;
    if (sec < 0.05 || buf.byteLength === 0) {
      return undefined;
    }
    return buf.byteLength / sec;
  } catch {
    return undefined;
  }
}
