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
export type {
  FriendlyError,
  DoctorCheck,
  DoctorCheckCategory,
  DoctorReadiness,
  DoctorReport,
  DoctorReportSection,
  DoctorReportSections,
  CheckStatus,
} from "./types/errors.js";
export type {
  FtcDevConfig,
  ConfigLoadResult,
  PreferredConnection,
  DefaultLogFilter,
  FtcDevVisionConfig,
  FtcDevLimelightConfig,
  FtcDevDashboardConfig,
} from "./types/config.js";

export {
  FTC_DEV_SCHEMA_URL,
  DOCTOR_REPORT_SCHEMA_URL,
  INTEGRATION_MANIFEST_SCHEMA_URL,
  MODULE_MANIFEST_SCHEMA_URL,
  SESSION_SCHEMA_URL,
  PACKAGE_VERSION,
  DEFAULT_MODULE_NAME,
  DEFAULT_ROBOT_CONTROLLER_APPLICATION_ID,
  CONFIG_FILE_NAME,
  REQUIRED_JDK_MAJOR,
} from "./constants.js";

export {
  FTC_DEV_TOOLS_GITHUB_OWNER,
  FTC_DEV_TOOLS_GITHUB_REPO,
  FTC_DEV_TOOLS_RELEASES_PAGE_URL,
  NPM_PACKAGE_CLI,
  NPM_PACKAGE_MCP,
  NPM_INSTALL_CLI_COMMAND,
  NPM_INSTALL_MCP_COMMAND,
  npmCliExecutable,
  npxCliExecutable,
  buildNpmGlobalInstallCommand,
  releaseTagForVersion,
  cliReleaseTarballBasename,
  cliGitHubReleaseTarballUrl,
  buildCliInstallFromGitHubRelease,
  buildCliInstallFromTarballUrl,
  buildCliInstallFromNpm,
  buildMcpInstallFromNpm,
  buildMcpRunViaNpx,
  listCliConsumerInstallCommands,
} from "./cli-consumer-install.js";
export type { ConsumerInstallMethod, ConsumerInstallCommand } from "./cli-consumer-install.js";
export {
  FTC_DEV_TOOLS_RELEASES_API,
  fetchLatestCliGitHubRelease,
  buildCliInstallFromLatestGitHubRelease,
  pickCliTarballFromRelease,
  parseCliTarballAssetName,
} from "./cli-github-release.js";
export type { CliGitHubReleaseTarball, CliGitHubReleaseOptions } from "./cli-github-release.js";
export {
  FTC_DEV_TOOLS_GITHUB_RAW_BASE,
  INSTALL_WITHOUT_ANDROID_STUDIO_DOCS_URL,
  INSTALL_DEPS_ANDROID_CMDLINE_TOOLS_JSON_RAW_URL,
  INSTALL_DEPS_WINDOWS_PS1_RAW_URL,
  INSTALL_DEPS_MACOS_SH_RAW_URL,
  INSTALL_DEPS_LINUX_SH_RAW_URL,
  INSTALL_DEPS_CONTRIBUTOR_COMMANDS,
  buildInstallDepsCommand,
  describeInstallDepsConsentMessage,
  installDepsOsForPlatform,
} from "./install-deps-urls.js";
export type { InstallDepsOs, BuildInstallDepsOptions } from "./install-deps-urls.js";
export {
  analyzeMachineInstallNeeds,
  buildInstallDepsOptionsFromNeeds,
  describeMachineInstallPlan,
} from "./setup/install-needs-from-doctor.js";
export type { MachineInstallNeeds } from "./setup/install-needs-from-doctor.js";
export { renderStartHereMarkdown } from "./onboarding/start-here-markdown.js";
export type {
  RenderStartHereMarkdownOptions,
  StartHereMachineScan,
} from "./onboarding/start-here-markdown.js";
export {
  FTC_COMMAND_TITLES,
  getFtcCommandTitle,
  markdownCommandLink,
} from "./onboarding/ftc-command-titles.js";
export {
  estimateInstallDepsSetupTime,
  macPackageArchFromNode,
} from "./setup/install-deps-download-estimate.js";
export type { InstallDepsTimeEstimate } from "./setup/install-deps-download-estimate.js";
export {
  buildInstallDepsTerminalCommand,
  findFtcDevToolsRepoRoot,
} from "./setup/install-deps-contributor.js";
export { buildDoctorInstallPlan } from "./setup/doctor-install-plan.js";
export type { DoctorInstallPlan } from "./setup/doctor-install-plan.js";

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
export { discoverFtcCliOnPath } from "./discovery/ftc-cli-discovery.js";
export type { FtcCliDiscoveryResult } from "./discovery/ftc-cli-discovery.js";
export type { AdbDiscoveryResult } from "./discovery/adb-discovery.js";
export {
  discoverJava,
  parseJavaMajorVersion,
  suggestFtcJavaHomeSetting,
} from "./discovery/java-discovery.js";
export {
  findJdkHomeForMajor,
  buildJavaEnvForHome,
  resolveJdkEnvForFtcBuild,
  configuredJavaHomeCandidates,
} from "./discovery/java-home.js";
export { withFtcJdkEnv } from "./gradle/java-env.js";
export type { JavaDiscoveryResult } from "./discovery/java-discovery.js";

