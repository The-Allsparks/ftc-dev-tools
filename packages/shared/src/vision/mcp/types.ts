export type VisionMcpToolKind = "read-only" | "mutating" | "deferred";

export interface VisionMcpToolDescriptor {
  name: string;
  kind: VisionMcpToolKind;
  summary: string;
  available: boolean;
  requiresEndpoint: boolean;
  requiresConfirmation: boolean;
  legacyEquivalent?: string;
  deferredReason?: string;
}

export interface VisionMcpDeferredResult {
  tool: string;
  deferred: true;
  message: string;
  equivalent?: string;
  requiredFields?: string[];
}

export interface VisionMcpSanitizeOptions {
  redact?: boolean;
  maxStringLength?: number;
}

export interface ResolveVisionEndpointResult {
  endpointId: string;
  host?: string;
  url?: string;
  providerId: string;
}
