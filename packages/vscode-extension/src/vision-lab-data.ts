import {
  bootstrapProviderCatalog,
  discoverVisionDevices,
  getEasyOpenCvStatus,
  getFtcDashboardStatus,
  getLimelightStatus,
  getVisionBridgeStatus,
  getVisionPortalStatus,
  getVisionStatus,
  listVisionProviders,
  NodeProcessRunner,
  buildVisionInspectorSnapshot,
} from "@ftc-dev-tools/shared";
import type {
  DeviceProvider,
  ProcessRunner,
  VisionDevicesReport,
  VisionProviderDescriptor,
  VisionStatusReport,
  VisionInspectorSnapshot,
} from "@ftc-dev-tools/shared";

export type VisionLabConnectionState = "offline" | "ready" | "selection-required" | "partial";

export interface VisionLabProviderSection {
  providerId: string;
  label: string;
  message: string;
  error?: string;
  details: string[];
}

export interface VisionLabSourceLink {
  label: string;
  relativePath: string;
  providerId: string;
}

export interface VisionLabSnapshot {
  projectRoot?: string;
  generatedAt: string;
  connectionState: VisionLabConnectionState;
  connectionLabel: string;
  errors: string[];
  visionStatus?: VisionStatusReport;
  devices?: VisionDevicesReport;
  providers: readonly VisionProviderDescriptor[];
  providerSections: VisionLabProviderSection[];
  sourceLinks: VisionLabSourceLink[];
  resultInspector?: VisionInspectorSnapshot;
}

export interface LoadVisionLabSnapshotOptions {
  projectRoot?: string;
  deviceProvider?: DeviceProvider;
  runner?: ProcessRunner;
  probeNetwork?: boolean;
  loadResults?: boolean;
}

async function safeProviderSection(
  providerId: string,
  label: string,
  loader: () => Promise<{ message: string; details?: string[] }>,
): Promise<VisionLabProviderSection> {
  try {
    const result = await loader();
    return {
      providerId,
      label,
      message: result.message,
      details: result.details ?? [],
    };
  } catch (error) {
    return {
      providerId,
      label,
      message: "Status unavailable.",
      error: error instanceof Error ? error.message : String(error),
      details: [],
    };
  }
}

function resolveConnectionState(input: {
  projectRoot?: string;
  visionStatus?: VisionStatusReport;
  devices?: VisionDevicesReport;
  providerSections: VisionLabProviderSection[];
}): { state: VisionLabConnectionState; label: string } {
  const selectionReasons = [
    ...(input.devices?.selectionReasons ?? []),
    ...(input.devices?.requiresSelection ? ["Multiple vision endpoints detected."] : []),
  ];

  if (selectionReasons.length > 0) {
    return {
      state: "selection-required",
      label: selectionReasons[0] ?? "Explicit endpoint selection required.",
    };
  }

  if (!input.projectRoot) {
    return {
      state: "offline",
      label: "No FTC project folder open — offline inspection only.",
    };
  }

  const reachable = input.devices?.endpoints.some(
    (endpoint) => endpoint.probe.reachable === "reachable",
  );
  const hasErrors = input.providerSections.some((section) => section.error);
  const hasSignals = (input.visionStatus?.discovery.signals.length ?? 0) > 0;

  if (hasErrors) {
    return {
      state: "partial",
      label: reachable
        ? "Some providers reported errors; others may be reachable."
        : "Some provider sections failed to load.",
    };
  }

  if (reachable || hasSignals) {
    return {
      state: "ready",
      label: reachable
        ? "Vision endpoints probed — read-only inspection mode."
        : "Workspace vision signals detected — no live camera connection.",
    };
  }

  return {
    state: "offline",
    label: "No reachable endpoints — configure `.ftc-dev.json` or connect a robot.",
  };
}

