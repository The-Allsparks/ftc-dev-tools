import fs from "node:fs/promises";
import path from "node:path";
import { interpretFromUnknown } from "../errors/interpret.js";
import type { FetchLike } from "../sdk/types.js";
import type { DeviceProvider } from "../types/device.js";
import type { ProcessRunner } from "../types/process.js";
import { DEFAULT_ROBOT_CONSOLE_URL } from "../wifi/defaults.js";
import { openRobotConsole } from "../wifi/open-console.js";
import { selectDeploymentDevice } from "../devices/selection.js";
import {
  DEFAULT_HUB_OS_UPLOAD_FIELD_NAMES,
  HUB_OS_UPLOAD_POST_CANDIDATES,
} from "./defaults.js";
import { downloadHubOsUpdate } from "./download.js";
import { getHubStatus } from "./status.js";
import type { HubApplyMode, HubApplyResult, HubOsRelease } from "./types.js";

export interface ApplyHubOsUpdateOptions {
  runner: ProcessRunner;
  deviceProvider?: DeviceProvider;
  deviceSerial?: string;
  consoleUrl?: string;
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
  /** Local zip path; if omitted, download latest (or --version) first. */
  filePath?: string;
  version?: string;
  cacheDir?: string;
  dryRun?: boolean;
  yes?: boolean;
  /** Required when the selected device is wifi adb (serial contains ':'). */
  allowWifiAdb?: boolean;
  /**
   * When true, attempt multipart upload to RC Console candidates.
   * Default is guided apply (open Manage page + print file path).
   */
  attemptUpload?: boolean;
  openConsole?: boolean;
  platform?: NodeJS.Platform;
}

export async function applyHubOsUpdate(
  options: ApplyHubOsUpdateOptions,
): Promise<HubApplyResult> {
  const planLines: string[] = [];
  const mode: HubApplyMode = options.attemptUpload ? "upload-attempt" : "guided";
  const consoleUrl = (options.consoleUrl ?? DEFAULT_ROBOT_CONSOLE_URL).replace(/\/$/, "");
  const manageUrl = `${consoleUrl}/manage`;

  try {
    if (options.deviceProvider) {
      const devices = await options.deviceProvider.listDevices();
      const selection = selectDeploymentDevice({
        devices,
        explicitSerial: options.deviceSerial,
      });
      if (
        selection.ok &&
        selection.device.serial.includes(":") &&
        !options.allowWifiAdb
      ) {
        return {
          success: false,
          dryRun: options.dryRun === true,
          mode,
          attemptedEndpoints: [],
          openedConsole: false,
          planLines: [
            "Selected device uses Wi-Fi adb. Prefer USB for OS updates.",
            "Re-run with --allow-wifi-adb only if you accept the risk of disconnect during reboot.",
          ],
          message: "Refusing Control Hub OS apply over Wi-Fi adb without --allow-wifi-adb.",
          error: interpretFromUnknown(
            Object.assign(new Error("Wi-Fi adb apply requires --allow-wifi-adb."), {
              code: "HUB_UPDATE_WIFI_ADB_BLOCKED",
            }),
          ),
        };
      }
    }

    const status = await getHubStatus({
      runner: options.runner,
      deviceProvider: options.deviceProvider,
      deviceSerial: options.deviceSerial,
      consoleUrl,
      fetchImpl: options.fetchImpl,
      signal: options.signal,
    });

    if (status.device?.connection === "wifi-adb" && !options.allowWifiAdb) {
      return {
        success: false,
        dryRun: options.dryRun === true,
        mode,
        attemptedEndpoints: [],
        openedConsole: false,
        planLines: [
          "Selected device uses Wi-Fi adb. Prefer USB for OS updates.",
          "Re-run with --allow-wifi-adb only if you accept the risk of disconnect during reboot.",
        ],
        message: "Refusing Control Hub OS apply over Wi-Fi adb without --allow-wifi-adb.",
        error: interpretFromUnknown(
          Object.assign(new Error("Wi-Fi adb apply requires --allow-wifi-adb."), {
            code: "HUB_UPDATE_WIFI_ADB_BLOCKED",
          }),
        ),
      };
    }

    let filePath = options.filePath;
    let release: HubOsRelease | undefined;

    if (!filePath) {
      planLines.push(
        options.version
          ? `Download Control Hub OS ${options.version} into the local cache (if not already present).`
          : "Download latest Control Hub OS into the local cache (if not already present).",
      );
      if (!options.dryRun && options.yes) {
        const downloaded = await downloadHubOsUpdate({
          fetchImpl: options.fetchImpl,
          signal: options.signal,
          version: options.version,
          cacheDir: options.cacheDir,
          yes: true,
        });
        if (!downloaded.success || !downloaded.filePath) {
          return {
            success: false,
            dryRun: false,
            mode,
            release: downloaded.release,
            attemptedEndpoints: [],
            openedConsole: false,
            planLines,
            message: downloaded.message,
            error: downloaded.error,
          };
        }
        filePath = downloaded.filePath;
        release = downloaded.release;
        planLines.push(downloaded.message);
      } else {
        planLines.push("(Download skipped in dry-run / until --yes.)");
      }
    } else {
      planLines.push(`Use local OS package: ${filePath}`);
    }

    planLines.push("Keep 12V robot power connected for the entire update (~5 minutes).");
    planLines.push("Do not interrupt power while the hub reboots.");
    if (mode === "guided") {
      planLines.push(`Open Manage page: ${manageUrl}`);
      planLines.push('Use "Select Update File" → choose the zip → "Update & Reboot".');
      planLines.push("Do not extract/unzip the OS package.");
    } else {
      planLines.push("Attempt multipart upload to known RC Console OS update endpoints.");
      planLines.push("If upload is unsupported, fall back to opening the Manage page.");
    }

    if (options.dryRun) {
      return {
        success: true,
        dryRun: true,
        mode,
        filePath,
        release,
        attemptedEndpoints: [],
        openedConsole: false,
        planLines,
        message: "Dry run: Control Hub OS apply plan ready (no changes made).",
      };
    }

    if (!options.yes) {
      return {
        success: false,
        dryRun: true,
        mode,
        filePath,
        release,
        attemptedEndpoints: [],
        openedConsole: false,
        planLines,
        message:
          "Refusing to apply Control Hub OS update without --yes. Re-run with --dry-run to preview or --yes to proceed.",
        error: interpretFromUnknown(
          Object.assign(new Error("Hub OS apply requires --yes."), {
            code: "HUB_UPDATE_ABORTED",
          }),
        ),
      };
    }

    if (!filePath) {
      return {
        success: false,
        dryRun: false,
        mode,
        attemptedEndpoints: [],
        openedConsole: false,
        planLines,
        message: "No OS package file path available.",
        error: interpretFromUnknown(
          Object.assign(new Error("Missing OS package path."), {
            code: "HUB_UPDATE_FILE_MISSING",
          }),
        ),
      };
    }

    await fs.access(filePath);

    if (mode === "upload-attempt") {
      const upload = await attemptOsUpload({
        baseUrl: consoleUrl,
        filePath,
        fetchImpl: options.fetchImpl,
        signal: options.signal,
      });
      if (upload.success) {
        return {
          success: true,
          dryRun: false,
          mode,
          filePath,
          release,
          attemptedEndpoints: upload.attemptedEndpoints,
          openedConsole: false,
          planLines: [...planLines, ...upload.notes],
          message: upload.message,
        };
      }

      planLines.push(...upload.notes);
      const opened = await maybeOpenConsole(options, manageUrl);
      return {
        success: false,
        dryRun: false,
        mode,
        filePath,
        release,
        attemptedEndpoints: upload.attemptedEndpoints,
        openedConsole: opened,
        planLines,
        message: `${upload.message} Opened Manage page guidance with package at ${filePath}.`,
        error: interpretFromUnknown(
          Object.assign(new Error("Automated OS upload unsupported on this RC build."), {
            code: "HUB_UPDATE_APPLY_UNSUPPORTED",
            technicalDetails: upload.notes.join("\n"),
          }),
        ),
      };
    }

    // Guided apply (default)
    const opened = await maybeOpenConsole(options, manageUrl);
    return {
      success: true,
      dryRun: false,
      mode: "guided",
      filePath,
      release,
      attemptedEndpoints: [],
      openedConsole: opened,
      planLines,
      message: opened
        ? `Opened Manage page. Select Update File and choose:\n  ${filePath}`
        : `Open ${manageUrl}, Select Update File, and choose:\n  ${filePath}`,
    };
  } catch (error) {
    return {
      success: false,
      dryRun: options.dryRun === true,
      mode,
      attemptedEndpoints: [],
      openedConsole: false,
      planLines,
      message: "Failed to apply Control Hub OS update.",
      error: interpretFromUnknown(error),
    };
  }
}

