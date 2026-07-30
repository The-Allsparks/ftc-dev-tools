import { describe, expect, it } from "vitest";
import { interpretError, listErrorRuleCodes } from "../src/errors/interpret.js";

describe("friendly error interpretation", () => {
  it("covers required rule codes", () => {
    const codes = listErrorRuleCodes();
    for (const required of [
      "CANNOT_FIND_SYMBOL",
      "INCOMPATIBLE_JAVA",
      "ANDROID_SDK_NOT_FOUND",
      "GRADLE_WRAPPER_MISSING",
      "GRADLE_PERMISSION_DENIED",
      "ADB_NOT_FOUND",
      "NO_DEVICES",
      "DEVICE_UNAUTHORIZED",
      "DEVICE_OFFLINE",
      "MULTIPLE_DEVICES",
      "NO_MATCHING_CONNECTION",
      "APK_NOT_FOUND",
      "INSTALL_SIGNATURE_CONFLICT",
      "INSUFFICIENT_STORAGE",
      "GRADLE_DAEMON_FAILURE",
      "DEPENDENCY_DOWNLOAD_FAILURE",
      "NETWORK_UNAVAILABLE",
      "COMPILATION_FAILURE",
      "UNSUPPORTED_PROJECT_LAYOUT",
      "SDK_DEPS_MISSING",
      "SDK_VERSION_MISMATCH",
      "SDK_UPDATE_NETWORK",
      "SDK_UPDATE_DIRTY_TREE",
      "SDK_UPDATE_ABORTED",
      "WIFI_CONSOLE_UNREACHABLE",
      "WIFI_ADB_CONNECT_FAILED",
      "WIFI_TCPIP_FAILED",
      "WIFI_NO_USB_DEVICE",
      "WIFI_INTERFACE_NOT_FOUND",
      "WIFI_ROUTE_ELEVATION_REQUIRED",
      "WIFI_ROUTE_FAILED",
      "WIFI_JOIN_FAILED",
      "WIFI_PASSWORD_MISSING",
      "WIFI_MANAGE_API_UNSUPPORTED",
      "WIFI_METRIC_FAILED",
      "WIFI_ADAPTER_FAILED",
      "WIFI_ADAPTER_LAST_UP",
      "HUB_UPDATE_NETWORK",
      "HUB_UPDATE_URL_BLOCKED",
      "HUB_UPDATE_CATALOG_EMPTY",
      "HUB_UPDATE_ABORTED",
      "HUB_UPDATE_WIFI_ADB_BLOCKED",
      "HUB_UPDATE_APPLY_UNSUPPORTED",
      "HUB_UPDATE_FILE_MISSING",
      "PEDRO_NETWORK",
      "PEDRO_PROJECT_UNSUPPORTED",
      "PEDRO_ABORTED",
      "PEDRO_DIRTY_TREE",
      "PEDRO_SCAFFOLD_EMPTY",
      "PEDRO_URL_BLOCKED",
      "OPMODE_PROJECT_UNSUPPORTED",
      "OPMODE_INVALID_NAME",
      "OPMODE_EXISTS",
      "OPMODE_ABORTED",
      "OPMODE_DIRTY_TREE",
      "CONFIG_PROJECT_UNSUPPORTED",
      "MISSING_CONFIG_NAME",
      "CONFIG_NOT_FOUND",
      "CONFIG_ABORTED",
      "CONFIG_REMOTE_EMPTY",
      "CONFIG_PULL_FAILED",
      "HWMAP_PROJECT_UNSUPPORTED",
      "HWMAP_NO_CONFIG",
      "HWMAP_CONFIG_AMBIGUOUS",
      "HWMAP_EMPTY",
      "HWMAP_ABORTED",
      "HWMAP_DIRTY_TREE",
      "VISION_PROJECT_UNSUPPORTED",
      "VISION_NO_LIBRARIES",
      "VISION_ENDPOINT_AMBIGUOUS",
      "VISION_HOST_UNREACHABLE",
      "VISION_BRIDGE_NOT_SCAFFOLDED",
      "VISION_PIPELINE_ARTIFACT_ERROR",
    ]) {
      expect(codes).toContain(required);
    }
  });

  it("interprets cannot find symbol", () => {
    const error = interpretError("error: cannot find symbol");
    expect(error.code).toBe("CANNOT_FIND_SYMBOL");
    expect(error.suggestedActions.length).toBeGreaterThan(0);
  });

  it("interprets signature conflicts via code hint", () => {
    const error = interpretError({
      text: "Failure [INSTALL_FAILED_UPDATE_INCOMPATIBLE]",
      codeHint: "INSTALL_SIGNATURE_CONFLICT",
    });
    expect(error.code).toBe("INSTALL_SIGNATURE_CONFLICT");
    expect(error.summary.toLowerCase()).toContain("signed");
  });
});
