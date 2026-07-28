import type { FriendlyError } from "../types/errors.js";

/** Actionable guidance when doctor runs outside an FTC project root (#30). */
export function notAnFtcProjectRootError(
  detail?: string,
  suggestedProjectRoots?: string[],
): FriendlyError {
  const suggestedActions = [
    "Open the project root that contains settings.gradle, gradlew or gradlew.bat, and the TeamCode module (File → Open Folder in VS Code or Cursor).",
    "Do not open only a nested TeamCode folder unless your team uses a supported alternate layout.",
    "Compare your tree to FIRST's official FTC SDK sample project or restore the SDK from version control.",
  ];
  if (suggestedProjectRoots?.length === 1) {
    suggestedActions.unshift(
      `Open the nearby FTC project root: ${suggestedProjectRoots[0]} (File → Open Folder, or use **Open correct FTC folder** in the doctor Fix menu).`,
    );
  } else if (suggestedProjectRoots && suggestedProjectRoots.length > 1) {
    suggestedActions.unshift(
      "Multiple nearby FTC project roots were found — use **Open correct FTC folder** in the doctor Fix menu to pick one.",
    );
  }
  const summary =
    suggestedProjectRoots?.length === 1
      ? "This folder is not the FTC Android Studio project root, but a nearby root was found on disk."
      : suggestedProjectRoots && suggestedProjectRoots.length > 1
        ? "This folder is not the FTC project root; nearby FTC project folders were found on disk."
        : "Open your team's FTC Android Studio project root — the folder that contains settings.gradle, gradlew (or gradlew.bat), and the TeamCode module — so project checks can run.";
  return {
    code: "UNSUPPORTED_PROJECT_LAYOUT",
    title: "Not in an FTC project folder",
    summary,
    suggestedActions,
    technicalDetails: detail,
    suggestedProjectRoots,
  };
}

/** Wrapper check when project detection already failed (avoid implying gradlew is missing). */
export function projectNotDetectedWrapperError(suggestedProjectRoots?: string[]): FriendlyError {
  const suggestedActions = [
    "Change directory to your FTC project root (settings.gradle, gradlew, TeamCode) and run `ftc doctor` again.",
    "In the editor, open that root folder as the workspace, not a parent repo or subfolder.",
  ];
  if (suggestedProjectRoots?.length) {
    suggestedActions.unshift(
      "Use **Open correct FTC folder** in the doctor Fix menu — Gradle Wrapper lives in the project root, not in TeamCode or vision library subfolders.",
    );
  }
  return {
    code: "UNSUPPORTED_PROJECT_LAYOUT",
    title: "Project folder not detected",
    summary:
      suggestedProjectRoots?.length === 1
        ? "Gradle Wrapper was not checked because you opened a subfolder; the FTC project root is one level up on disk."
        : "Gradle Wrapper was not checked because doctor did not find an FTC project in the folder you opened.",
    suggestedActions,
    suggestedProjectRoots,
  };
}
