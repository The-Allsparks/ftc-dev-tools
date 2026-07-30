import type { ReplayBackendDescriptor } from "./types.js";

const replayBackends = new Map<string, ReplayBackendDescriptor>();

export function registerReplayBackend(descriptor: ReplayBackendDescriptor): void {
  replayBackends.set(descriptor.id, descriptor);
}

export function listReplayBackends(): readonly ReplayBackendDescriptor[] {
  return [...replayBackends.values()];
}

export function getReplayBackend(id: string): ReplayBackendDescriptor | undefined {
  return replayBackends.get(id);
}

export function clearReplayBackends(): void {
  replayBackends.clear();
}
