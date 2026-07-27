import { describe, expect, it } from "vitest";
import { MockDeviceProvider } from "../src/devices/mock-device-provider.js";

describe("MockDeviceProvider", () => {
  it("supports no connected device", async () => {
    const mock = new MockDeviceProvider({ scenario: "none" });
    await expect(mock.listDevices()).resolves.toEqual([]);
  });

  it("supports one connected device", async () => {
    const mock = new MockDeviceProvider({ scenario: "one" });
    const devices = await mock.listDevices();
    expect(devices).toHaveLength(1);
    expect(devices[0]?.authorization).toBe("authorized");
  });

  it("supports unauthorized and offline devices", async () => {
    const unauthorized = new MockDeviceProvider({ scenario: "unauthorized" });
    expect((await unauthorized.listDevices())[0]?.state).toBe("unauthorized");
    const offline = new MockDeviceProvider({ scenario: "offline" });
    expect((await offline.listDevices())[0]?.state).toBe("offline");
  });

  it("supports multiple devices", async () => {
    const mock = new MockDeviceProvider({ scenario: "multiple" });
    expect(await mock.listDevices()).toHaveLength(2);
  });

  it("supports successful and failed APK installation", async () => {
    const ok = new MockDeviceProvider({ scenario: "install-success" });
    const [device] = await ok.listDevices();
    await expect(ok.installApk(device!, "app.apk")).resolves.toBeUndefined();

    const fail = new MockDeviceProvider({ scenario: "install-fail" });
    const [failDevice] = await fail.listDevices();
    await expect(fail.installApk(failDevice!, "app.apk")).rejects.toMatchObject({
      code: "INSTALL_FAILED",
    });
  });

  it("supports disconnect during deployment", async () => {
    const mock = new MockDeviceProvider({ scenario: "disconnect-during-deploy" });
    const [device] = await mock.listDevices();
    await expect(mock.installApk(device!, "app.apk")).rejects.toMatchObject({
      code: "DEVICE_OFFLINE",
    });
    await expect(mock.listDevices()).resolves.toEqual([]);
  });
});
