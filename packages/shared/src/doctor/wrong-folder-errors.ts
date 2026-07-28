import type { FriendlyError } from "../types/errors.js";

/** Actionable guidance when doctor runs outside an FTC project root (#30). */
export function notAnFtcProjectRootError(detail?: string): FriendlyError {
  return {
    code: "UNSUPPORTED_PROJECT_LAYOUT",
    title: "Not in an FTC project folder",
    summary:
      "Open your team's FTC Android Studio project root — the folder that contains settings.gradle, gradlew (or gradlew.bat), and the TeamCode module — so project checks can run.",
    suggestedActions: [
      "Open the project root that contains settings.gradle, gradlew or gradlew.bat, and the TeamCode module (File → Open Folder in VS Code or Cursor).",
      "Do not open only a nested TeamCode folder unless your team uses a supported alternate layout.",
      "Compare your tree to FIRST's official FTC SDK sample project or restore the SDK from version control.",
    ],
    technicalDetails: detail,
  };
}

/** Wrapper check when project detection already failed (avoid implying gradlew is missing). */
export function projectNotDetectedWrapperError(): FriendlyError {
  return {
    code: "UNSUPPORTED_PROJECT_LAYOUT",
    title: "Project folder not detected",
    summary:
      "Gradle Wrapper was not checked because doctor did not find an FTC project in the folder you opened.",
    suggestedActions: [
      "Change directory to your FTC project root (settings.gradle, gradlew, TeamCode) and run `ftc doctor` again.",
      "In the editor, open that root folder as the workspace, not a parent repo or subfolder.",
    ],
  };
}
