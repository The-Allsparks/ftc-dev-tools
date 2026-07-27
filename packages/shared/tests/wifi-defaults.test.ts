import { describe, expect, it } from "vitest";
import { parseCidr, parseHostPort } from "../src/wifi/defaults.js";

describe("wifi defaults", () => {
  it("parseHostPort uses defaults", () => {
    expect(parseHostPort(undefined)).toEqual({
      host: "192.168.43.1",
      port: 5555,
      endpoint: "192.168.43.1:5555",
    });
  });

  it("parseHostPort parses host:port", () => {
    expect(parseHostPort("10.0.0.5:5555")).toEqual({
      host: "10.0.0.5",
      port: 5555,
      endpoint: "10.0.0.5:5555",
    });
  });

  it("parseCidr converts /24", () => {
    expect(parseCidr("192.168.43.0/24")).toEqual({
      network: "192.168.43.0",
      mask: "255.255.255.0",
    });
  });
});
