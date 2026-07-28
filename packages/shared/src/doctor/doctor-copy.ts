/**
 * Student-facing labels and skip explanations for `ftc doctor` (#38).
 * Technical paths and versions stay in each check's `detail` field.
 */

/** Short doc pointer for terms defined once in doctor output (optional glossary). */
export const DOCTOR_GLOSSARY_DOC = "docs/doctor.md#skip-and-robot-checks";

export const DOCTOR_CHECK_LABELS = {
  os: "Supported operating system",
  node: "Supported Node.js version",
  /** JDK — used to compile your FTC Java code. */
  java: "Java JDK installed",
  /** Android SDK — libraries and tools to build Android robot apps. */
  androidSdk: "Android SDK installed",
  /** adb — Android Debug Bridge; talks to the Control Hub over USB or Wi‑Fi. */
  adb: "Android Debug Bridge (adb)",
  ftcProject: "Official FTC project detected",
  /** Gradle Wrapper — the project's `gradlew` script that runs builds. */
  gradleWrapper: "Gradle Wrapper (project build tool)",
  gradleInit: "Gradle can run your project build",
  devicesGeneric: "Robot connected via USB",
  devicesHub: "REV Control Hub connected and authorized",
  devicesAndroid: "Android device connected and authorized",
  /** Compares your project's FTC SDK to the latest release online. */
  ftcSdkVersion: "FTC SDK version (online check)",
  wifiConsole: "Control Hub web console reachable",
  wifiRobotInterface: "Robot Wi‑Fi network selected",
} as const;

export const DOCTOR_SKIP_DETAILS = {
  devicesNoProvider:
    "Skipped — normal when coding at home without the robot plugged in. This environment cannot list USB devices.",
  gradleInitBlocked:
    "Skipped until this folder passes FTC project and Gradle Wrapper checks. Fix those first, then run doctor again.",
  ftcSdkDisabled:
    "Skipped because this run turned off the online FTC SDK check (optional).",
  ftcSdkNoProject:
    "Skipped because no FTC project was detected in this folder.",
  wifiChecksDisabled:
    "Skipped because this run turned off Wi‑Fi and Control Hub network checks (optional).",
  wifiConsoleAtHome:
    "Skipped — normal at home when the Control Hub is off or not on your Wi‑Fi. ",
  wifiNicAtHome:
    "Skipped — normal unless your laptop has two Wi‑Fi adapters (dual‑NIC) at the shop. ",
} as const;

export function wifiConsoleSkipDetail(technicalMessage: string): string {
  return `${DOCTOR_SKIP_DETAILS.wifiConsoleAtHome}${technicalMessage}`;
}

export function summaryLines() {
  return {
    ready:
      "Ready — your computer, project, and robot checks look good for deploying code.",
    requiredFailed:
      "Not ready — fix the required items marked ✗ above (usually JDK, Android SDK, or adb).",
    notReadyPrefix: "Not ready yet:",
  } as const;
}
