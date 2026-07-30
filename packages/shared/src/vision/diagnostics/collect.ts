import path from "node:path";
import { discoverVisionDevices } from "../endpoints/discover-devices.js";
import { getFtcDashboardStatus } from "../dashboard/status.js";
import { getVisionBridgeStatus } from "../bridge/status.js";
import { validateLimelightArtifacts } from "../limelight/artifacts/validate.js";
import { resolveLimelightHostReport } from "../limelight/resolve-host.js";
import { getVisionStatus } from "../status.js";
import { discoverVisionPortalWorkspace } from "../visionportal/discover.js";
import { VISION_DIAGNOSTIC_CODES } from "./codes.js";
import { VISION_DIAGNOSTICS_CAPABILITIES } from "./capabilities.js";
import { FRIENDLY_BY_CODE } from "./friendly.js";
import type {
  CollectVisionDiagnosticsOptions,
  VisionDiagnostic,
  VisionDiagnosticsReport,
  VisionDiagnosticSeverity,
} from "./types.js";

function makeDiagnostic(
  code: VisionDiagnostic["code"],
  severity: VisionDiagnosticSeverity,
  evidence: string[],
  overrides?: Partial<
    Pick<VisionDiagnostic, "summary" | "suggestedActions" | "confidence" | "providerId">
  >,
): VisionDiagnostic {
  const template = FRIENDLY_BY_CODE[code];
  return {
    code,
    severity,
    confidence: overrides?.confidence ?? "certain",
    title: template.title,
    summary: overrides?.summary ?? template.summary,
    evidence,
    suggestedActions: overrides?.suggestedActions ?? template.suggestedActions,
    docLink: "docs/architecture/vision-diagnostics.md",
    providerId: overrides?.providerId,
  };
}

function summarizeDiagnostics(diagnostics: VisionDiagnostic[]): VisionDiagnosticsReport["summary"] {
  return {
    errorCount: diagnostics.filter((d) => d.severity === "error").length,
    warnCount: diagnostics.filter((d) => d.severity === "warn").length,
    infoCount: diagnostics.filter((d) => d.severity === "info").length,
  };
}

function buildMessage(summary: VisionDiagnosticsReport["summary"]): string {
  if (summary.errorCount > 0) {
    return `Found ${summary.errorCount} vision setup error(s) and ${summary.warnCount} warning(s).`;
  }
  if (summary.warnCount > 0) {
    return `Vision setup looks mostly OK with ${summary.warnCount} warning(s) to review.`;
  }
  if (summary.infoCount > 0) {
    return `Vision setup looks OK (${summary.infoCount} informational note(s)).`;
  }
  return "Vision setup looks OK — no diagnostics reported.";
}

