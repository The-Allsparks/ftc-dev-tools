import type { GoldenPathHardwareChecklistEntry } from "./types.js";

/**
 * Physical validation matrix for the core golden path.
 * Rows stay `pending` until a dated hardware test report supports promotion.
 */
export const GOLDEN_PATH_HARDWARE_CHECKLISTS: GoldenPathHardwareChecklistEntry[] = [
  {
    id: "win11-usb-install-doctor",
    label: "Windows 11 — clean install, doctor pass, extension activation",
    platform: "windows",
    connection: "any",
    status: "pending",
  },
  {
    id: "win11-usb-control-hub-first-deploy",
    label: "Windows 11 USB — first Control Hub build and deploy",
    platform: "windows",
    connection: "usb",
    device: "REV Control Hub",
    status: "pending",
  },
  {
    id: "win11-usb-control-hub-logs",
    label: "Windows 11 USB — TeamCode logcat capture after deploy",
    platform: "windows",
    connection: "usb",
    device: "REV Control Hub",
    status: "pending",
  },
  {
    id: "win11-usb-repeat-cycle",
    label: "Windows 11 USB — code change, incremental rebuild, redeploy",
    platform: "windows",
    connection: "usb",
    device: "REV Control Hub",
    status: "pending",
  },
  {
    id: "win11-usb-reboot-reconnect",
    label: "Windows 11 USB — Control Hub reboot and reconnect",
    platform: "windows",
    connection: "usb",
    device: "REV Control Hub",
    status: "pending",
  },
  {
    id: "win11-usb-adb-server-restart",
    label: "Windows 11 USB — ADB server restart recovery",
    platform: "windows",
    connection: "usb",
    device: "REV Control Hub",
    status: "pending",
  },
  {
    id: "win11-usb-disconnect-reconnect",
    label: "Windows 11 USB — cable disconnect and reconnect",
    platform: "windows",
    connection: "usb",
    device: "REV Control Hub",
    status: "pending",
  },
  {
    id: "win11-ide-restart",
    label: "Windows 11 — IDE restart with same project",
    platform: "windows",
    connection: "any",
    status: "pending",
  },
  {
    id: "win11-cli-extension-same-project",
    label: "Windows 11 — CLI and extension used in same project session",
    platform: "windows",
    connection: "usb",
    device: "REV Control Hub",
    status: "pending",
  },
  {
    id: "any-multi-device-refusal",
    label: "Multiple connected Android devices — explicit selection required",
    platform: "any",
    connection: "any",
    status: "pending",
  },
  {
    id: "any-driver-station-opmode",
    label: "Driver Station OpMode start after deploy",
    platform: "any",
    connection: "usb",
    device: "REV Control Hub + Driver Station phone/tablet",
    status: "pending",
  },
  {
    id: "any-diagnostic-bundle-failure",
    label: "Failed golden-path attempt produces redacted diagnostic bundle",
    platform: "any",
    connection: "any",
    status: "pending",
  },
];

export function getGoldenPathHardwareChecklists(): GoldenPathHardwareChecklistEntry[] {
  return GOLDEN_PATH_HARDWARE_CHECKLISTS.map((entry) => ({ ...entry }));
}

export function getPassedGoldenPathChecklistIds(
  checklists: ReadonlyArray<GoldenPathHardwareChecklistEntry>,
): Set<string> {
  return new Set(checklists.filter((entry) => entry.status === "pass").map((entry) => entry.id));
}
