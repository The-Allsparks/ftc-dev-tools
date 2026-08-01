import { describe, expect, it } from "vitest";
import {
  detectAdbInstallErrorCode,
  parseAdbInstallOutput,
} from "../src/devices/parse-adb-install.js";
import { refuseMutationWithoutYes } from "../src/process/mutation-guard.js";

describe("parseAdbInstallOutput", () => {
  it("detects signature conflicts", () => {
    const output = "Failure [INSTALL_FAILED_UPDATE_INCOMPATIBLE: signatures do not match]";
    expect(parseAdbInstallOutput(output)).toEqual({
      success: false,
      code: "INSTALL_SIGNATURE_CONFLICT",
      message: "Installation signature conflict.",
    });
    expect(detectAdbInstallErrorCode(output)).toBe("INSTALL_SIGNATURE_CONFLICT");
  });

  it("detects insufficient storage", () => {
    const output = "Failure [INSTALL_FAILED_INSUFFICIENT_STORAGE]";
    expect(parseAdbInstallOutput(output)).toEqual({
      success: false,
      code: "INSUFFICIENT_STORAGE",
      message: "Insufficient device storage.",
    });
  });

  it("detects generic install failures", () => {
    const output = "Failure [INSTALL_FAILED_INTERNAL_ERROR]";
    expect(parseAdbInstallOutput(output)).toEqual({
      success: false,
      code: "INSTALL_FAILED",
      message: "APK installation failed.",
    });
  });

  it("treats success output as successful", () => {
    expect(parseAdbInstallOutput("Success\n")).toEqual({ success: true });
    expect(detectAdbInstallErrorCode("Success\n")).toBeUndefined();
  });
});

describe("refuseMutationWithoutYes", () => {
  it("returns structured refusal messages", () => {
    const refusal = refuseMutationWithoutYes({
      actionDescription: "create OpMode",
      code: "OPMODE_ABORTED",
    });
    expect(refusal.message).toBe("Refusing to create OpMode without --yes.");
    expect(refusal.error.code).toBe("OPMODE_ABORTED");
    expect(refusal.error.title).toBeTruthy();
  });
});
