import type { TelemetryProviderDescriptor } from "./types.js";

const telemetryProviders = new Map<string, TelemetryProviderDescriptor>();

export function registerTelemetryProvider(descriptor: TelemetryProviderDescriptor): void {
  telemetryProviders.set(descriptor.id, descriptor);
}

export function listTelemetryProviders(): readonly TelemetryProviderDescriptor[] {
  return [...telemetryProviders.values()];
}

export function getTelemetryProvider(id: string): TelemetryProviderDescriptor | undefined {
  return telemetryProviders.get(id);
}

export function clearTelemetryProviders(): void {
  telemetryProviders.clear();
}
