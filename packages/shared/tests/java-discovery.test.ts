import { describe, expect, it } from "vitest";
import {
  parseJavaMajorVersion,
  suggestFtcJavaHomeSetting,
} from "../src/discovery/java-discovery.js";

describe("parseJavaMajorVersion", () => {
  it("parses quoted semver style from OpenJDK", () => {
    expect(parseJavaMajorVersion('openjdk version "17.0.9" 2023-10-17')).toBe(17);
  });

  it("parses legacy 1.8 style as major 8", () => {
    expect(parseJavaMajorVersion('java version "1.8.0_392"')).toBe(8);
  });

  it("parses unquoted version tokens", () => {
    expect(parseJavaMajorVersion("openjdk version 11.0.22")).toBe(11);
  });

  it("returns undefined when no version is present", () => {
    expect(parseJavaMajorVersion("not java output")).toBeUndefined();
  });
});

describe("suggestFtcJavaHomeSetting", () => {
  it("suggests selected home when PATH java is older", () => {
    expect(
      suggestFtcJavaHomeSetting(
        {
          found: true,
          majorVersion: 17,
          selectedJavaHome: "C:\\jdk-17",
          pathMajorVersion: 11,
        },
        undefined,
      ),
    ).toBe("C:\\jdk-17");
  });

  it("does not override an existing setting", () => {
    expect(
      suggestFtcJavaHomeSetting(
        {
          found: true,
          majorVersion: 17,
          selectedJavaHome: "C:\\jdk-17",
          pathMajorVersion: 11,
        },
        "C:\\already-set",
      ),
    ).toBeUndefined();
  });
});
