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

export interface FtcDevLimelightConfig {
  host?: string;
  pipelineDirectory?: string;
}

export interface FtcDevDashboardConfig {
  /** Full dashboard URL or hostname (defaults to http://host:8080/dash). */
  url?: string;
}

export interface FtcDevVisionConfig {
  defaultProviderId?: string;
  enabledProviderIds?: string[];
  pipelineDirectory?: string;
  limelight?: FtcDevLimelightConfig;
  dashboard?: FtcDevDashboardConfig;
}

export interface FtcDevConfig {
  $schema?: string;
  teamNumber?: number;
  module?: string;
  deployment?: FtcDevDeploymentConfig;
  logs?: FtcDevLogsConfig;
  vision?: FtcDevVisionConfig;
}

export interface ConfigLoadResult {
  config: FtcDevConfig;
  path?: string;
  warnings: string[];
  errors: string[];
}
