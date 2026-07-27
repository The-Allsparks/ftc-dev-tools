import type { FriendlyError } from "../types/errors.js";
import type { FetchLike } from "../sdk/types.js";

export type InterfaceState = "up" | "down" | "unknown";

export interface NetworkInterfaceInfo {
  name: string;
  index?: number;
  /** Interface metric when known (lower = preferred for general routing). */
  metric?: number;
  state: InterfaceState;
  ipv4Addresses: string[];
  description?: string;
}

export interface InterfaceMetricChange {
  name: string;
  index?: number;
  previousMetric?: number;
  nextMetric: number;
}

export interface PreferInterfaceResult {
  success: boolean;
  dryRun: boolean;
  role: "internet" | "robot";
  targetInterface: string;
  changes: InterfaceMetricChange[];
  routeEnsured?: boolean;
  message: string;
  planLines: string[];
  error?: FriendlyError;
}

export interface AdapterControlResult {
  success: boolean;
  dryRun: boolean;
  action: "enable" | "disable";
  interfaceName: string;
  message: string;
  planLines: string[];
  error?: FriendlyError;
}

export interface RobotInterfacePreference {
  name: string;
  index?: number;
  selectedAt: string;
}

export interface ManagedRouteRecord {
  destination: string;
  interfaceName?: string;
  interfaceIndex?: number;
  addedAt: string;
}

export interface WifiPreferenceFile {
  robotNetworkInterface?: RobotInterfacePreference;
  managedRoutes?: ManagedRouteRecord[];
  /** Last joined or remembered hub SSID only — never a password. */
  rememberedSsid?: string;
}

export interface HubWifiSettings {
  ssid?: string;
  /** Present only when returned by the console; never logged by helpers. */
  password?: string;
  band?: string;
  channel?: string;
  sourceUrl: string;
  rawHints: string[];
}

export interface HubWifiManageGetResult {
  success: boolean;
  settings?: HubWifiSettings;
  /** Redacted view safe for JSON/logs (password replaced). */
  publicSettings?: Omit<HubWifiSettings, "password"> & { passwordSet: boolean };
  message: string;
  error?: FriendlyError;
}

export interface HubWifiManageSetInput {
  ssid?: string;
  password?: string;
  band?: string;
  channel?: string;
}

export interface HubWifiManageSetResult {
  success: boolean;
  dryRun: boolean;
  attemptedEndpoints: string[];
  message: string;
  error?: FriendlyError;
}

export interface WifiJoinResult {
  success: boolean;
  ssid: string;
  interfaceName?: string;
  message: string;
  error?: FriendlyError;
}

export interface ConsoleProbeResult {
  url: string;
  reachable: boolean;
  statusCode?: number;
  message: string;
}

export interface RoutePlan {
  destination: string;
  network: string;
  mask: string;
  interfaceName?: string;
  interfaceIndex?: number;
  commandDisplay: string;
}

export interface RouteResult {
  success: boolean;
  plan: RoutePlan;
  message: string;
  alreadyPresent?: boolean;
  error?: FriendlyError;
}

export interface WifiConnectResult {
  success: boolean;
  endpoint: string;
  message: string;
  routeResult?: RouteResult;
  error?: FriendlyError;
}

export interface WifiStatusReport {
  console: ConsoleProbeResult;
  interfaces: NetworkInterfaceInfo[];
  selectedInterface?: RobotInterfacePreference;
  robotRoutePresent: boolean;
  wifiAdbDevices: string[];
  message: string;
  generatedAt: string;
}

export type { FetchLike };
