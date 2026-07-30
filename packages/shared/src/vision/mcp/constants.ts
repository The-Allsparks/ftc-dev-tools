/** Agent-facing vision MCP tool catalog version (VISION-16). */
export const VISION_MCP_CATALOG_VERSION = "1.0.0";

export const VISION_MCP_AGENT_TOOL_NAMES = [
  "vision_list_devices",
  "vision_get_status",
  "vision_get_diagnostics",
  "vision_list_pipelines",
  "vision_validate_pipeline",
  "vision_compare_pipeline",
  "vision_list_sessions",
  "vision_inspect_session",
  "vision_analyze_recording",
  "vision_generate_code",
  "vision_capture_frame",
  "vision_upload_pipeline",
  "vision_activate_pipeline",
  "vision_upload_python",
  "vision_upload_fieldmap",
] as const;

export type VisionMcpAgentToolName = (typeof VISION_MCP_AGENT_TOOL_NAMES)[number];
