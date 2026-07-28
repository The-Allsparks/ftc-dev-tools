export type {
  CommandSpec,
  CommandResult,
  ProcessRunner,
  RunOptions,
  SpawnOptions,
  ChildProcessHandle,
} from "./types/process.js";
export type {
  AndroidDevice,
  DeviceProvider,
  LogEntry,
  LogOptions,
  DeviceAuthorization,
  DeviceOnlineState,
  ConnectionType,
  ControlHubLikelihood,
} from "./types/device.js";
export type { FtcProjectInfo, ProjectAdapter, BuildResult, DeployResult } from "./types/project.js";
export type { FriendlyError, DoctorCheck, DoctorReadiness, DoctorReport, CheckStatus } from "./types/errors.js";
export type {
  FtcDevConfig,
  ConfigLoadResult,
  PreferredConnection,
  DefaultLogFilter,
} from "./types/config.js";

export {
  FTC_DEV_SCHEMA_URL,
  PACKAGE_VERSION,
  DEFAULT_MODULE_NAME,
  DEFAULT_ROBOT_CONTROLLER_APPLICATION_ID,
  CONFIG_FILE_NAME,
} from "./constants.js";

export { ConsoleLogger } from "./logger.js";
export type { Logger, LogLevel } from "./logger.js";

export { NodeProcessRunner } from "./process/node-process-runner.js";
export {
  assertSafeCommandSpec,
  formatCommandForDisplay,
  quoteForDisplay,
} from "./process/sanitize.js";

export {
  detectPlatform,
  isSupportedPlatform,
  gradleWrapperName,
  expandHome,
  commonAndroidSdkCandidates,
  adbExecutableName,
  uniquePreserveOrder,
} from "./paths/os-paths.js";

export { discoverAdb, discoverAndroidSdk } from "./discovery/adb-discovery.js";
export type { AdbDiscoveryResult } from "./discovery/adb-discovery.js";
export { discoverJava, parseJavaMajorVersion } from "./discovery/java-discovery.js";
export type { JavaDiscoveryResult } from "./discovery/java-discovery.js";

export { findGradleWrapper, buildGradleCommand } from "./gradle/wrapper.js";
export type { GradleWrapperInfo } from "./gradle/wrapper.js";

export {
  OfficialFtcProjectAdapter,
  readApplicationId,
} from "./adapters/official-ftc-project-adapter.js";
export { AdbDeviceProvider, parseAdbDevicesOutput } from "./devices/adb-device-provider.js";
export { MockDeviceProvider } from "./devices/mock-device-provider.js";
export type { MockScenario, MockDeviceProviderOptions } from "./devices/mock-device-provider.js";
export { selectDeploymentDevice, filterByPreferredConnection } from "./devices/selection.js";
export type { DeviceSelectionInput, DeviceSelectionResult } from "./devices/selection.js";
export { inferConnectionType, inferControlHubLikelihood } from "./devices/device-heuristics.js";

export { parseLogcatLine, formatLogEntry } from "./logcat/parse.js";
export { interpretError, interpretFromUnknown, listErrorRuleCodes } from "./errors/interpret.js";
export { defaultConfig, loadProjectConfig } from "./config/load.js";
export { runDoctor } from "./doctor/run-doctor.js";
export type { DoctorOptions } from "./doctor/run-doctor.js";
export { buildProject, cleanProject } from "./services/build.js";
export type { BuildServiceOptions, BuildServiceOutcome } from "./services/build.js";
export { deployProject } from "./services/deploy.js";
export type { DeployServiceOptions, DeployServiceOutcome } from "./services/deploy.js";

export type {
  SdkFreshness,
  LocalSdkInfo,
  RemoteSdkRelease,
  SdkStatusReport,
  SdkUpdatePlan,
  SdkUpdatePlanEntry,
  SdkUpdateResult,
  FetchLike,
} from "./sdk/types.js";
export { detectLocalSdk, parseFtcMavenArtifacts } from "./sdk/detect-local-sdk.js";
export {
  compareVersions,
  normalizeVersion,
  parseVersion,
  versionsEqual,
} from "./sdk/compare-versions.js";
export {
  FTC_SDK_GITHUB_OWNER,
  FTC_SDK_GITHUB_REPO,
  FTC_SDK_RELEASES_URL,
  fetchLatestSdkRelease,
  fetchSdkReleaseByTag,
  listSdkReleases,
} from "./sdk/github-releases.js";
export type { GitHubReleasesOptions } from "./sdk/github-releases.js";
export { checkSdkStatus } from "./sdk/check-sdk-status.js";
export type { CheckSdkStatusOptions } from "./sdk/check-sdk-status.js";
export {
  SDK_OWNED_PATHS,
  planSdkUpdate,
  applySdkUpdate,
  isGitWorkingTreeDirty,
} from "./sdk/sync-sdk-update.js";
export type { PlanSdkUpdateOptions, ApplySdkUpdateOptions } from "./sdk/sync-sdk-update.js";
export {
  listSdkBackups,
  restoreSdkBackup,
} from "./sdk/sdk-backup-restore.js";
export type { SdkBackupInfo, RestoreSdkBackupResult } from "./sdk/sdk-backup-restore.js";

