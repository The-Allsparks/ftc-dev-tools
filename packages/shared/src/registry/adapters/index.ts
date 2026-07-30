import type { IntegrationAdapter } from "../adapter-types.js";
import { pedroPathingIntegrationAdapter } from "./pedro-integration-adapter.js";

/** Shipped integration adapters keyed by manifest id (ADR-0010). */
export const BUILTIN_INTEGRATION_ADAPTERS: readonly IntegrationAdapter[] = [
  pedroPathingIntegrationAdapter,
];
