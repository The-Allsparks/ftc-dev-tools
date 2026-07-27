/**
 * Fail closed: only download/apply packages from these hosts.
 * Metadata may also be read from docs.revrobotics.com.
 */
const ALLOWED_DOWNLOAD_HOST_SUFFIXES = [
  "github.com",
  "githubusercontent.com",
  "revrobotics.com",
] as const;

const ALLOWED_METADATA_HOST_SUFFIXES = [
  "docs.revrobotics.com",
  "api.github.com",
  "github.com",
] as const;

export function isAllowedHost(hostname: string, allowlist: readonly string[]): boolean {
  const host = hostname.toLowerCase();
  return allowlist.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}

export function assertAllowedDownloadUrl(urlString: string): URL {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw Object.assign(new Error(`Invalid update URL: ${urlString}`), {
      code: "HUB_UPDATE_URL_BLOCKED",
    });
  }
  if (url.protocol !== "https:") {
    throw Object.assign(new Error(`Update URL must be https: ${urlString}`), {
      code: "HUB_UPDATE_URL_BLOCKED",
    });
  }
  if (!isAllowedHost(url.hostname, ALLOWED_DOWNLOAD_HOST_SUFFIXES)) {
    throw Object.assign(new Error(`Update URL host is not on the allowlist: ${url.hostname}`), {
      code: "HUB_UPDATE_URL_BLOCKED",
    });
  }
  // Prefer official REV Software Binaries release assets when on github.com
  if (
    url.hostname === "github.com" &&
    !/^\/REVrobotics\/REV-Software-Binaries\/releases\/download\//i.test(url.pathname)
  ) {
    throw Object.assign(
      new Error(
        `GitHub download URL must be under REVrobotics/REV-Software-Binaries/releases/download/: ${urlString}`,
      ),
      { code: "HUB_UPDATE_URL_BLOCKED" },
    );
  }
  return url;
}

export function assertAllowedMetadataUrl(urlString: string): URL {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw Object.assign(new Error(`Invalid catalog URL: ${urlString}`), {
      code: "HUB_UPDATE_URL_BLOCKED",
    });
  }
  if (url.protocol !== "https:") {
    throw Object.assign(new Error(`Catalog URL must be https: ${urlString}`), {
      code: "HUB_UPDATE_URL_BLOCKED",
    });
  }
  if (!isAllowedHost(url.hostname, ALLOWED_METADATA_HOST_SUFFIXES)) {
    throw Object.assign(new Error(`Catalog URL host is not on the allowlist: ${url.hostname}`), {
      code: "HUB_UPDATE_URL_BLOCKED",
    });
  }
  return url;
}