export {
  FTC_PROJECT_RECOMMENDED_EXTENSIONS,
  parseJsonStrict,
  mergeExtensionsJson,
  mergeFtcWorkspaceSettings,
  formatJsonFile,
  backupFileBeforeWrite,
  listSetupBackups,
  restoreSetupBackup,
} from "./setup/project-setup-files.js";
export type { SetupBackupInfo, ParseJsonResult } from "./setup/project-setup-files.js";

export type {
  InterfaceState,
  NetworkInterfaceInfo,
  RobotInterfacePreference,
  ManagedRouteRecord,
  WifiPreferenceFile,
  ConsoleProbeResult,
  RoutePlan,
  RouteResult,
  WifiConnectResult,
  WifiStatusReport,
} from "./wifi/types.js";
export {
  DEFAULT_CONTROL_HUB_HOST,
  DEFAULT_CONTROL_HUB_ADB_PORT,
  DEFAULT_CONTROL_HUB_ADB_ENDPOINT,
  DEFAULT_ROBOT_CONSOLE_URL,
  DEFAULT_ROBOT_SUBNET_CIDR,
  parseHostPort,
  parseCidr,
} from "./wifi/defaults.js";
export {
  getWifiPreferencePath,
  loadWifiPreference,
  saveWifiPreference,
  setRobotNetworkInterface,
  recordManagedRoute,
  removeManagedRouteRecord,
} from "./wifi/interface-preference.js";
export { probeRobotConsole } from "./wifi/probe-console.js";
export type { ProbeConsoleOptions } from "./wifi/probe-console.js";
export {
  listNetworkInterfaces,
  parseNetshInterfacesOutput,
  parseIpLinkOutput,
  parseIpAddrOutput,
  findInterfaceByNameOrIndex,
} from "./wifi/list-interfaces.js";
export type { ListInterfacesOptions } from "./wifi/list-interfaces.js";
export {
  buildRoutePlan,
  ensureRobotRoute,
  removeRobotRoute,
  isRobotRoutePresent,
} from "./wifi/robot-route.js";
export type { EnsureRobotRouteOptions, RemoveRobotRouteOptions } from "./wifi/robot-route.js";
export { connectWifiAdb, disconnectWifiAdb, enableTcpip } from "./wifi/wireless-adb.js";
export type {
  ConnectWifiAdbOptions,
  DisconnectWifiAdbOptions,
  EnableTcpipOptions,
} from "./wifi/wireless-adb.js";
export { buildConsoleOpenCommand, openRobotConsole } from "./wifi/open-console.js";
export { getWifiStatus } from "./wifi/status.js";
export type { GetWifiStatusOptions } from "./wifi/status.js";
export {
  storeWifiPassword,
  loadWifiPassword,
  clearWifiPassword,
  redactSecrets,
  getWifiSecretsPath,
} from "./wifi/credentials.js";
export { joinRobotWifi, buildWindowsWlanProfile } from "./wifi/join-wifi.js";
export type { JoinWifiOptions } from "./wifi/join-wifi.js";
export {
  HUB_WIFI_MANAGE_POST_CANDIDATES,
  parseHubWifiSettingsFromHtml,
  toPublicHubSettings,
  getHubWifiSettings,
  setHubWifiSettings,
} from "./wifi/manage-hub-wifi.js";
export type {
  GetHubWifiSettingsOptions,
  SetHubWifiSettingsOptions,
} from "./wifi/manage-hub-wifi.js";
export type {
  HubWifiSettings,
  HubWifiManageGetResult,
  HubWifiManageSetInput,
  HubWifiManageSetResult,
  WifiJoinResult,
  InterfaceMetricChange,
  PreferInterfaceResult,
  AdapterControlResult,
} from "./wifi/types.js";
export {
  DEFAULT_INTERNET_METRIC,
  DEFAULT_ROBOT_METRIC,
  preferInternetInterface,
  preferRobotInterface,
  setAdapterAdminState,
  setInterfaceMetric,
} from "./wifi/interface-metrics.js";
export type {
  PreferInternetOptions,
  PreferRobotOptions,
  AdapterControlOptions,
} from "./wifi/interface-metrics.js";

