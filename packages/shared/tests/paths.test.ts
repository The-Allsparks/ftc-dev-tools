import { describe, expect, it } from "vitest";
import {
  commonAndroidSdkCandidates,
  expandHome,
  gradleWrapperName,
  adbExecutableName,
} from "../src/paths/os-paths.js";
import { assertSafeCommandSpec, formatCommandForDisplay } from "../src/process/sanitize.js";

describe("path handling", () => {
  it("handles Windows, macOS, and Linux candidates", () => {
    expect(gradleWrapperName("win32")).toBe("gradlew.bat");
    expect(gradleWrapperName("darwin")).toBe("gradlew");
    expect(gradleWrapperName("linux")).toBe("gradlew");
    expect(adbExecutableName("win32")).toBe("adb.exe");
    expect(adbExecutableName("linux")).toBe("adb");

    const win = commonAndroidSdkCandidates(
      "win32",
      { LOCALAPPDATA: "C:\\\\Users\\\\a\\\\AppData\\\\Local" },
      "C:\\\\Users\\\\a",
    );
    expect(win.some((p) => p.includes("Android"))).toBe(true);

    const mac = commonAndroidSdkCandidates("darwin", {}, "/Users/a");
    expect(mac.some((p) => p.includes("Library"))).toBe(true);

    const linux = commonAndroidSdkCandidates(
      "linux",
      { ANDROID_HOME: "/opt/android-sdk" },
      "/home/a",
    );
    expect(linux[0]).toBe("/opt/android-sdk");
  });

  it("expands home and sanitizes command specs", () => {
    expect(expandHome("~/Android/Sdk", "/home/team")).toContain("Android");
    expect(() =>
      assertSafeCommandSpec({ command: "adb", args: ["-s", "ABC", "install", "app.apk"] }),
    ).not.toThrow();
    expect(() => assertSafeCommandSpec({ command: "adb\n", args: [] })).toThrow();
    expect(formatCommandForDisplay({ command: "adb", args: ["devices", "-l"] })).toBe(
      "adb devices -l",
    );
  });
});