export async function loadVisionLabSnapshot(
  options: LoadVisionLabSnapshotOptions,
): Promise<VisionLabSnapshot> {
  const generatedAt = new Date().toISOString();
  const errors: string[] = [];
  const projectRoot = options.projectRoot?.trim() || undefined;
  const runner = options.runner ?? new NodeProcessRunner();
  const probeNetwork = options.probeNetwork !== false;

  bootstrapProviderCatalog();
  const providers = listVisionProviders();

  let visionStatus: VisionStatusReport | undefined;
  let devices: VisionDevicesReport | undefined;

  if (projectRoot) {
    try {
      visionStatus = await getVisionStatus(projectRoot);
    } catch (error) {
      errors.push(
        `Vision status failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    try {
      devices = await discoverVisionDevices(projectRoot, {
        deviceProvider: options.deviceProvider,
        runner,
        probeNetwork,
      });
    } catch (error) {
      errors.push(
        `Vision device discovery failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const enabledIds = new Set(visionStatus?.config.enabledProviderIds ?? []);
  const signalKinds = new Set(visionStatus?.discovery.signals.map((signal) => signal.kind) ?? []);
  const shouldLoad = (kind: string, providerId: string): boolean =>
    enabledIds.has(providerId) || signalKinds.has(kind as never);

  const providerSections: VisionLabProviderSection[] = [];

  if (projectRoot && shouldLoad("limelight", "vision:limelight")) {
    providerSections.push(
      await safeProviderSection("vision:limelight", "Limelight", async () => {
        const report = await getLimelightStatus(projectRoot, {
          deviceProvider: options.deviceProvider,
          runner,
        });
        const details = [
          `Host: ${report.host}`,
          `Reachable: ${report.reachable ? "yes" : "no"}`,
          report.pipelineIndex !== undefined ? `Pipeline index: ${report.pipelineIndex}` : "",
        ].filter(Boolean);
        return { message: report.message, details };
      }),
    );
  }

  if (projectRoot && shouldLoad("ftc-dashboard", "telemetry:ftc-dashboard")) {
    providerSections.push(
      await safeProviderSection("telemetry:ftc-dashboard", "FTC Dashboard", async () => {
        const report = await getFtcDashboardStatus(projectRoot, {
          deviceProvider: options.deviceProvider,
          runner,
          probeNetwork,
        });
        return {
          message: report.message,
          details: report.humanSummary,
        };
      }),
    );
  }

  if (projectRoot) {
    providerSections.push(
      await safeProviderSection("vision:bridge", "Diagnostic bridge", async () => {
        const report = await getVisionBridgeStatus(projectRoot);
        const details = [
          `VisionPortal detected: ${report.visionPortalDetected ? "yes" : "no"}`,
          `Bridge utility: ${report.bridgeUtility.present ? report.bridgeUtility.relativePath : "missing"}`,
          `Live VisionPortal diagnostics: ${report.capabilities.liveVisionPortalDiagnostics ? "supported" : "deferred"}`,
        ];
        return { message: report.message, details };
      }),
    );
  }

  if (projectRoot && shouldLoad("visionportal", "vision:visionportal")) {
    providerSections.push(
      await safeProviderSection("vision:visionportal", "VisionPortal", async () => {
        const report = await getVisionPortalStatus(projectRoot);
        return {
          message: report.message,
          details: report.humanSummary,
        };
      }),
    );
  }

  if (projectRoot && shouldLoad("easyopencv", "vision:easyopencv")) {
    providerSections.push(
      await safeProviderSection("vision:easyopencv", "EasyOpenCV", async () => {
        const report = await getEasyOpenCvStatus(projectRoot);
        return {
          message: report.message,
          details: report.humanSummary,
        };
      }),
    );
  }

  const sourceLinks: VisionLabSourceLink[] = [];
  if (projectRoot) {
    try {
      const portal = await getVisionPortalStatus(projectRoot);
      for (const config of portal.discovery.configs) {
        sourceLinks.push({
          label: config.className ?? pathBasename(config.relativePath),
          relativePath: config.relativePath,
          providerId: "vision:visionportal",
        });
      }
    } catch {
      // optional section
    }
    try {
      const eocv = await getEasyOpenCvStatus(projectRoot);
      for (const entry of eocv.discovery.sourceNavigation) {
        sourceLinks.push({
          label: entry.label,
          relativePath: entry.relativePath,
          providerId: "vision:easyopencv",
        });
      }
    } catch {
      // optional section
    }
  }

  const { state, label } = resolveConnectionState({
    projectRoot,
    visionStatus,
    devices,
    providerSections,
  });

  let resultInspector: VisionInspectorSnapshot | undefined;
  if (projectRoot && options.loadResults !== false && probeNetwork) {
    try {
      resultInspector = await buildVisionInspectorSnapshot({
        projectRoot,
        deviceProvider: options.deviceProvider,
        runner,
        probeNetwork,
      });
    } catch (error) {
      errors.push(
        `Result inspector failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return {
    projectRoot,
    generatedAt,
    connectionState: state,
    connectionLabel: label,
    errors,
    visionStatus,
    devices,
    providers,
    providerSections,
    sourceLinks,
    resultInspector,
  };
}

function pathBasename(relativePath: string): string {
  const parts = relativePath.split(/[/\\]/);
  return parts[parts.length - 1] ?? relativePath;
}
