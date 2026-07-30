import type { VisionProviderDescriptor } from "./types.js";

const visionProviders = new Map<string, VisionProviderDescriptor>();

export function registerVisionProvider(descriptor: VisionProviderDescriptor): void {
  visionProviders.set(descriptor.id, descriptor);
}

export function listVisionProviders(): readonly VisionProviderDescriptor[] {
  return [...visionProviders.values()];
}

export function getVisionProvider(id: string): VisionProviderDescriptor | undefined {
  return visionProviders.get(id);
}

export function clearVisionProviders(): void {
  visionProviders.clear();
}
