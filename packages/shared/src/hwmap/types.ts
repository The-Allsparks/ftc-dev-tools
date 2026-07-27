import type { FriendlyError } from "../types/errors.js";

export type HardwareMapCategory = "actuator" | "sensor" | "vision" | "module" | "unknown";

export interface HardwareMapEntry {
  /** Name as configured on the Driver Station / in XML. */
  configName: string;
  /** XML element tag from the robot config. */
  xmlType: string;
  /** Java class/interface for hardwareMap.get, when known. */
  javaType?: string;
  /** Fully-qualified import for javaType. */
  javaImport?: string;
  /** Suggested Java field identifier. */
  fieldName: string;
  port?: string;
  category: HardwareMapCategory;
  /** Whether codegen emits a hardwareMap.get for this entry. */
  includedInCodegen: boolean;
}

export interface HardwareMapShowResult {
  success: boolean;
  configName?: string;
  configPath?: string;
  entries: HardwareMapEntry[];
  message: string;
  error?: FriendlyError;
}

export interface HardwareMapCodegenResult {
  success: boolean;
  dryRun: boolean;
  configName?: string;
  className?: string;
  relativePath?: string;
  absolutePath?: string;
  backupDirectory?: string;
  entryCount?: number;
  message: string;
  /** Generated source when dry-run or for inspection. */
  sourcePreview?: string;
  error?: FriendlyError;
}
