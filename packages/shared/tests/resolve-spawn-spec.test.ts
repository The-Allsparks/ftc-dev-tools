import { describe, expect, it, vi, afterEach } from "vitest";
import { quoteWindowsCmdToken, resolveSpawnSpec } from "../src/process/resolve-spawn-spec.js";

describe("quoteWindowsCmdToken", () => {
  it("leaves simple paths unquoted", () => {
    expect(quoteWindowsCmdToken("C:\\tools\\gradlew.bat")).toBe("C:\\tools\\gradlew.bat");
  });

  it("quotes paths with spaces", () => {
    expect(quoteWindowsCmdToken("C:\\The Allsparks\\gradlew.bat")).toBe(
      '"C:\\The Allsparks\\gradlew.bat"',
    );
  });

  it("escapes embedded double quotes", () => {
    expect(quoteWindowsCmdToken('say "hi"')).toBe('"say ""hi"""');
  });
});

describe("resolveSpawnSpec", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses shell for Windows batch files", () => {
    vi.stubGlobal("process", { ...process, platform: "win32" });
    const resolved = resolveSpawnSpec({
      command: "C:\\proj\\gradlew.bat",
      args: ["--version"],
    });
    expect(resolved.shell).toBe(true);
    expect(resolved.args).toEqual([]);
    expect(resolved.command).toBe("C:\\proj\\gradlew.bat --version");
  });

  it("quotes spaced batch paths and args on Windows", () => {
    vi.stubGlobal("process", { ...process, platform: "win32" });
    const resolved = resolveSpawnSpec({
      command: "C:\\The Allsparks\\FTC\\gradlew.bat",
      args: ["-p", "TeamCode"],
    });
    expect(resolved.shell).toBe(true);
    expect(resolved.command).toBe('"C:\\The Allsparks\\FTC\\gradlew.bat" -p TeamCode');
  });

  it("leaves non-batch commands on Windows unchanged", () => {
    vi.stubGlobal("process", { ...process, platform: "win32" });
    const resolved = resolveSpawnSpec({
      command: "adb",
      args: ["devices"],
    });
    expect(resolved.shell).toBe(false);
    expect(resolved.command).toBe("adb");
    expect(resolved.args).toEqual(["devices"]);
  });

  it("does not shell-wrap batch files on non-Windows", () => {
    vi.stubGlobal("process", { ...process, platform: "linux" });
    const resolved = resolveSpawnSpec({
      command: "/tmp/gradlew.bat",
      args: ["--version"],
    });
    expect(resolved.shell).toBe(false);
    expect(resolved.command).toBe("/tmp/gradlew.bat");
    expect(resolved.args).toEqual(["--version"]);
  });
});
