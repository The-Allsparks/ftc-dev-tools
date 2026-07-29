import { describe, expect, it, vi } from "vitest";
import {
  fetchLatestCliGitHubRelease,
  parseCliTarballAssetName,
  pickCliTarballFromRelease,
} from "../src/cli-github-release.js";

describe("cli-github-release", () => {
  it("parses CLI tarball asset names", () => {
    expect(parseCliTarballAssetName("ftc-cli-0.1.0.tar.gz")).toBe("0.1.0");
    expect(parseCliTarballAssetName("other.tar.gz")).toBeUndefined();
  });

  it("picks tarball asset from release JSON", () => {
    const picked = pickCliTarballFromRelease({
      tag_name: "v0.2.0",
      assets: [
        {
          name: "SHA256SUMS.txt",
          browser_download_url: "https://example.com/sums",
        },
        {
          name: "ftc-cli-0.2.0.tar.gz",
          browser_download_url: "https://example.com/ftc-cli-0.2.0.tar.gz",
        },
      ],
    });
    expect(picked?.version).toBe("0.2.0");
    expect(picked?.tarballUrl).toBe("https://example.com/ftc-cli-0.2.0.tar.gz");
  });

  it("fetchLatestCliGitHubRelease uses /releases/latest", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        tag_name: "v0.1.1",
        assets: [
          {
            name: "ftc-cli-0.1.1.tar.gz",
            browser_download_url:
              "https://github.com/The-Allsparks/ftc-dev-tools/releases/download/v0.1.1/ftc-cli-0.1.1.tar.gz",
          },
        ],
      }),
    }));
    const release = await fetchLatestCliGitHubRelease({ fetchImpl });
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining("/releases/latest"),
      expect.any(Object),
    );
    expect(release.version).toBe("0.1.1");
  });
});
