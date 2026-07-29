#!/usr/bin/env node
/**
 * Print npm global install command for the latest ftc-cli GitHub Release tarball.
 * Usage: node scripts/latest-cli-install.mjs
 * Windows: node scripts/latest-cli-install.mjs  (then run the printed npm.cmd line)
 */
const owner = "The-Allsparks";
const repo = "ftc-dev-tools";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
  headers: {
    Accept: "application/vnd.github+json",
    "User-Agent": "ftc-dev-tools-latest-cli-install",
    "X-GitHub-Api-Version": "2022-11-28",
  },
});

if (!response.ok) {
  console.error(`GitHub Releases error: ${response.status} ${response.statusText}`);
  process.exit(1);
}

const release = await response.json();
const asset = (release.assets ?? []).find((a) => /^ftc-cli-.+\.tar\.gz$/i.test(a.name ?? ""));
if (!asset?.browser_download_url) {
  console.error("No ftc-cli-*.tar.gz asset on latest release.");
  process.exit(1);
}

console.log(`${npm} install -g "${asset.browser_download_url}"`);
