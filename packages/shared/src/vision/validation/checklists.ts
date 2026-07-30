import type { VisionHardwareChecklistEntry } from "./types.js";

/** Physical validation matrix rows — all pending until maintainer checklists pass (VISION-17). */
export const VISION_HARDWARE_CHECKLISTS: VisionHardwareChecklistEntry[] = [
  {
    id: "win-usb-control-hub-limelight",
    label: "Windows USB ADB — Control Hub + Limelight 3A HTTP",
    platform: "windows",
    connection: "usb",
    device: "REV Control Hub + Limelight 3A",
    status: "pending",
  },
  {
    id: "win-wifi-control-hub-limelight",
    label: "Windows Wi-Fi ADB — Control Hub + Limelight 3A",
    platform: "windows",
    connection: "wifi-adb",
    device: "REV Control Hub + Limelight 3A",
    status: "pending",
  },
  {
    id: "win-dual-nic-limelight",
    label: "Windows dual-NIC — Limelight on robot radio subnet",
    platform: "windows",
    connection: "dual-nic",
    device: "Limelight 3A",
    status: "pending",
  },
  {
    id: "win-usb-visionportal-webcam",
    label: "Windows USB — VisionPortal UVC webcam on Control Hub",
    platform: "windows",
    connection: "usb",
    device: "REV Control Hub + UVC webcam",
    status: "pending",
  },
  {
    id: "mac-usb-control-hub-limelight",
    label: "macOS USB ADB — Control Hub + Limelight 3A",
    platform: "macos",
    connection: "usb",
    device: "REV Control Hub + Limelight 3A",
    status: "pending",
  },
  {
    id: "mac-wifi-control-hub-dashboard",
    label: "macOS Wi-Fi ADB — FTC Dashboard stream",
    platform: "macos",
    connection: "wifi-adb",
    device: "REV Control Hub",
    status: "pending",
  },
  {
    id: "linux-usb-control-hub-limelight",
    label: "Linux USB ADB — Control Hub + Limelight 3A",
    platform: "linux",
    connection: "usb",
    device: "REV Control Hub + Limelight 3A",
    status: "pending",
  },
  {
    id: "linux-wifi-easyopencv",
    label: "Linux Wi-Fi ADB — EasyOpenCV webcam pipeline",
    platform: "linux",
    connection: "wifi-adb",
    device: "REV Control Hub + UVC webcam",
    status: "pending",
  },
  {
    id: "any-disconnect-recovery",
    label: "Disconnect handling — Limelight / ADB drop and recovery",
    platform: "any",
    connection: "any",
    status: "pending",
  },
  {
    id: "any-multi-device-selection",
    label: "Multi-device / multi-camera explicit selection (no auto-pick)",
    platform: "any",
    connection: "any",
    status: "pending",
  },
  {
    id: "any-malformed-artifacts",
    label: "Malformed pipeline JSON and corrupt session files on hardware",
    platform: "any",
    connection: "any",
    status: "pending",
  },
  {
    id: "any-long-replay-low-disk",
    label: "Long replay session and low-disk failure behavior",
    platform: "any",
    connection: "any",
    status: "pending",
    blockedReason: "Live capture deferred — schema-only foundation (VISION-13).",
  },
];

export function getVisionHardwareChecklists(): VisionHardwareChecklistEntry[] {
  return VISION_HARDWARE_CHECKLISTS.map((entry) => ({ ...entry }));
}

export function getPassedHardwareChecklistIds(
  checklists: ReadonlyArray<VisionHardwareChecklistEntry>,
): Set<string> {
  return new Set(checklists.filter((entry) => entry.status === "pass").map((entry) => entry.id));
}
