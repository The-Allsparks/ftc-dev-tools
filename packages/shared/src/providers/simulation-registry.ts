import type { SimulationRuntimeDescriptor } from "./types.js";

const simulationRuntimes = new Map<string, SimulationRuntimeDescriptor>();

export function registerSimulationRuntime(descriptor: SimulationRuntimeDescriptor): void {
  simulationRuntimes.set(descriptor.id, descriptor);
}

export function listSimulationRuntimes(): readonly SimulationRuntimeDescriptor[] {
  return [...simulationRuntimes.values()];
}

export function getSimulationRuntime(id: string): SimulationRuntimeDescriptor | undefined {
  return simulationRuntimes.get(id);
}

export function clearSimulationRuntimes(): void {
  simulationRuntimes.clear();
}
