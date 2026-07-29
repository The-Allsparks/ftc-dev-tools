/** Official FIRST FTC SDK Android Studio project (TeamCode + Gradle layout). */
export const OFFICIAL_FTC_ROBOT_CONTROLLER_GIT_URL =
  "https://github.com/FIRST-Tech-Challenge/FtcRobotController.git";

const HTTPS_GIT_SUFFIX = /\.git$/i;

/**
 * Normalize user-entered clone URLs to https git remotes suitable for `git clone`.
 * Returns undefined when the URL is missing or not an allowed remote shape.
 */
export function normalizeGitCloneUrl(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) {
    return undefined;
  }
  if (/^https:\/\/github\.com\/[^/\s]+\/[^/\s]+(\.git)?\/?$/i.test(trimmed)) {
    return trimmed.replace(/\/?$/, "").replace(HTTPS_GIT_SUFFIX, "") + ".git";
  }
  const sshMatch = /^git@github\.com:([^/\s]+)\/([^/\s]+?)(\.git)?$/i.exec(trimmed);
  if (sshMatch) {
    return `https://github.com/${sshMatch[1]}/${sshMatch[2]}.git`;
  }
  return undefined;
}

/** Directory name to use for `git clone url <name>`. */
export function deriveCloneDirectoryName(cloneUrl: string): string {
  const normalized = normalizeGitCloneUrl(cloneUrl) ?? cloneUrl.trim();
  const withoutGit = normalized.replace(HTTPS_GIT_SUFFIX, "");
  const segment = withoutGit.split("/").pop() ?? "ftc-project";
  return segment.replace(/[^\w.-]+/g, "-") || "ftc-project";
}

export function buildGitCloneCommand(cloneUrl: string, targetDirName: string): string {
  const url = normalizeGitCloneUrl(cloneUrl) ?? cloneUrl.trim();
  const dir = targetDirName.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const quotedUrl = url.includes(" ")
    ? `"${url.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
    : url;
  return `git clone ${quotedUrl} "${dir}"`;
}