export { findGradleWrapper, buildGradleCommand } from "./gradle/wrapper.js";
export type { GradleWrapperInfo } from "./gradle/wrapper.js";

export {
  OfficialFtcProjectAdapter,
  readApplicationId,
} from "./adapters/official-ftc-project-adapter.js";
export { discoverNearbyFtcProjectRoots } from "./project/discover-ftc-root.js";
export type { DiscoverFtcProjectRootsOptions } from "./project/discover-ftc-root.js";
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
export {
  buildDoctorSections,
  partitionChecksBySection,
  categoryForCheckId,
  formatDoctorCheckLine,
  formatSectionSummaryLine,
  statusMarkForCheck,
  DOCTOR_SECTION_ORDER,
  DOCTOR_SECTION_TITLES,
} from "./doctor/doctor-sections.js";
export type { DoctorSectionId } from "./doctor/doctor-sections.js";
export {
  notAnFtcProjectRootError,
  projectNotDetectedWrapperError,
} from "./doctor/wrong-folder-errors.js";
export {
  buildDoctorCheckUiItem,
  listActionableDoctorChecks,
  resolveDoctorProgressNextStep,
  resolveDoctorSuccessNextStep,
  reloadWindowAction,
} from "./doctor/doctor-fix-actions.js";
export type {
  DoctorCheckUiItem,
  DoctorFixAction,
  DoctorFixActionKind,
} from "./doctor/doctor-fix-actions.js";
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
export { listSdkBackups, restoreSdkBackup } from "./sdk/sdk-backup-restore.js";
export type { SdkBackupInfo, RestoreSdkBackupResult } from "./sdk/sdk-backup-restore.js";

export {
  FTC_PROJECT_RECOMMENDED_EXTENSIONS,
  parseJsonStrict,
  mergeExtensionsJson,
  mergeFtcWorkspaceSettings,
  formatJsonFile,
  buildFtcProjectTasksDocument,
  backupFileBeforeWrite,
  listSetupBackups,
  restoreSetupBackup,
} from "./setup/project-setup-files.js";
export type {
  SetupBackupInfo,
  ParseJsonResult,
  FtcProjectTasksMode,
} from "./setup/project-setup-files.js";

export {
  buildDefaultFtcDevJsonDocument,
  buildFtcProjectSetupPlans,
  refreshSetupPlanJsonContent,
} from "./setup/project-setup-plan.js";
export type {
  FtcProjectSetupPlan,
  BuildFtcProjectSetupPlansInput,
  BuildFtcProjectSetupPlansResult,
} from "./setup/project-setup-plan.js";

export { buildSetUpComputerDoctorOptions } from "./setup/setup-computer-doctor.js";

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

