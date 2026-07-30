import type { FriendlyError } from "../../types/errors.js";
import { VISION_DIAGNOSTIC_CODES, type VisionDiagnosticCode } from "./codes.js";
import type { VisionDiagnostic } from "./types.js";

export const FRIENDLY_BY_CODE: Record<
  VisionDiagnosticCode,
  Pick<FriendlyError, "title" | "summary" | "suggestedActions">
> = {
  [VISION_DIAGNOSTIC_CODES.VISION_PROJECT_UNSUPPORTED]: {
    title: "Not an official FTC project",
    summary: "Vision diagnostics require the standard FTC Gradle project layout with TeamCode.",
    suggestedActions: [
      "Open the FTC project root folder (the directory that contains settings.gradle and TeamCode).",
      "Run `ftc doctor` to verify project detection.",
    ],
  },
  [VISION_DIAGNOSTIC_CODES.VISION_NO_LIBRARIES]: {
    title: "No vision libraries detected",
    summary:
      "TeamCode and Gradle dependencies do not reference VisionPortal, EasyOpenCV, Limelight Vision, or FTC Dashboard yet.",
    suggestedActions: [
      "Add a vision library to your robot code or build.dependencies.gradle.",
      "Run `ftc vision discover` to rescan after adding imports.",
      "Use `ftc vision codegen` to scaffold starter Java for a provider.",
    ],
  },
  [VISION_DIAGNOSTIC_CODES.VISION_DEFAULT_PROVIDER_MISMATCH]: {
    title: "Default vision provider mismatch",
    summary:
      "`.ftc-dev.json` defaultProviderId differs from what workspace discovery suggests for this project.",
    suggestedActions: [
      "Update `vision.defaultProviderId` in `.ftc-dev.json` to match your primary camera stack.",
      "Or remove defaultProviderId to rely on discovery suggestions.",
      "Run `ftc vision status` to compare config and detected signals.",
    ],
  },
  [VISION_DIAGNOSTIC_CODES.VISION_CONFIG_ERROR]: {
    title: "Vision configuration error",
    summary: "`.ftc-dev.json` vision settings failed validation.",
    suggestedActions: [
      "Fix the reported fields in `.ftc-dev.json`.",
      "Run `ftc vision status --json` for config errors and warnings.",
    ],
  },
  [VISION_DIAGNOSTIC_CODES.VISION_CAMERA_NOT_CONFIGURED]: {
    title: "VisionPortal camera not configured",
    summary:
      "VisionPortal is referenced in TeamCode but no camera name or processor details were found.",
    suggestedActions: [
      "Set a webcam name that matches robot_config.xml when building VisionPortal.",
      "Run `ftc vision visionportal status` after configuring your OpMode.",
      "Use `ftc vision codegen visionportal` for a starter template.",
    ],
  },
  [VISION_DIAGNOSTIC_CODES.VISION_HARDWARE_NAME_MISMATCH]: {
    title: "Camera name mismatch",
    summary: "VisionPortal camera name does not match webcam entries in the robot configuration.",
    suggestedActions: [
      "Align the VisionPortal camera name with robot_config.xml webcam device names.",
      "Run `ftc config show` to review active hardware configuration.",
    ],
  },
  [VISION_DIAGNOSTIC_CODES.VISION_ENDPOINT_AMBIGUOUS]: {
    title: "Multiple vision endpoints",
    summary:
      "More than one camera or vision host matches discovery; explicit selection is required.",
    suggestedActions: [
      "Run `ftc vision devices --json` to review candidates.",
      "Set `vision.limelight.host` or `vision.dashboard.url` in `.ftc-dev.json`.",
      "Pass `--host` or `--url` when running vision commands.",
    ],
  },
  [VISION_DIAGNOSTIC_CODES.VISION_HOST_UNREACHABLE]: {
    title: "Vision host unreachable",
    summary: "Network probes could not reach one or more discovered vision endpoints.",
    suggestedActions: [
      "Confirm the robot or Limelight camera is powered and on the same network.",
      "Run `ftc wifi status` and connect Wi‑Fi ADB if using the Control Hub.",
      "Open the Limelight web UI at http://<host>:5801 to verify connectivity.",
    ],
  },
  [VISION_DIAGNOSTIC_CODES.VISION_LIMELIGHT_HOST_UNRESOLVED]: {
    title: "Limelight Vision host unresolved",
    summary: "Could not pick a single Limelight Vision host from config and discovery.",
    suggestedActions: [
      "Set `vision.limelight.host` in `.ftc-dev.json`.",
      "Pass `--host <address>` to limelight commands.",
      "Run `ftc vision devices --json` to review reachable hosts.",
    ],
  },
  [VISION_DIAGNOSTIC_CODES.VISION_SELECTION_REQUIRED]: {
    title: "Vision target selection required",
    summary: "Multiple cameras, OpModes, or hosts were detected; pick an explicit target.",
    suggestedActions: [
      "Run `ftc vision devices --json` for endpoint candidates.",
      "Specify `--host`, `--url`, or camera name flags on vision commands.",
    ],
  },
  [VISION_DIAGNOSTIC_CODES.VISION_DASHBOARD_URL_AMBIGUOUS]: {
    title: "FTC Dashboard URL ambiguous",
    summary: "More than one FTC Dashboard URL matches discovery.",
    suggestedActions: [
      "Set `vision.dashboard.url` in `.ftc-dev.json`.",
      "Pass `--url` or `--host` to dashboard commands.",
      "Run `ftc vision devices --json` to review candidates.",
    ],
  },
  [VISION_DIAGNOSTIC_CODES.VISION_DASHBOARD_UNREACHABLE]: {
    title: "FTC Dashboard unreachable",
    summary: "The resolved FTC Dashboard URL did not respond on the network.",
    suggestedActions: [
      "Confirm the robot OpMode is running and connected.",
      "Run `ftc vision dashboard status` for the resolved URL.",
      "Open the dashboard URL manually in a browser.",
    ],
  },
  [VISION_DIAGNOSTIC_CODES.VISION_BRIDGE_NOT_SCAFFOLDED]: {
    title: "Vision diagnostic bridge not scaffolded",
    summary: "Optional robot-side diagnostic bridge Java files are not present in TeamCode.",
    suggestedActions: [
      "Run `ftc vision bridge scaffold --yes` to add development-only bridge files.",
      "Use `ftc vision bridge status` to preview capabilities before scaffolding.",
    ],
  },
  [VISION_DIAGNOSTIC_CODES.VISION_PIPELINE_ARTIFACT_ERROR]: {
    title: "Limelight pipeline artifact error",
    summary: "Workspace Limelight pipeline JSON files failed validation.",
    suggestedActions: [
      "Run `ftc vision limelight pipelines validate` for file-level details.",
      "Fix JSON syntax, slot numbers (0–9), and duplicate slots.",
      "Set `vision.limelight.pipelineDirectory` if pipelines live outside the default folder.",
    ],
  },
  [VISION_DIAGNOSTIC_CODES.VISION_COMPETITION_NETWORK_CAUTION]: {
    title: "Competition network caution",
    summary:
      "Likely on a competition or robot Wi‑Fi network — vision streaming may be bandwidth-sensitive.",
    suggestedActions: [
      "Prefer USB debugging when tuning vision at events.",
      "Limit FTC Dashboard camera streams on shared competition Wi‑Fi.",
      "Run heavy vision probes from a shop network when possible.",
    ],
  },
};

export function visionDiagnosticToFriendlyError(diagnostic: VisionDiagnostic): FriendlyError {
  const template = FRIENDLY_BY_CODE[diagnostic.code];
  return {
    code: diagnostic.code,
    title: diagnostic.title || template.title,
    summary: diagnostic.summary || template.summary,
    suggestedActions:
      diagnostic.suggestedActions.length > 0
        ? diagnostic.suggestedActions
        : template.suggestedActions,
    technicalDetails: diagnostic.evidence.length > 0 ? diagnostic.evidence.join("\n") : undefined,
  };
}

export function friendlyForVisionDiagnosticCode(code: VisionDiagnosticCode): FriendlyError {
  const template = FRIENDLY_BY_CODE[code];
  return {
    code,
    ...template,
  };
}
