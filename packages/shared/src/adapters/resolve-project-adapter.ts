import { OfficialFtcProjectAdapter } from "./official-ftc-project-adapter.js";
import type { ProjectAdapter } from "../types/project.js";

/** Returns an injected adapter or the default FTC project adapter. */
export function resolveProjectAdapter(adapter?: ProjectAdapter): ProjectAdapter {
  return adapter ?? new OfficialFtcProjectAdapter();
}
