import { describe, expect, it } from "vitest";
import {
  INSTALL_DEPS_ANDROID_CMDLINE_TOOLS_JSON_RAW_URL,
  INSTALL_DEPS_LINUX_SH_RAW_URL,
  INSTALL_DEPS_MACOS_SH_RAW_URL,
  INSTALL_DEPS_WINDOWS_PS1_RAW_URL,
  INSTALL_WITHOUT_ANDROID_STUDIO_DOCS_URL,
  buildInstallDepsCommand,
  describeInstallDepsConsentMessage,
} from "../src/install-deps-urls.js";

describe("install-deps-urls", () => {
  it("uses main-branch raw GitHub URLs", () => {
    for (const url of [
      INSTALL_DEPS_WINDOWS_PS1_RAW_URL,
      INSTALL_DEPS_MACOS_SH_RAW_URL,
      INSTALL_DEPS_LINUX_SH_RAW_URL,
      INSTALL_DEPS_ANDROID_CMDLINE_TOOLS_JSON_RAW_URL,
    ]) {
      expect(url).toMatch(
        /^https:\/\/raw\.githubusercontent\.com\/The-Allsparks\/ftc-dev-tools\/main\//,
      );
    }
    expect(INSTALL_WITHOUT_ANDROID_STUDIO_DOCS_URL).toContain(
      "github.com/The-Allsparks/ftc-dev-tools/blob/main/docs/install-without-android-studio.md",
    );
  });

  it("buildInstallDepsCommand downloads script and manifest together", () => {
    const win = buildInstallDepsCommand("windows");
    expect(win).toContain(INSTALL_DEPS_WINDOWS_PS1_RAW_URL);
    expect(win).toContain(INSTALL_DEPS_ANDROID_CMDLINE_TOOLS_JSON_RAW_URL);
    expect(win).toContain("install-deps-windows.ps1");
    expect(win).toContain("curl.exe");

    const mac = buildInstallDepsCommand("macos");
    expect(mac).toContain(INSTALL_DEPS_MACOS_SH_RAW_URL);
    expect(mac).toContain("android-cmdline-tools.json");

    const linux = buildInstallDepsCommand("linux");
    expect(linux).toContain(INSTALL_DEPS_LINUX_SH_RAW_URL);
    expect(linux).toContain("android-cmdline-tools.json");
  });

  it("buildInstallDepsCommand supports skip flags per OS", () => {
    expect(buildInstallDepsCommand("windows", { skipJdk: true })).toContain("-SkipJdk");
    expect(buildInstallDepsCommand("windows", { skipSdk: true })).toContain("-SkipSdk");
    expect(buildInstallDepsCommand("macos", { skipJdk: true })).toContain("SKIP_JDK=1");
    expect(buildInstallDepsCommand("linux", { skipSdk: true })).toContain("SKIP_SDK=1");
  });

  it("describeInstallDepsConsentMessage lists JDK, SDK, and environment changes", () => {
    const msg = describeInstallDepsConsentMessage("windows");
    expect(msg).toMatch(/JDK/);
    expect(msg).toMatch(/platform-tools|adb/i);
    expect(msg).toMatch(/PATH|ANDROID_HOME/);
  });
});
