/** Stable JSON envelope version for vision CLI machine output (VISION-15). */
export const VISION_CLI_SCHEMA_VERSION = "1.0.0";

/** Documented exit codes for `ftc vision` commands. */
export const VISION_CLI_EXIT = {
  SUCCESS: 0,
  ERROR: 1,
  SELECTION_REQUIRED: 2,
  UNREACHABLE: 3,
  DEFERRED: 4,
} as const;

export type VisionCliExitCode = (typeof VISION_CLI_EXIT)[keyof typeof VISION_CLI_EXIT];

export const VISION_CLI_EXIT_DOCS: Record<VisionCliExitCode, string> = {
  [VISION_CLI_EXIT.SUCCESS]: "Command completed successfully.",
  [VISION_CLI_EXIT.ERROR]: "Validation, configuration, or unexpected failure.",
  [VISION_CLI_EXIT.SELECTION_REQUIRED]:
    "Multiple robots, cameras, or endpoints match — pass --host, --url, --endpoint, or --device.",
  [VISION_CLI_EXIT.UNREACHABLE]: "Network probe or open action could not reach the target.",
  [VISION_CLI_EXIT.DEFERRED]:
    "Command is cataloged but not implemented yet (foundation milestone).",
};
