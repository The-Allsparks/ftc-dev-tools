export const HUB_OS_CHANGELOG_URL =
  "https://docs.revrobotics.com/duo-control/managing-the-control-system/updating-operating-system/operating-system-changelog.html";

export const HUB_OS_DOCS_URL =
  "https://docs.revrobotics.com/duo-control/managing-the-control-system/updating-operating-system.html";

export const HUB_OS_GITHUB_REPO = "REVrobotics/REV-Software-Binaries";

export const HUB_OS_TAG_PREFIX = "chos-";

/** Candidate RC Console POST paths for Control Hub OS upload (probed in order). */
export const HUB_OS_UPLOAD_POST_CANDIDATES = [
  "/updateControlHubOS",
  "/update_control_hub_os",
  "/manage/updateControlHubOS",
  "/uploadOsUpdate",
  "/manage/uploadOsUpdate",
] as const;

export const DEFAULT_HUB_OS_UPLOAD_FIELD_NAMES = [
  "file",
  "updateFile",
  "osUpdate",
  "uploadFile",
  "controlHubOsUpdate",
] as const;
