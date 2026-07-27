export type PreferredConnection = "usb" | "wifi" | "any";
export type DefaultLogFilter = "all" | "teamcode" | "errors" | "raw";

export interface FtcDevDeploymentConfig {
  preferredConnection?: PreferredConnection;
  /** Machine-local preference; avoid committing real serials when sharing the repo. */
  preferredDeviceSerial?: string;
}

export interface FtcDevLogsConfig {
  defaultFilter?: DefaultLogFilter;
}

export interface FtcDevConfig {
  $schema?: string;
  teamNumber?: number;
  module?: string;
  deployment?: FtcDevDeploymentConfig;
  logs?: FtcDevLogsConfig;
}

export interface ConfigLoadResult {
  config: FtcDevConfig;
  path?: string;
  warnings: string[];
  errors: string[];
}