async function maybeOpenConsole(
  options: ApplyHubOsUpdateOptions,
  manageUrl: string,
): Promise<boolean> {
  if (options.openConsole === false) {
    return false;
  }
  const result = await openRobotConsole(
    options.runner,
    manageUrl,
    options.platform ?? process.platform,
  );
  return result.opened;
}

async function attemptOsUpload(options: {
  baseUrl: string;
  filePath: string;
  fetchImpl?: FetchLike;
  signal?: AbortSignal;
}): Promise<{
  success: boolean;
  attemptedEndpoints: string[];
  message: string;
  notes: string[];
}> {
  const fetchImpl = options.fetchImpl ?? (globalThis.fetch as FetchLike);
  const attemptedEndpoints: string[] = [];
  const notes: string[] = [];
  if (!fetchImpl) {
    return {
      success: false,
      attemptedEndpoints,
      message: "fetch is not available for upload.",
      notes,
    };
  }

  const fileBytes = await fs.readFile(options.filePath);
  const filename = path.basename(options.filePath);

  for (const route of HUB_OS_UPLOAD_POST_CANDIDATES) {
    const endpoint = `${options.baseUrl}${route}`;
    for (const field of DEFAULT_HUB_OS_UPLOAD_FIELD_NAMES) {
      attemptedEndpoints.push(`${endpoint} (field=${field})`);
      try {
        const { body, contentType } = buildMultipart(field, filename, fileBytes);
        const response = await fetchImpl(endpoint, {
          method: "POST",
          headers: { "Content-Type": contentType },
          body,
          signal: options.signal,
        });
        const text = await response.text();
        notes.push(`${endpoint} field=${field} → HTTP ${response.status}`);
        if (
          response.ok ||
          /update|reboot|success|verification succeeded/i.test(text)
        ) {
          return {
            success: true,
            attemptedEndpoints,
            message: `Uploaded OS package via ${endpoint}. Keep the hub powered while it reboots.`,
            notes,
          };
        }
      } catch (error) {
        notes.push(
          `${endpoint} field=${field} → ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  return {
    success: false,
    attemptedEndpoints,
    message: "No known RC Console OS upload endpoint accepted the package.",
    notes,
  };
}

function buildMultipart(
  fieldName: string,
  filename: string,
  fileBytes: Buffer,
): { body: Buffer; contentType: string } {
  const boundary = `----ftcHubOs${Date.now().toString(16)}`;
  const header = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${filename}"\r\nContent-Type: application/zip\r\n\r\n`,
    "utf8",
  );
  const footer = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  return {
    body: Buffer.concat([header, fileBytes, footer]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}