export async function collectVisionDiagnostics(
  projectRoot: string,
  options: CollectVisionDiagnosticsOptions = {},
): Promise<VisionDiagnosticsReport> {
  const root = path.resolve(projectRoot);
  const generatedAt = new Date().toISOString();
  const probeNetwork = options.probeNetwork ?? Boolean(options.deviceProvider);
  const diagnostics: VisionDiagnostic[] = [];

  const visionStatus = await getVisionStatus(root);
  const { discovery, config } = visionStatus;

  if (!discovery.isOfficialFtcProject) {
    diagnostics.push(
      makeDiagnostic(VISION_DIAGNOSTIC_CODES.VISION_PROJECT_UNSUPPORTED, "error", [
        visionStatus.message,
        ...discovery.warnings,
      ]),
    );
    const summary = summarizeDiagnostics(diagnostics);
    return {
      projectRoot: root,
      generatedAt,
      probeNetwork,
      diagnostics,
      summary,
      message: buildMessage(summary),
      capabilities: { ...VISION_DIAGNOSTICS_CAPABILITIES },
    };
  }

  if (visionStatus.configErrors.length > 0) {
    diagnostics.push(
      makeDiagnostic(VISION_DIAGNOSTIC_CODES.VISION_CONFIG_ERROR, "error", [
        ...visionStatus.configErrors,
        ...visionStatus.configWarnings,
      ]),
    );
  }

  if (discovery.signals.length === 0) {
    diagnostics.push(
      makeDiagnostic(VISION_DIAGNOSTIC_CODES.VISION_NO_LIBRARIES, "warn", [visionStatus.message]),
    );
  }

  for (const warning of discovery.warnings) {
    if (/defaultProviderId.*differs from discovery suggestion/i.test(warning)) {
      diagnostics.push(
        makeDiagnostic(VISION_DIAGNOSTIC_CODES.VISION_DEFAULT_PROVIDER_MISMATCH, "warn", [warning]),
      );
    }
  }

  if (config.defaultProviderId && discovery.suggestedDefaultProviderId) {
    if (config.defaultProviderId !== discovery.suggestedDefaultProviderId) {
      const line = `Configured defaultProviderId "${config.defaultProviderId}" differs from discovery suggestion "${discovery.suggestedDefaultProviderId}".`;
      if (
        !diagnostics.some(
          (d) => d.code === VISION_DIAGNOSTIC_CODES.VISION_DEFAULT_PROVIDER_MISMATCH,
        )
      ) {
        diagnostics.push(
          makeDiagnostic(VISION_DIAGNOSTIC_CODES.VISION_DEFAULT_PROVIDER_MISMATCH, "warn", [line]),
        );
      }
    }
  }

  const hasVisionPortal = discovery.signals.some((signal) => signal.kind === "visionportal");
  const hasLimelight = discovery.signals.some((signal) => signal.kind === "limelight");
  const hasDashboard =
    discovery.signals.some((signal) => signal.kind === "ftc-dashboard") ||
    Boolean(config.dashboard?.url);

  if (hasVisionPortal) {
    const portalDiscovery = await discoverVisionPortalWorkspace(root);
    const hasCameraDetail = portalDiscovery.configs.some(
      (entry) =>
        Boolean(entry.cameraName) || Boolean(entry.resolution) || entry.processors.length > 0,
    );
    if (!hasCameraDetail) {
      diagnostics.push(
        makeDiagnostic(
          VISION_DIAGNOSTIC_CODES.VISION_CAMERA_NOT_CONFIGURED,
          "warn",
          [
            "VisionPortal import detected without camera name, resolution, or processor details.",
            ...portalDiscovery.warnings,
          ],
          { providerId: "vision:visionportal" },
        ),
      );
    }
    for (const reason of portalDiscovery.selectionReasons) {
      if (/does not match robot config webcams/i.test(reason)) {
        diagnostics.push(
          makeDiagnostic(VISION_DIAGNOSTIC_CODES.VISION_HARDWARE_NAME_MISMATCH, "warn", [reason], {
            providerId: "vision:visionportal",
          }),
        );
      } else if (portalDiscovery.requiresSelection) {
        diagnostics.push(
          makeDiagnostic(VISION_DIAGNOSTIC_CODES.VISION_SELECTION_REQUIRED, "warn", [reason], {
            providerId: "vision:visionportal",
          }),
        );
      }
    }
  }

  if (hasLimelight) {
    const pipelineValidation = await validateLimelightArtifacts(root);
    if (!pipelineValidation.success) {
      const evidence = pipelineValidation.issues
        .filter((issue) => issue.severity === "error")
        .map((issue) => `${issue.relativePath}: ${issue.message}`);
      diagnostics.push(
        makeDiagnostic(
          VISION_DIAGNOSTIC_CODES.VISION_PIPELINE_ARTIFACT_ERROR,
          pipelineValidation.errorCount > 0 ? "error" : "warn",
          evidence.length > 0 ? evidence : [pipelineValidation.message],
          { providerId: "vision:limelight" },
        ),
      );
    } else if (pipelineValidation.warningCount > 0) {
      diagnostics.push(
        makeDiagnostic(
          VISION_DIAGNOSTIC_CODES.VISION_PIPELINE_ARTIFACT_ERROR,
          "warn",
          pipelineValidation.issues
            .filter((issue) => issue.severity === "warning")
            .map((issue) => `${issue.relativePath}: ${issue.message}`),
          { providerId: "vision:limelight" },
        ),
      );
    }
  }

  const bridgeStatus = await getVisionBridgeStatus(root);
  if (
    hasVisionPortal &&
    (!bridgeStatus.bridgeUtility.present || !bridgeStatus.diagnosticOpMode.present)
  ) {
    diagnostics.push(
      makeDiagnostic(
        VISION_DIAGNOSTIC_CODES.VISION_BRIDGE_NOT_SCAFFOLDED,
        "info",
        [bridgeStatus.message],
        { providerId: "vision:visionportal" },
      ),
    );
  }

  if (probeNetwork) {
    const devicesReport = await discoverVisionDevices(root, {
      deviceProvider: options.deviceProvider,
      runner: options.runner,
      platform: options.platform,
      fetchImpl: options.fetchImpl,
      probeNetwork: true,
    });

    if (devicesReport.requiresSelection) {
      diagnostics.push(
        makeDiagnostic(
          VISION_DIAGNOSTIC_CODES.VISION_ENDPOINT_AMBIGUOUS,
          "warn",
          devicesReport.selectionReasons.length > 0
            ? devicesReport.selectionReasons
            : [devicesReport.message],
        ),
      );
    }

    const unreachable = devicesReport.endpoints.filter(
      (endpoint) => endpoint.probe.reachable === "unreachable" && endpoint.host,
    );
    if (unreachable.length > 0) {
      diagnostics.push(
        makeDiagnostic(
          VISION_DIAGNOSTIC_CODES.VISION_HOST_UNREACHABLE,
          "warn",
          unreachable.map(
            (endpoint) =>
              `${endpoint.kind} ${endpoint.host}:${endpoint.port ?? "?"} — ${endpoint.probe.message ?? "unreachable"}`,
          ),
          { confidence: "likely" },
        ),
      );
    }

    if (devicesReport.context.robotRoutePresent === true) {
      diagnostics.push(
        makeDiagnostic(
          VISION_DIAGNOSTIC_CODES.VISION_COMPETITION_NETWORK_CAUTION,
          "info",
          ["Robot route to 192.168.43.0/24 is present on this computer."],
          { confidence: "likely" },
        ),
      );
    }

    if (hasLimelight || config.limelight?.host) {
      const limelightHost = await resolveLimelightHostReport(root, {
        deviceProvider: options.deviceProvider,
        runner: options.runner,
        probeNetwork: true,
      });
      if (limelightHost.requiresSelection) {
        diagnostics.push(
          makeDiagnostic(
            VISION_DIAGNOSTIC_CODES.VISION_LIMELIGHT_HOST_UNRESOLVED,
            "warn",
            limelightHost.candidates?.length
              ? limelightHost.candidates.map(
                  (candidate) =>
                    `${candidate.host}${candidate.reachable ? " (reachable)" : ""} — ${candidate.evidence}`,
                )
              : [limelightHost.message],
            { providerId: "vision:limelight" },
          ),
        );
      }
    }

    if (hasDashboard || config.dashboard?.url) {
      const dashboardStatus = await getFtcDashboardStatus(root, {
        deviceProvider: options.deviceProvider,
        runner: options.runner,
        probeNetwork: true,
        fetchImpl: options.fetchImpl,
      });
      if (dashboardStatus.urlResolution?.requiresSelection) {
        diagnostics.push(
          makeDiagnostic(
            VISION_DIAGNOSTIC_CODES.VISION_DASHBOARD_URL_AMBIGUOUS,
            "warn",
            dashboardStatus.urlResolution.candidates?.length
              ? dashboardStatus.urlResolution.candidates.map(
                  (candidate) => `${candidate.url} — ${candidate.evidence}`,
                )
              : [dashboardStatus.urlResolution.message],
            { providerId: "telemetry:ftc-dashboard" },
          ),
        );
      } else if (
        dashboardStatus.url &&
        dashboardStatus.reachable &&
        dashboardStatus.reachable !== "reachable"
      ) {
        diagnostics.push(
          makeDiagnostic(
            VISION_DIAGNOSTIC_CODES.VISION_DASHBOARD_UNREACHABLE,
            "warn",
            [dashboardStatus.message, ...dashboardStatus.humanSummary],
            { providerId: "telemetry:ftc-dashboard", confidence: "likely" },
          ),
        );
      }
    }
  }

  const summary = summarizeDiagnostics(diagnostics);
  return {
    projectRoot: root,
    generatedAt,
    probeNetwork,
    diagnostics,
    summary,
    message: buildMessage(summary),
    capabilities: { ...VISION_DIAGNOSTICS_CAPABILITIES },
  };
}
