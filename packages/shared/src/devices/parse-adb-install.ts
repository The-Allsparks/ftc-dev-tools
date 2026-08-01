export interface AdbInstallParseResult {
  success: boolean;
  code?: string;
  message?: string;
}

/** Normalize ADB install stdout/stderr into structured install evidence. */
export function parseAdbInstallOutput(combined: string): AdbInstallParseResult {
  if (/INSTALL_FAILED_UPDATE_INCOMPATIBLE|signatures do not match/i.test(combined)) {
    return {
      success: false,
      code: "INSTALL_SIGNATURE_CONFLICT",
      message: "Installation signature conflict.",
    };
  }
  if (/INSTALL_FAILED_INSUFFICIENT_STORAGE/i.test(combined)) {
    return {
      success: false,
      code: "INSUFFICIENT_STORAGE",
      message: "Insufficient device storage.",
    };
  }
  if (/Failure/i.test(combined)) {
    return {
      success: false,
      code: "INSTALL_FAILED",
      message: "App installation failed.",
    };
  }
  return { success: true };
}

/** Returns a structured install error code when ADB output indicates failure. */
export function detectAdbInstallErrorCode(combined: string): string | undefined {
  const parsed = parseAdbInstallOutput(combined);
  return parsed.success ? undefined : parsed.code;
}
