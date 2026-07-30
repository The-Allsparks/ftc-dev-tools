import type { FrameProviderDescriptor } from "./types.js";

const frameProviders = new Map<string, FrameProviderDescriptor>();

/** Register a frame provider. Later registrations replace same id. */
export function registerFrameProvider(descriptor: FrameProviderDescriptor): void {
  frameProviders.set(descriptor.id, descriptor);
}

export function listFrameProviders(): readonly FrameProviderDescriptor[] {
  return [...frameProviders.values()];
}

export function getFrameProvider(id: string): FrameProviderDescriptor | undefined {
  return frameProviders.get(id);
}

export function clearFrameProviders(): void {
  frameProviders.clear();
}