export {
  START_HERE_PROGRESS_KEY,
  START_HERE_STEP_IDS,
  START_HERE_STEPS,
  getStartHereStep,
  isStartHereStepId,
  normalizeStartHereProgress,
  serializeStartHereProgress,
  isStartHereStepComplete,
  getNextStartHereStep,
  countStartHereCompleted,
} from "./onboarding/start-here-steps.js";
export type { StartHereStepId, StartHereStep } from "./onboarding/start-here-steps.js";
export {
  DRIVER_STATION_INIT_START_LINES,
  formatDriverStationInitStartMessage,
} from "./onboarding/first-opmode-journey.js";
export {
  MILESTONE_PROGRESS_KEY,
  MILESTONE_STEP_IDS,
  MILESTONE_STEPS,
  DEVICE_CONNECTIONS_DOC_URL,
  getMilestoneStep,
  isMilestoneStepId,
  normalizeMilestoneProgress,
  serializeMilestoneProgress,
  isMilestoneComplete,
  countMilestonesCompleted,
} from "./onboarding/milestone-checklist.js";
export type { MilestoneStepId, MilestoneStep } from "./onboarding/milestone-checklist.js";
export {
  buildReadinessSnapshotFromDoctor,
  formatDeployReadySummary,
  type ReadinessCategoryId,
  type ReadinessCategoryState,
  type ReadinessLevel,
  type ReadinessSnapshot,
  type ReadinessSnapshotOptions,
} from "./readiness/readiness-model.js";
export {
  LAST_SUCCESSFUL_BUILD_KEY,
  isLastSuccessfulBuildSnapshot,
  type LastSuccessfulBuildSnapshot,
} from "./readiness/build-snapshot.js";
export {
  formatReadinessCategoryLine,
  formatReadinessOverviewLines,
  listReadinessCategoriesNeedingAttention,
  readinessLevelLabel,
} from "./readiness/readiness-ui.js";
export {
  computeSidebarState,
  type ComputeSidebarStateInput,
  type DeviceConnectionPhase,
  type SidebarAction,
  type SidebarDeviceInfo,
  type SidebarPhase,
  type SidebarProjectInfo,
  type SidebarState,
} from "./readiness/sidebar-state.js";
export {
  ROOKIE_JOURNEY_COMMAND_IDS,
  ONBOARDING_0_2_CHILD_ISSUES,
  ONBOARDING_0_1_SETUP_CLOSURE_ISSUES,
} from "./onboarding/onboarding-0.2-closure.js";

export {
  OFFICIAL_FTC_ROBOT_CONTROLLER_GIT_URL,
  normalizeGitCloneUrl,
  deriveCloneDirectoryName,
  buildGitCloneCommand,
} from "./onboarding/obtain-project.js";

export type {
  ErrorReportEnvironment,
  ErrorReportInput,
  ErrorReportSubmitResult,
  ErrorReportSurface,
  ErrorReportSubmitAction,
} from "./feedback/error-report-types.js";
export {
  ERROR_REPORT_REPO_OWNER,
  ERROR_REPORT_REPO_NAME,
  ERROR_REPORT_TITLE_PREFIX,
} from "./feedback/error-report-types.js";
export {
  buildErrorReportIssueTitle,
  buildInitialErrorReportBody,
  buildErrorOccurrenceComment,
  findOpenErrorReportIssueByTitle,
  submitErrorReport,
  normalizeCommandAttempted,
  buildCliErrorReportEnvironment,
  buildMcpErrorReportEnvironment,
  buildVscodeErrorReportEnvironment,
} from "./feedback/error-report-github.js";
export {
  storeGitHubReportToken,
  loadGitHubReportToken,
  clearGitHubReportToken,
  resolveGitHubReportToken,
  isAutoErrorReportEnabled,
  githubReportTokenPath,
} from "./feedback/github-report-token.js";
export {
  buildOutboundGitHubErrorReport,
  normalizeOutboundErrorCode,
  sanitizeErrorReportInput,
} from "./feedback/error-report-sanitize.js";

