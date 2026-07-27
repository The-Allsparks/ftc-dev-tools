import { describe, expect, it } from "vitest";
import { selectDeploymentDevice } from "../src/devices/selection.js";
import type { AndroidDevice } from "../src/types/device.js";

function device(partial: Partial<AndroidDevice> & Pick<AndroidDevice, "serial">): AndroidDevice {
  return {
    state: "device",
    authorization: "authorized",
    connectionType: "usb",
    controlHubLikelihood: "unknown",
    rawProperties: {},
    ...partial,
  };
}

describe("device selection rules", () => {
  it("selects the only authorized device", () => {
    const result = selectDeploymentDevice({ devices: [device({ serial: "A" })] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.device.serial).toBe("A");
    }
  });

  it("refuses multiple devices without explicit serial", () => {
    const result = selectDeploymentDevice({
      devices: [device({ serial: "A" }), device({ serial: "B" })],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("MULTIPLE_DEVICES");
    }
  });

  it("honors explicit serial", () => {
    const result = selectDeploymentDevice({
      devices: [device({ serial: "A" }), device({ serial: "B" })],
      explicitSerial: "B",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.reason).toBe("explicit");
      expect(result.device.serial).toBe("B");
    }
  });

  it("reports unauthorized", () => {
    const result = selectDeploymentDevice({
      devices: [device({ serial: "A", state: "unauthorized", authorization: "unauthorized" })],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("DEVICE_UNAUTHORIZED");
    }
  });

  it("narrows by preferredConnection without silent multi-select", () => {
    const result = selectDeploymentDevice({
      devices: [
        device({ serial: "USB1", connectionType: "usb" }),
        device({ serial: "WIFI1", connectionType: "wifi" }),
      ],
      preferredConnection: "wifi",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.device.serial).toBe("WIFI1");
    }
  });

  it("reports when preferredConnection matches nothing", () => {
    const result = selectDeploymentDevice({
      devices: [device({ serial: "USB1", connectionType: "usb" })],
      preferredConnection: "wifi",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("NO_MATCHING_CONNECTION");
    }
  });

  it("still refuses multiple devices of the preferred connection type", () => {
    const result = selectDeploymentDevice({
      devices: [
        device({ serial: "WIFI1", connectionType: "wifi" }),
        device({ serial: "WIFI2", connectionType: "wifi" }),
      ],
      preferredConnection: "wifi",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("MULTIPLE_DEVICES");
    }
  });
});
