import type { DeviceProvider } from "../types/device.js";

/** Best-effort device provider creation; returns undefined when adb is unavailable. */
export async function tryCreateOptionalDeviceProvider(
  createDeviceProvider: () => Promise<DeviceProvider>,
): Promise<DeviceProvider | undefined> {
  try {
    return await createDeviceProvider();
  } catch {
    return undefined;
  }
}
