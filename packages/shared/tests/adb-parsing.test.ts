import { describe, expect, it } from "vitest";
import { parseAdbDevicesOutput } from "../src/devices/adb-device-provider.js";
import {
  inferConnectionType,
  inferControlHubLikelihood,
} from "../src/devices/device-heuristics.js";

describe("ADB device parsing", () => {
  it("parses devices -l output", () => {
    const output = `
List of devices attached
ABC123 device usb:1-1 product:controlhub model:Control_Hub device:controlhub
192.168.43.1:5555 device product:phone model:Pixel_6
DEF456 unauthorized
GHI789 offline
`;
    const devices = parseAdbDevicesOutput(output);
    expect(devices).toHaveLength(4);
    expect(devices[0]?.serial).toBe("ABC123");
    expect(devices[0]?.state).toBe("device");
    expect(devices[0]?.authorization).toBe("authorized");
    expect(devices[1]?.connectionType).toBe("wifi");
    expect(devices[2]?.authorization).toBe("unauthorized");
    expect(devices[3]?.state).toBe("offline");
  });

  it("infers connection and control hub likelihood", () => {
    expect(inferConnectionType("192.168.1.20:5555")).toBe("wifi");
    expect(inferConnectionType("ABC123")).toBe("usb");
    expect(
      inferControlHubLikelihood({
        model: "Control Hub",
        manufacturer: "REV Robotics",
        props: {},
      }),
    ).toBe("probable");
    expect(
      inferControlHubLikelihood({
        model: "Pixel 6",
        manufacturer: "Google",
        props: {},
      }),
    ).toBe("unlikely");
  });
});
