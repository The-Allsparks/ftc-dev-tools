import type { AndroidDevice, ConnectionType } from "../types/device.js";
import type { PreferredConnection } from "../types/config.js";

export interface DeviceSelectionInput {
  devices: AndroidDevice[];
  explicitSerial?: string;
  preferredSerial?: string;
  /** Soft preference used only for automatic selection. Explicit/preferred serials win. */
  preferredConnection?: PreferredConnection;
}

export type DeviceSelectionResult =
  | { ok: true; device: AndroidDevice; reason: "explicit" | "preferred" | "only" }
  | {
      ok: false;
      code:
        | "NO_DEVICES"
        | "DEVICE_UNAUTHORIZED"
        | "DEVICE_OFFLINE"
        | "MULTIPLE_DEVICES"
        | "DEVICE_NOT_FOUND"
        | "NO_MATCHING_CONNECTION";
      message: string;
    };

/**
 * Never silently chooses among multiple online authorized devices.
 */
export function selectDeploymentDevice(input: DeviceSelectionInput): DeviceSelectionResult {
  const { devices, explicitSerial, preferredSerial, preferredConnection = "any" } = input;

  if (devices.length === 0) {
    return { ok: false, code: "NO_DEVICES", message: "No Android devices are connected." };
  }

  if (explicitSerial) {
    const match = devices.find((device) => device.serial === explicitSerial);
    if (!match) {
      return {
        ok: false,
        code: "DEVICE_NOT_FOUND",
        message: `No connected device with serial ${explicitSerial}.`,
      };
    }
    return validateUsable(match, "explicit");
  }

  if (preferredSerial) {
    const preferred = devices.find((device) => device.serial === preferredSerial);
    if (preferred) {
      return validateUsable(preferred, "preferred");
    }
  }

  const onlineAuthorized = devices.filter(
    (device) => device.state === "device" && device.authorization === "authorized",
  );

  if (onlineAuthorized.length === 0) {
    if (devices.some((device) => device.state === "unauthorized")) {
      return {
        ok: false,
        code: "DEVICE_UNAUTHORIZED",
        message: "Connected device(s) are unauthorized for USB debugging.",
      };
    }
    if (devices.some((device) => device.state === "offline")) {
      return {
        ok: false,
        code: "DEVICE_OFFLINE",
        message: "Connected device(s) are offline.",
      };
    }
    return { ok: false, code: "NO_DEVICES", message: "No usable Android devices are connected." };
  }

  const candidates = filterByPreferredConnection(onlineAuthorized, preferredConnection);

  if (candidates.length === 0) {
    const available = onlineAuthorized
      .map((device) => `${device.serial} (${device.connectionType})`)
      .join(", ");
    return {
      ok: false,
      code: "NO_MATCHING_CONNECTION",
      message: `No authorized ${preferredConnection} device found. Connected: ${available}. Use --device <serial> or change deployment.preferredConnection.`,
    };
  }

  if (candidates.length === 1) {
    return { ok: true, device: candidates[0]!, reason: "only" };
  }

  return {
    ok: false,
    code: "MULTIPLE_DEVICES",
    message:
      preferredConnection === "any"
        ? "Multiple Android devices are connected. Specify --device <serial>."
        : `Multiple ${preferredConnection} devices are connected. Specify --device <serial>.`,
  };
}

export function filterByPreferredConnection(
  devices: AndroidDevice[],
  preferredConnection: PreferredConnection = "any",
): AndroidDevice[] {
  if (preferredConnection === "any") {
    return devices;
  }
  const wanted: ConnectionType = preferredConnection;
  return devices.filter((device) => device.connectionType === wanted);
}

function validateUsable(
  device: AndroidDevice,
  reason: "explicit" | "preferred" | "only",
): DeviceSelectionResult {
  if (device.state === "unauthorized" || device.authorization === "unauthorized") {
    return {
      ok: false,
      code: "DEVICE_UNAUTHORIZED",
      message: `Device ${device.serial} is unauthorized.`,
    };
  }
  if (device.state === "offline") {
    return {
      ok: false,
      code: "DEVICE_OFFLINE",
      message: `Device ${device.serial} is offline.`,
    };
  }
  if (device.state !== "device") {
    return {
      ok: false,
      code: "NO_DEVICES",
      message: `Device ${device.serial} is not ready (state: ${device.state}).`,
    };
  }
  return { ok: true, device, reason };
}