export type {
  IntegrationManifest,
  IntegrationRegistrySnapshot,
  IntegrationCategory,
  IntegrationCapability,
  EcosystemClassification,
} from "./registry/types.js";
export { INTEGRATION_MANIFEST_SCHEMA_VERSION } from "./registry/types.js";
export {
  listIntegrations,
  getIntegration,
  listIntegrationsByCategory,
  listIntegrationsByClassification,
  listIntegrationsWithCapability,
  listShippedIntegrations,
  createIntegrationRegistrySnapshot,
} from "./registry/registry.js";
export { BUILTIN_INTEGRATIONS } from "./registry/catalog.js";

export type { ModuleManifest, ModuleRegistrySnapshot, ModuleLayer } from "./modules/types.js";
export { MODULE_MANIFEST_SCHEMA_VERSION } from "./modules/types.js";
export {
  listModules,
  getModule,
  listModulesByLayer,
  createModuleRegistrySnapshot,
} from "./modules/registry.js";
export { BUILTIN_MODULES } from "./modules/catalog.js";

export type {
  FrameProviderDescriptor,
  FrameSourceKind,
  TelemetryProviderDescriptor,
  TelemetrySourceKind,
  SimulationRuntimeDescriptor,
  ReplayBackendDescriptor,
  ReplayBackendKind,
  VisionProviderDescriptor,
  VisionProviderKind,
  ProviderRegistrySnapshot,
} from "./providers/types.js";
export {
  registerFrameProvider,
  listFrameProviders,
  getFrameProvider,
  clearFrameProviders,
} from "./providers/frame-registry.js";
export {
  registerTelemetryProvider,
  listTelemetryProviders,
  getTelemetryProvider,
  clearTelemetryProviders,
} from "./providers/telemetry-registry.js";
export {
  registerSimulationRuntime,
  listSimulationRuntimes,
  getSimulationRuntime,
  clearSimulationRuntimes,
} from "./providers/simulation-registry.js";
export {
  registerReplayBackend,
  listReplayBackends,
  getReplayBackend,
  clearReplayBackends,
} from "./providers/replay-registry.js";
export {
  registerVisionProvider,
  listVisionProviders,
  getVisionProvider,
  clearVisionProviders,
} from "./providers/vision-registry.js";
export {
  bootstrapProviderCatalog,
  resetProviderCatalogForTests,
  createProviderRegistrySnapshot,
} from "./providers/bootstrap.js";

