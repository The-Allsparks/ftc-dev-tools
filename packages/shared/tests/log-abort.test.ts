import { describe, expect, it } from "vitest";
import { MockDeviceProvider } from "../src/devices/mock-device-provider.js";

describe("abortable log streaming", () => {
  it("stops yielding when the abort signal fires before iteration", async () => {
    const mock = new MockDeviceProvider({ scenario: "one" });
    const [device] = await mock.listDevices();
    const controller = new AbortController();
    controller.abort();
    const entries = [];
    for await (const entry of mock.streamLogs(device!, {
      filter: "all",
      signal: controller.signal,
    })) {
      entries.push(entry);
    }
    expect(entries).toEqual([]);
  });

  it("yields filtered mock logs when not aborted", async () => {
    const mock = new MockDeviceProvider({ scenario: "one" });
    const [device] = await mock.listDevices();
    const entries = [];
    for await (const entry of mock.streamLogs(device!, { filter: "errors" })) {
      entries.push(entry);
    }
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((entry) => /E|F/i.test(entry.level))).toBe(true);
  });
});
