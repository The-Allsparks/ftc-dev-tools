import type { FriendlyError } from "../types/errors.js";

/** Actionable guidance when doctor runs outside an FTC project root (#30). */
export function notAnFtcProjectRootError(detail?: string): FriendlyError {
  return {
    code: "UNSUPPORTED_PROJECT_LAYOUT",
    title: "Not in an FTC project folder",
    summary:
      "This folder is not the root of an official FTC Android Studio project, so project checks cannot pass.",
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
      "Gradle Wrapper was not verified because no FTC project was detected in the current working directory.",
    suggestedActions: [
      "Change directory to your FTC project root (settings.gradle, gradlew, TeamCode) and run `ftc doctor` again.",
      "In the editor, open that root folder as the workspace, not a parent repo or subfolder.",
    ],
  };
}
