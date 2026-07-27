export type DeviceAuthorization = "authorized" | "unauthorized" | "unknown";
export type DeviceOnlineState = "device" | "offline" | "unauthorized" | "other";
export type ConnectionType = "usb" | "wifi" | "unknown";
export type ControlHubLikelihood = "probable" | "unlikely" | "unknown";

export interface AndroidDevice {
  serial: string;
  state: DeviceOnlineState;
  authorization: DeviceAuthorization;
  model?: string;
  manufacturer?: string;
  product?: string;
  connectionType: ConnectionType;
  /** Probable REV Control Hub based on properties; never guaranteed. */
  controlHubLikelihood: ControlHubLikelihood;
  rawProperties: Record<string, string>;
}

export interface LogOptions {
  filter?: "all" | "teamcode" | "errors" | "raw";
  clearBefore?: boolean;
  /** When aborted, log streaming should stop and release the adb process. */
  signal?: AbortSignal;
}

export interface LogEntry {
  timestamp?: string;
  pid?: string;
  tid?: string;
  level: string;
  tag: string;
  message: string;
  raw: string;
}

export interface DeviceProvider {
  listDevices(): Promise<AndroidDevice[]>;
  installApk(device: AndroidDevice, apkPath: string): Promise<void>;
  launchApp(device: AndroidDevice, applicationId: string): Promise<void>;
  streamLogs(device: AndroidDevice, options?: LogOptions): AsyncIterable<LogEntry>;
}
