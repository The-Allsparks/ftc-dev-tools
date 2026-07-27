import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assertAllowedDownloadUrl } from "../src/hub/allowlist.js";
import { applyHubOsUpdate } from "../src/hub/apply-update.js";
import { checkHubUpdate } from "../src/hub/check-update.js";
import { downloadHubOsUpdate } from "../src/hub/download.js";
import {
  findHubOsReleaseByVersion,
  parseHubOsCatalogFromHtml,
  parseOsVersionFromConsoleHtml,
  pickLatestHubOsRelease,
} from "../src/hub/parse-os-catalog.js";
import type { CommandResult, CommandSpec, ProcessRunner } from "../src/types/process.js";
import type { FetchLike } from "../src/sdk/types.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

const SAMPLE_HTML = `
<a href="https://github.com/REVrobotics/REV-Software-Binaries/releases/download/chos-1.1.6/controlHubOS-1.1.6.zip">Download Control Hub OS Version 1.1.6</a>
<a href="https://github.com/REVrobotics/REV-Software-Binaries/releases/download/chos-1.1.4/ControlHubOS-1.1.4.zip">Download</a>
<a href="https://evil.example/chos-1.1.6/bad.zip">bad</a>
`;

class FakeRunner implements ProcessRunner {
  readonly commands: CommandSpec[] = [];

  async run(spec: CommandSpec): Promise<CommandResult> {
    this.commands.push(spec);
    return {
      exitCode: 0,
      signal: null,
      stdout: "ok",
      stderr: "",
      timedOut: false,
      durationMs: 1,
    };
  }

  spawn(): never {
    throw new Error("not used");
  }
}

describe("hub OS catalog parsing", () => {
  it("parses allowlisted GitHub release assets newest-first", () => {
    const releases = parseHubOsCatalogFromHtml(SAMPLE_HTML);
    expect(releases).toHaveLength(2);
    expect(pickLatestHubOsRelease(releases)?.version).toBe("1.1.6");
    expect(findHubOsReleaseByVersion(releases, "1.1.4")?.assetName).toBe("ControlHubOS-1.1.4.zip");
  });

  it("blocks non-allowlisted download hosts", () => {
    expect(() => assertAllowedDownloadUrl("https://evil.example/x.zip")).toThrow(/allowlist/i);
    expect(() =>
      assertAllowedDownloadUrl(
        "https://github.com/someone/else/releases/download/chos-1.1.6/x.zip",
      ),
    ).toThrow(/REV-Software-Binaries/i);
  });

  it("parses OS version from console HTML", () => {
    expect(
      parseOsVersionFromConsoleHtml("<p>Control Hub Operating System</p><span>1.1.4</span>"),
    ).toBe("1.1.4");
  });
});

describe("hub update check/download/apply", () => {
  it("reports behind when local OS older than catalog", async () => {
    const runner = new FakeRunner();
    const fetchImpl: FetchLike = async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      async json() {
        return {};
      },
      async text() {
        return SAMPLE_HTML;
      },
      async arrayBuffer() {
        return new ArrayBuffer(0);
      },
    });

    const report = await checkHubUpdate({
      runner,
      localOsVersion: "1.1.3",
      fetchImpl,
    });
    expect(report.freshness).toBe("behind");
    expect(report.remote?.version).toBe("1.1.6");
  });

  it("downloads to cache with --yes", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-hub-dl-"));
    tempDirs.push(dir);
    const bytes = Buffer.from("fake-os-zip");
    const fetchImpl: FetchLike = async (url) => {
      if (String(url).includes("changelog") || String(url).includes("operating-system")) {
        return {
          ok: true,
          status: 200,
          statusText: "OK",
          async json() {
            return {};
          },
          async text() {
            return SAMPLE_HTML;
          },
          async arrayBuffer() {
            return new ArrayBuffer(0);
          },
        };
      }
      return {
        ok: true,
        status: 200,
        statusText: "OK",
        async json() {
          return {};
        },
        async text() {
          return "";
        },
        async arrayBuffer() {
          return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        },
      };
    };

    const result = await downloadHubOsUpdate({
      fetchImpl,
      cacheDir: dir,
      yes: true,
    });
    expect(result.success).toBe(true);
    expect(result.filePath).toBeTruthy();
    const written = await fs.readFile(result.filePath!);
    expect(written.equals(bytes)).toBe(true);
  });

  it("refuses wifi-adb apply without allow flag", async () => {
    const runner = new FakeRunner();
    const { MockDeviceProvider } = await import("../src/devices/mock-device-provider.js");
    const provider = new MockDeviceProvider({
      devices: [
        {
          serial: "192.168.43.1:5555",
          state: "device",
          authorization: "authorized",
          connectionType: "wifi",
          controlHubLikelihood: "likely",
          rawProperties: {},
        },
      ],
    });
    const fetchImpl: FetchLike = async () => {
      throw Object.assign(new Error("console unreachable"), { code: "WIFI_CONSOLE_UNREACHABLE" });
    };

    const result = await applyHubOsUpdate({
      runner,
      deviceProvider: provider,
      fetchImpl,
      yes: true,
      filePath: path.join(os.tmpdir(), "missing-on-purpose.zip"),
      openConsole: false,
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("HUB_UPDATE_WIFI_ADB_BLOCKED");
  });

  it("guided dry-run succeeds without writing", async () => {
    const runner = new FakeRunner();
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-hub-apply-"));
    tempDirs.push(dir);
    const filePath = path.join(dir, "controlHubOS-1.1.6.zip");
    await fs.writeFile(filePath, "zip");
    const fetchImpl: FetchLike = async () => ({
      ok: false,
      status: 503,
      statusText: "Unavailable",
      async json() {
        return {};
      },
      async text() {
        return "";
      },
      async arrayBuffer() {
        return new ArrayBuffer(0);
      },
    });

    const result = await applyHubOsUpdate({
      runner,
      fetchImpl,
      dryRun: true,
      filePath,
      openConsole: false,
    });
    expect(result.success).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.mode).toBe("guided");
    expect(result.planLines.some((l) => /Select Update File/i.test(l))).toBe(true);
  });
});
