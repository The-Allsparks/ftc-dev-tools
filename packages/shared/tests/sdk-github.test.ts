import { describe, expect, it } from "vitest";
import {
  fetchLatestSdkRelease,
  fetchSdkReleaseByTag,
  listSdkReleases,
} from "../src/sdk/github-releases.js";
import type { FetchLike } from "../src/sdk/types.js";
import { checkSdkStatus } from "../src/sdk/check-sdk-status.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach } from "vitest";

const fixtureReleases = [
  {
    tag_name: "v11.2",
    name: "v11.2",
    html_url: "https://github.com/FIRST-Tech-Challenge/FtcRobotController/releases/tag/v11.2",
    zipball_url:
      "https://api.github.com/repos/FIRST-Tech-Challenge/FtcRobotController/zipball/v11.2",
    published_at: "2026-07-07T00:00:00Z",
    draft: false,
    prerelease: false,
  },
  {
    tag_name: "v11.1",
    name: "v11.1",
    html_url: "https://github.com/FIRST-Tech-Challenge/FtcRobotController/releases/tag/v11.1",
    zipball_url:
      "https://api.github.com/repos/FIRST-Tech-Challenge/FtcRobotController/zipball/v11.1",
    draft: false,
    prerelease: false,
  },
];

function mockFetch(json: unknown, ok = true, status = 200): FetchLike {
  return async () => ({
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    async json() {
      return json;
    },
    async text() {
      return typeof json === "string" ? json : JSON.stringify(json);
    },
    async arrayBuffer() {
      return new ArrayBuffer(0);
    },
  });
}

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

describe("github-releases", () => {
  it("parses latest non-draft release", async () => {
    const latest = await fetchLatestSdkRelease({ fetchImpl: mockFetch(fixtureReleases) });
    expect(latest.tagName).toBe("v11.2");
    expect(latest.version).toBe("11.2");
  });

  it("finds release by tag", async () => {
    const release = await fetchSdkReleaseByTag("11.1", { fetchImpl: mockFetch(fixtureReleases) });
    expect(release.tagName).toBe("v11.1");
  });

  it("lists releases", async () => {
    const list = await listSdkReleases({ fetchImpl: mockFetch(fixtureReleases) });
    expect(list).toHaveLength(2);
  });
});

describe("checkSdkStatus", () => {
  it("reports behind when local is older than mocked latest", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-sdk-status-"));
    tempDirs.push(root);
    await fs.writeFile(
      path.join(root, "build.dependencies.gradle"),
      `implementation 'org.firstinspires.ftc:RobotCore:11.1.0'\n`,
    );

    const report = await checkSdkStatus({
      projectRoot: root,
      fetchImpl: mockFetch(fixtureReleases),
    });
    expect(report.local.version).toBe("11.1.0");
    expect(report.remote?.version).toBe("11.2");
    expect(report.freshness).toBe("behind");
  });

  it("returns friendly network error when fetch fails", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-sdk-status-"));
    tempDirs.push(root);
    await fs.writeFile(
      path.join(root, "build.dependencies.gradle"),
      `implementation 'org.firstinspires.ftc:RobotCore:11.1.0'\n`,
    );
    const failing: FetchLike = async () => {
      throw new Error("Network is unreachable");
    };
    const report = await checkSdkStatus({ projectRoot: root, fetchImpl: failing });
    expect(report.freshness).toBe("unknown");
    expect(report.error?.code).toBe("SDK_UPDATE_NETWORK");
  });
});
