import type { DoctorCheck } from "../../types/errors.js";
import { DOCTOR_CHECK_LABELS, DOCTOR_SKIP_DETAILS } from "../../doctor/doctor-copy.js";
import { VISION_DIAGNOSTIC_CODES, type VisionDiagnosticCode } from "./codes.js";
import { collectVisionDiagnostics } from "./collect.js";
import { visionDiagnosticToFriendlyError } from "./friendly.js";
import type {
  CollectVisionDiagnosticsOptions,
  VisionDiagnostic,
  VisionDiagnosticsReport,
} from "./types.js";

const WORKSPACE_CODES = new Set<VisionDiagnosticCode>([
  VISION_DIAGNOSTIC_CODES.VISION_PROJECT_UNSUPPORTED,
  VISION_DIAGNOSTIC_CODES.VISION_NO_LIBRARIES,
  VISION_DIAGNOSTIC_CODES.VISION_DEFAULT_PROVIDER_MISMATCH,
  VISION_DIAGNOSTIC_CODES.VISION_CONFIG_ERROR,
  VISION_DIAGNOSTIC_CODES.VISION_CAMERA_NOT_CONFIGURED,
  VISION_DIAGNOSTIC_CODES.VISION_HARDWARE_NAME_MISMATCH,
]);

const NETWORK_CODES = new Set<VisionDiagnosticCode>([
  VISION_DIAGNOSTIC_CODES.VISION_ENDPOINT_AMBIGUOUS,
  VISION_DIAGNOSTIC_CODES.VISION_HOST_UNREACHABLE,
  VISION_DIAGNOSTIC_CODES.VISION_LIMELIGHT_HOST_UNRESOLVED,
  VISION_DIAGNOSTIC_CODES.VISION_SELECTION_REQUIRED,
  VISION_DIAGNOSTIC_CODES.VISION_DASHBOARD_URL_AMBIGUOUS,
  VISION_DIAGNOSTIC_CODES.VISION_DASHBOARD_UNREACHABLE,
  VISION_DIAGNOSTIC_CODES.VISION_COMPETITION_NETWORK_CAUTION,
]);

const ARTIFACT_CODES = new Set<VisionDiagnosticCode>([
  VISION_DIAGNOSTIC_CODES.VISION_PIPELINE_ARTIFACT_ERROR,
  VISION_DIAGNOSTIC_CODES.VISION_BRIDGE_NOT_SCAFFOLDED,
]);

function worstSeverity(diagnostics: VisionDiagnostic[]): "pass" | "warn" | "fail" {
  if (diagnostics.some((d) => d.severity === "error")) {
    return "fail";
  }
  if (diagnostics.some((d) => d.severity === "warn")) {
    return "warn";
  }
  return "pass";
}

function pickPrimaryDiagnostic(diagnostics: VisionDiagnostic[]): VisionDiagnostic | undefined {
  const order: VisionDiagnostic["severity"][] = ["error", "warn", "info"];
  for (const severity of order) {
    const hit = diagnostics.find((d) => d.severity === severity);
    if (hit) {
      return hit;
    }
  }
  return undefined;
}

function buildCheckFromDiagnostics(
  id: string,
  label: string,
  diagnostics: VisionDiagnostic[],
  passDetail: string,
): DoctorCheck {
  const severity = worstSeverity(diagnostics);
  const primary = pickPrimaryDiagnostic(diagnostics);
  const status = severity === "fail" ? "fail" : severity === "warn" ? "warn" : "pass";
  const detail =
    status === "pass" ? passDetail : primary ? `${primary.title}: ${primary.summary}` : passDetail;

  return {
    id,
    label,
    status,
    required: false,
    detail,
    friendlyError: primary ? visionDiagnosticToFriendlyError(primary) : undefined,
  };
}

export interface BuildVisionDoctorChecksOptions extends CollectVisionDiagnosticsOptions {
  projectPass: boolean;
  checkVision?: boolean;
}

export async function buildVisionDoctorChecks(
  projectRoot: string,
  options: BuildVisionDoctorChecksOptions,
): Promise<{ checks: DoctorCheck[]; report?: VisionDiagnosticsReport }> {
  if (options.checkVision === false) {
    const skipDetail = "Skipped because this run turned off optional vision setup checks.";
    return {
      checks: [
        {
          id: "vision-workspace",
          label: DOCTOR_CHECK_LABELS.visionWorkspace,
          status: "skip",
          required: false,
          detail: skipDetail,
        },
        {
          id: "vision-network",
          label: DOCTOR_CHECK_LABELS.visionNetwork,
          status: "skip",
          required: false,
          detail: skipDetail,
        },
        {
          id: "vision-artifacts",
          label: DOCTOR_CHECK_LABELS.visionArtifacts,
          status: "skip",
          required: false,
          detail: skipDetail,
        },
      ],
    };
  }

  if (!options.projectPass) {
    const skipDetail = DOCTOR_SKIP_DETAILS.visionNoProject;
    return {
      checks: [
        {
          id: "vision-workspace",
          label: DOCTOR_CHECK_LABELS.visionWorkspace,
          status: "skip",
          required: false,
          detail: skipDetail,
        },
        {
          id: "vision-network",
          label: DOCTOR_CHECK_LABELS.visionNetwork,
          status: "skip",
          required: false,
          detail: skipDetail,
        },
        {
          id: "vision-artifacts",
          label: DOCTOR_CHECK_LABELS.visionArtifacts,
          status: "skip",
          required: false,
          detail: skipDetail,
        },
      ],
    };
  }

  const report = await collectVisionDiagnostics(projectRoot, options);
  const workspace = report.diagnostics.filter((d) => WORKSPACE_CODES.has(d.code));
  const network = report.diagnostics.filter((d) => NETWORK_CODES.has(d.code));
  const artifacts = report.diagnostics.filter((d) => ARTIFACT_CODES.has(d.code));

  const checks: DoctorCheck[] = [
    buildCheckFromDiagnostics(
      "vision-workspace",
      DOCTOR_CHECK_LABELS.visionWorkspace,
      workspace,
      "Vision libraries and workspace configuration look OK.",
    ),
  ];

  if (!report.probeNetwork) {
    checks.push({
      id: "vision-network",
      label: DOCTOR_CHECK_LABELS.visionNetwork,
      status: "skip",
      required: false,
      detail: DOCTOR_SKIP_DETAILS.visionNetworkNotProbed,
    });
  } else {
    checks.push(
      buildCheckFromDiagnostics(
        "vision-network",
        DOCTOR_CHECK_LABELS.visionNetwork,
        network.filter((d) => d.severity !== "info"),
        report.probeNetwork
          ? "Vision endpoints probed successfully."
          : "Vision network checks skipped.",
      ),
    );
  }

  checks.push(
    buildCheckFromDiagnostics(
      "vision-artifacts",
      DOCTOR_CHECK_LABELS.visionArtifacts,
      artifacts.filter(
        (d) =>
          !(
            d.code === VISION_DIAGNOSTIC_CODES.VISION_BRIDGE_NOT_SCAFFOLDED && d.severity === "info"
          ),
      ),
      "Pipeline artifacts and optional bridge look OK.",
    ),
  );

  return { checks, report };
}
