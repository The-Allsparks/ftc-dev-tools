/**
 * Integration registry types (ADR-0003).
 * Metadata describes third-party FTC libraries and capability modules.
 */

/** Schema version for integration manifest documents. */
export const INTEGRATION_MANIFEST_SCHEMA_VERSION = "1.0.0";

export type IntegrationCategory =
  | "official"
  | "pathing"
  | "framework"
  | "dashboard"
  | "vision"
  | "hardware"
  | "localization"
  | "simulation";

/** Capability tags aligned with library-capability-matrix.md */
export type IntegrationCapability =
  | "path-planning"
  | "commands"
  | "vision"
  | "dashboard"
  | "replay"
  | "simulation"
  | "logging"
  | "hardware"
  | "localization"
  | "code-generation";

export type EcosystemClassification =
  "official" | "supported" | "experimental" | "legacy" | "deprecated";

export interface IntegrationManifest {
  /** Stable kebab-case identifier */
  id: string;
  /** Human-readable name */
  displayName: string;
  category: IntegrationCategory;
  classification: EcosystemClassification;
  capabilities: IntegrationCapability[];
  /** Semver ranges for FTC SDK, e.g. "8.2+" */
  supportedSdkVersions: string[];
  /** Semver ranges for FTC Dev Tools that know this integration */
  supportedFtcDevToolsVersions: string[];
  robotLanguage: "java";
  desktopLanguage: "typescript";
  replaySupport: boolean;
  simulationSupport: boolean;
  /** Primary documentation URL */
  documentationUrl: string;
  /** When true, integration is not recommended for new projects */
  experimental: boolean;
  /** When true, integration is no longer recommended */
  deprecated: boolean;
  /** Optional CLI subcommand group, e.g. "pedro" */
  cliCommand?: string;
  /** Short student-friendly summary */
  summary: string;
}