export type {
  VisionDetectionKind,
  VisionPipelineDirectory,
  VisionStatusReport,
  VisionWorkspaceDiscovery,
  VisionWorkspaceSignal,
} from "./vision/types.js";
export { discoverVisionWorkspace } from "./vision/discover.js";
export {
  defaultVisionConfig,
  getVisionStatus,
  visionConfigFromProjectConfig,
} from "./vision/status.js";
export type {
  VisionEndpointKind,
  VisionEndpointLocation,
  VisionEndpointSource,
  VisionEndpointConfidence,
  VisionEndpointReachability,
  VisionEndpointCandidate,
  VisionEndpointProbeResult,
  VisionEndpointDescriptor,
  VisionDevicesDiscoveryContext,
  VisionDevicesReport,
  DiscoverVisionDevicesOptions,
} from "./vision/endpoints/types.js";
export {
  discoverVisionDevices,
  extractWebcamDevicesFromXml,
} from "./vision/endpoints/discover-devices.js";
export type { DiscoverVisionDevicesFullOptions } from "./vision/endpoints/discover-devices.js";
export {
  teamNumberToLimelightHost,
  teamNumberToSubnetOctets,
  wifiSerialToHost,
} from "./vision/endpoints/team-ip.js";
export type {
  LimelightDeviceStatus,
  LimelightTargetingResults,
  LimelightTargetSummary,
  LimelightProviderCapabilities,
  ResolveLimelightHostReport,
} from "./vision/limelight/types.js";
export { DEFAULT_LIMELIGHT_API_PORT, limelightApiBaseUrl } from "./vision/limelight/constants.js";
export { getLimelightStatus } from "./vision/limelight/status.js";
export type {
  GetLimelightStatusOptions,
  LimelightStatusReport,
} from "./vision/limelight/status.js";
export { getLimelightResults } from "./vision/limelight/results.js";
export type {
  GetLimelightResultsOptions,
  LimelightResultsReport,
} from "./vision/limelight/results.js";
export {
  resolveLimelightHost,
  resolveLimelightHostReport,
} from "./vision/limelight/resolve-host.js";
export type { ResolveLimelightHostOptions } from "./vision/limelight/resolve-host.js";
export type {
  LimelightArtifactKind,
  LimelightArtifact,
  LimelightArtifactManifest,
  LimelightPipelineArtifact,
  LimelightArtifactValidationReport,
  LimelightPipelineDiffReport,
  LimelightJsonDiffEntry,
} from "./vision/limelight/artifacts/types.js";
export type { LimelightPipelineCapabilities } from "./vision/limelight/types.js";
export { LIMELIGHT_PIPELINE_CAPABILITIES } from "./vision/limelight/types.js";
export { scanLimelightArtifacts, findPipelineForSlot } from "./vision/limelight/artifacts/scan.js";
export { validateLimelightArtifacts } from "./vision/limelight/artifacts/validate.js";
export { diffLimelightPipeline } from "./vision/limelight/artifacts/diff.js";
export type { DiffLimelightPipelineOptions } from "./vision/limelight/artifacts/diff.js";
export { diffLimelightJson } from "./vision/limelight/artifacts/json-diff.js";
export { resolveLimelightPipelineDirectory } from "./vision/limelight/resolve-pipeline-directory.js";
export type { ResolvePipelineDirectoryResult } from "./vision/limelight/resolve-pipeline-directory.js";
export type {
  ResolveDashboardUrlReport,
  ResolveDashboardUrlResult,
  FtcDashboardStatusReport,
  FtcDashboardDependencyInfo,
  OpenFtcDashboardResult,
} from "./vision/dashboard/types.js";
export {
  DEFAULT_FTC_DASHBOARD_PORT,
  DEFAULT_FTC_DASHBOARD_PATH,
  buildFtcDashboardUrl,
} from "./vision/dashboard/constants.js";
export { detectFtcDashboardDependency } from "./vision/dashboard/detect-dependency.js";
export { resolveDashboardUrl, resolveDashboardUrlReport } from "./vision/dashboard/resolve-url.js";
export type { ResolveDashboardUrlOptions } from "./vision/dashboard/resolve-url.js";
export { getFtcDashboardStatus } from "./vision/dashboard/status.js";
export type { GetFtcDashboardStatusOptions } from "./vision/dashboard/status.js";
export { openFtcDashboard } from "./vision/dashboard/open.js";
export type { OpenFtcDashboardOptions } from "./vision/dashboard/open.js";
export type {
  VisionDiagnosticPayload,
  VisionDiagnosticValidationResult,
  VisionBridgeStatusReport,
  VisionBridgeScaffoldResult,
} from "./vision/bridge/types.js";
export {
  VISION_DIAGNOSTIC_SCHEMA_VERSION,
  VISION_BRIDGE_CODE_VERSION,
  VISION_DIAGNOSTIC_LOG_PREFIX,
  VISION_BRIDGE_LIMITS,
} from "./vision/bridge/constants.js";
export {
  extractVisionDiagnosticJson,
  parseVisionDiagnosticLine,
  validateVisionDiagnosticPayload,
} from "./vision/bridge/validate.js";
export { getVisionBridgeStatus } from "./vision/bridge/status.js";
export { scaffoldVisionBridge } from "./vision/bridge/scaffold.js";
export type { ScaffoldVisionBridgeOptions } from "./vision/bridge/scaffold.js";
export {
  renderVisionDiagnosticBridgeSource,
  renderVisionDiagnosticOpModeSource,
} from "./vision/bridge/templates.js";
export type {
  VisionPortalConfigSignal,
  VisionPortalProcessorSignal,
  VisionPortalWorkspaceDiscovery,
  VisionPortalStatusReport,
  VisionPortalCapabilities,
  VisionPortalProcessorKind,
  VisionPortalNormalizedProcessorResult,
  VisionPortalCustomProcessorAdapter,
} from "./vision/visionportal/types.js";
export { VISION_PORTAL_CAPABILITIES } from "./vision/visionportal/capabilities.js";
export {
  scanVisionPortalJavaSource,
  scanVisionPortalTeamCode,
} from "./vision/visionportal/scan.js";
export { discoverVisionPortalWorkspace } from "./vision/visionportal/discover.js";
export { getVisionPortalStatus } from "./vision/visionportal/status.js";
export {
  normalizeVisionPortalProcessorKind,
  normalizeVisionPortalProcessorResult,
  registerVisionPortalProcessorAdapter,
} from "./vision/visionportal/normalize.js";
export type {
  EasyOpenCvDependencyInfo,
  EasyOpenCvWebcamSignal,
  EasyOpenCvPipelineSignal,
  EasyOpenCvWorkspaceDiscovery,
  EasyOpenCvStatusReport,
  EasyOpenCvCapabilities,
  EasyOpenCvSourceNavigationEntry,
  EasyOpenCvDiagnosticResult,
  EasyOpenCvCustomDiagnosticAdapter,
  EasyOpenCvDesktopReplayCompatibility,
} from "./vision/easyopencv/types.js";
export { EASYOPENCV_CAPABILITIES } from "./vision/easyopencv/capabilities.js";
export { detectEasyOpenCvDependency } from "./vision/easyopencv/detect-dependency.js";
export { scanEasyOpenCvJavaSource, scanEasyOpenCvTeamCode } from "./vision/easyopencv/scan.js";
export { discoverEasyOpenCvWorkspace } from "./vision/easyopencv/discover.js";
export { getEasyOpenCvStatus } from "./vision/easyopencv/status.js";
export { assessDesktopReplayCompatibility } from "./vision/easyopencv/replay.js";
export {
  normalizeEasyOpenCvDiagnosticResult,
  registerEasyOpenCvDiagnosticAdapter,
} from "./vision/easyopencv/normalize.js";
export {
  renderEasyOpenCvPipelineSource,
  renderEasyOpenCvWebcamInitSnippet,
} from "./vision/easyopencv/templates.js";
export type {
  EasyOpenCvPipelineTemplateInput,
  EasyOpenCvWebcamInitTemplateInput,
} from "./vision/easyopencv/templates.js";
export type {
  VisionInspectorSnapshot,
  VisionInspectorDetection,
  VisionInspectorMetrics,
  VisionInspectorCapabilities,
  VisionInspectorPoint,
  VisionInspectorBox,
  BuildVisionInspectorOptions,
} from "./vision/inspector/types.js";
export { VISION_INSPECTOR_CAPABILITIES } from "./vision/inspector/capabilities.js";
export {
  VISION_INSPECTOR_OVERLAY_CONVENTION,
  LIMELIGHT_DEFAULT_FOV,
  limelightDegreesToNormalizedPoint,
  targetAreaToNormalizedBox,
} from "./vision/inspector/coordinates.js";
export {
  buildLimelightInspectorSnapshot,
  emptyInspectorSnapshot,
} from "./vision/inspector/limelight.js";
export { buildVisionInspectorSnapshot } from "./vision/inspector/build.js";
export {
  VISION_CODEGEN_LANGUAGE,
  DEFAULT_VISION_CODEGEN_PACKAGE,
  VISION_CODEGEN_GENERATED_MARKER,
} from "./vision/codegen/constants.js";
export type {
  VisionCodegenKind,
  VisionCodegenKindDescriptor,
  VisionCodegenPlanEntry,
  VisionCodegenResult,
  ScaffoldVisionCodegenOptions,
} from "./vision/codegen/types.js";
export { resolveVisionCodegenContext, VISION_CODEGEN_KINDS } from "./vision/codegen/context.js";
export {
  renderEasyOpenCvOpModeSource,
  renderVisionPortalAprilTagOpModeSource,
  renderVisionPortalColorOpModeSource,
  renderLimelightOpModeSource,
  renderDashboardStreamOpModeSource,
  renderVisionCodegenSource,
} from "./vision/codegen/templates.js";
export { scaffoldVisionCodegen, parseVisionCodegenKind } from "./vision/codegen/scaffold.js";
export {
  SESSION_HEADER_SCHEMA_VERSION,
  SESSION_EVENT_SCHEMA_VERSION,
  SESSION_EVENT_SCHEMA_URL,
  REPLAY_SESSION_LIMITS,
  REPLAY_SESSION_FILE_EXTENSION,
  REPLAY_GITIGNORE_RECOMMENDATIONS,
} from "./replay/constants.js";
export type {
  SessionHeader,
  SessionEventEnvelope,
  SessionEventKind,
  ReplayCapabilities,
  ReplaySessionLimits,
  SessionValidationResult,
  ReplayStatusReport,
  CreateSessionHeaderInput,
} from "./replay/types.js";
export { REPLAY_CAPABILITIES } from "./replay/capabilities.js";
export { sessionHeaderSchema, sessionEventSchema } from "./replay/schema.js";
export {
  validateSessionHeader,
  validateSessionEvent,
  parseSessionEventLine,
} from "./replay/validate.js";
export { createSessionHeader } from "./replay/create-header.js";
export { getReplayStatus } from "./replay/status.js";
export { VISION_DIAGNOSTIC_CODES } from "./vision/diagnostics/codes.js";
export type { VisionDiagnosticCode } from "./vision/diagnostics/codes.js";
export type {
  VisionDiagnostic,
  VisionDiagnosticSeverity,
  VisionDiagnosticConfidence,
  VisionDiagnosticsReport,
  VisionDiagnosticsSummary,
  VisionDiagnosticsCapabilities,
  CollectVisionDiagnosticsOptions,
} from "./vision/diagnostics/types.js";
export { VISION_DIAGNOSTICS_CAPABILITIES } from "./vision/diagnostics/capabilities.js";
export {
  visionDiagnosticToFriendlyError,
  friendlyForVisionDiagnosticCode,
} from "./vision/diagnostics/friendly.js";
export { collectVisionDiagnostics } from "./vision/diagnostics/collect.js";
export { buildVisionDoctorChecks } from "./vision/diagnostics/doctor.js";
export type { BuildVisionDoctorChecksOptions } from "./vision/diagnostics/doctor.js";
export {
  VISION_CLI_SCHEMA_VERSION,
  VISION_CLI_EXIT,
  VISION_CLI_EXIT_DOCS,
} from "./vision/cli/constants.js";
export type { VisionCliExitCode } from "./vision/cli/constants.js";
export type {
  VisionCliCommonOptions,
  VisionCliCatalogEntry,
  VisionCliDeferredResult,
  OpenVisionTargetResult,
  VisionCliJsonEnvelope,
  VisionCliProviderId,
} from "./vision/cli/types.js";
export {
  VISION_CLI_CATALOG,
  getVisionCliCatalog,
  findVisionCliCatalogEntry,
} from "./vision/cli/catalog.js";
export { buildDeferredVisionCliResult } from "./vision/cli/deferred.js";
export {
  redactVisionCliPayload,
  wrapVisionCliJson,
  formatEndpointTable,
} from "./vision/cli/format.js";
export { openVisionTarget } from "./vision/cli/open.js";
export type { OpenVisionTargetOptions } from "./vision/cli/open.js";
export { VISION_MCP_CATALOG_VERSION, VISION_MCP_AGENT_TOOL_NAMES } from "./vision/mcp/constants.js";
export type { VisionMcpAgentToolName } from "./vision/mcp/constants.js";
export type {
  VisionMcpToolKind,
  VisionMcpToolDescriptor,
  VisionMcpDeferredResult,
  VisionMcpSanitizeOptions,
  ResolveVisionEndpointResult,
} from "./vision/mcp/types.js";
export {
  VISION_MCP_TOOL_CATALOG,
  getVisionMcpToolCatalog,
  findVisionMcpTool,
} from "./vision/mcp/catalog.js";
export { buildDeferredVisionMcpResult, assertVisionMutationTarget } from "./vision/mcp/deferred.js";
export {
  sanitizeVisionMcpPayload,
  resolveVisionEndpoint,
  hostFromVisionTarget,
} from "./vision/mcp/sanitize.js";