export type {
  HubOsFreshness,
  HubUpdateConnection,
  HubOsRelease,
  HubDeviceInfo,
  HubStatusReport,
  HubUpdateCheckReport,
  HubDownloadResult,
  HubApplyMode,
  HubApplyResult,
} from "./hub/types.js";
export {
  HUB_OS_CHANGELOG_URL,
  HUB_OS_DOCS_URL,
  HUB_OS_GITHUB_REPO,
  HUB_OS_TAG_PREFIX,
  HUB_OS_UPLOAD_POST_CANDIDATES,
} from "./hub/defaults.js";
export {
  assertAllowedDownloadUrl,
  assertAllowedMetadataUrl,
  isAllowedHost,
} from "./hub/allowlist.js";
export { getHubUpdateCacheDir, ensureHubUpdateCacheDir, hubOsCacheFilePath } from "./hub/paths.js";
export {
  parseHubOsCatalogFromHtml,
  pickLatestHubOsRelease,
  findHubOsReleaseByVersion,
  parseOsVersionFromConsoleHtml,
} from "./hub/parse-os-catalog.js";
export { fetchHubOsCatalog, fetchLatestHubOsRelease } from "./hub/fetch-os-catalog.js";
export { getHubStatus } from "./hub/status.js";
export type { GetHubStatusOptions } from "./hub/status.js";
export { checkHubUpdate } from "./hub/check-update.js";
export type { CheckHubUpdateOptions } from "./hub/check-update.js";
export { downloadHubOsUpdate } from "./hub/download.js";
export type { DownloadHubOsOptions } from "./hub/download.js";
export { applyHubOsUpdate } from "./hub/apply-update.js";
export type { ApplyHubOsUpdateOptions } from "./hub/apply-update.js";

export type {
  PedroDependencyInfo,
  PedroStatusReport,
  PedroAddPlanEntry,
  PedroAddResult,
  PedroScaffoldPlanEntry,
  PedroScaffoldResult,
} from "./pedro/types.js";
export {
  PEDRO_BYLAZAR_MAVEN_URL,
  PEDRO_FTC_MAVEN_METADATA_URL,
  PEDRO_TELEMETRY_VERSION,
  PEDRO_FULLPANELS_VERSION,
  PEDRO_QUICKSTART_OWNER,
  PEDRO_QUICKSTART_REPO,
  PEDRO_MIN_COMPILE_SDK,
  PEDRO_FTC_COORD,
  PEDRO_TELEMETRY_COORD,
  PEDRO_FULLPANELS_COORD,
} from "./pedro/defaults.js";
export {
  parseGradleDependencies,
  hasByalazarRepo,
  findCompileSdk,
  patchBuildDependenciesGradle,
  patchCompileSdkInText,
} from "./pedro/gradle-patch.js";
export { detectPedroStatus } from "./pedro/detect.js";
export { resolvePedroFtcVersion } from "./pedro/resolve-version.js";
export { addPedroPathing } from "./pedro/add.js";
export type { AddPedroOptions } from "./pedro/add.js";
export { scaffoldPedroPathing, isAllowedPedroScaffoldPath } from "./pedro/scaffold.js";
export type { ScaffoldPedroOptions } from "./pedro/scaffold.js";

export type {
  OpModeKind,
  OpModeStyle,
  DetectedOpMode,
  OpModeListResult,
  CreateOpModeResult,
} from "./opmode/types.js";
export {
  DEFAULT_OPMODE_PACKAGE,
  isValidJavaClassName,
  isValidJavaPackageName,
  packageToRelativePath,
} from "./opmode/defaults.js";
export { renderOpModeSource } from "./opmode/templates.js";
export type { OpModeTemplateInput } from "./opmode/templates.js";
export { listOpModes, parseOpModeFromSource } from "./opmode/list.js";
export { createOpMode } from "./opmode/create.js";
export type { CreateOpModeOptions } from "./opmode/create.js";

export type {
  RobotConfigDevice,
  RobotConfigInfo,
  RobotConfigDetail,
  RobotConfigListResult,
  RobotConfigShowResult,
  RobotConfigValidationIssue,
  RobotConfigValidateResult,
  RobotConfigPullResult,
} from "./robot-config/types.js";
export {
  TEAMCODE_RES_XML_RELATIVE,
  HUB_CONFIG_REMOTE_DIR,
  isValidAndroidXmlResourceName,
  isValidFtcDeviceName,
} from "./robot-config/defaults.js";
export { parseRobotConfigXml } from "./robot-config/parse.js";
export {
  listRobotConfigs,
  showRobotConfig,
  resolveConfigPath,
  getTeamCodeResXmlDir,
} from "./robot-config/list.js";
export { validateRobotConfig } from "./robot-config/validate.js";
export { pullRobotConfigs } from "./robot-config/pull.js";
export type { PullRobotConfigOptions } from "./robot-config/pull.js";

export type {
  HardwareMapCategory,
  HardwareMapEntry,
  HardwareMapShowResult,
  HardwareMapCodegenResult,
} from "./hwmap/types.js";
export { resolveXmlTypeMapping, toJavaFieldName } from "./hwmap/map-types.js";
export { showHardwareMap } from "./hwmap/show.js";
export { codegenHardwareMapOpMode } from "./hwmap/codegen.js";
export type { CodegenHardwareMapOptions } from "./hwmap/codegen.js";
export { renderHwMapOpModeSource } from "./hwmap/templates.js";
export type { HwMapOpModeTemplateInput } from "./hwmap/templates.js";
