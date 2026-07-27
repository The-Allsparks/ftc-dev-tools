import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { addPedroPathing } from "../src/pedro/add.js";
import { detectPedroStatus } from "../src/pedro/detect.js";
import {
  hasByalazarRepo,
  parseGradleDependencies,
  patchBuildDependenciesGradle,
  patchCompileSdkInText,
} from "../src/pedro/gradle-patch.js";
import { resolvePedroFtcVersion } from "../src/pedro/resolve-version.js";
import { isAllowedPedroScaffoldPath, scaffoldPedroPathing } from "../src/pedro/scaffold.js";
import type { CommandResult, CommandSpec, ProcessRunner } from "../src/types/process.js";
import type { FetchLike } from "../src/sdk/types.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

class FakeRunner implements ProcessRunner {
  dirty = false;

  async run(spec: CommandSpec): Promise<CommandResult> {
    if (spec.command === "git" && spec.args.includes("status")) {
      return {
        exitCode: 0,
        signal: null,
        stdout: this.dirty ? " M TeamCode/foo.java\n" : "",
        stderr: "",
        timedOut: false,
        durationMs: 1,
      };
    }
    return {
      exitCode: 0,
      signal: null,
      stdout: "",
      stderr: "",
      timedOut: false,
      durationMs: 1,
    };
  }

  spawn(): never {
    throw new Error("not used");
  }
}

async function writeOfficialProject(root: string): Promise<void> {
  await fs.writeFile(path.join(root, "settings.gradle"), "include ':TeamCode'\n");
  await fs.writeFile(path.join(root, "build.gradle"), "// root\n");
  await fs.writeFile(path.join(root, "build.common.gradle"), "android {\n    compileSdk 30\n}\n");
  await fs.writeFile(
    path.join(root, "build.dependencies.gradle"),
    `repositories {
    mavenCentral()
}
dependencies {
    implementation 'org.firstinspires.ftc:RobotCore:11.1.0'
}
`,
  );
  await fs.mkdir(path.join(root, "FtcRobotController"), { recursive: true });
  await fs.mkdir(path.join(root, "TeamCode", "src", "main", "java"), { recursive: true });
  await fs.writeFile(
    path.join(root, "TeamCode", "src", "main", "java", "MyOpMode.java"),
    "team-secret\n",
  );
}

describe("pedro gradle patch", () => {
  it("parses pedro coords and patches repo + deps", () => {
    const original = `repositories {
    mavenCentral()
}
dependencies {
    implementation 'org.firstinspires.ftc:RobotCore:11.1.0'
}
`;
    expect(hasByalazarRepo(original)).toBe(false);
    const patched = patchBuildDependenciesGradle(original, {
      ftcVersion: "2.1.2",
      telemetryVersion: "1.0.0",
      fullpanelsVersion: "1.0.12",
    });
    expect(hasByalazarRepo(patched.text)).toBe(true);
    expect(patched.text).toContain("com.pedropathing:ftc:2.1.2");
    expect(patched.text).toContain("com.pedropathing:telemetry:1.0.0");
    expect(patched.text).toContain("com.bylazar:fullpanels:1.0.12");
    expect(parseGradleDependencies(patched.text)).toHaveLength(3);
  });

  it("patches compileSdk upward only", () => {
    const low = patchCompileSdkInText("compileSdk 30", 34);
    expect(low.changed).toBe(true);
    expect(low.text).toContain("34");
    const ok = patchCompileSdkInText("compileSdk 34", 34);
    expect(ok.changed).toBe(false);
  });
});

describe("resolvePedroFtcVersion", () => {
  it("reads latest stable from maven metadata", async () => {
    const fetchImpl: FetchLike = async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      async json() {
        return {};
      },
      async text() {
        return `<metadata><versioning>
          <version>2.0.6</version>
          <version>2.1.0-beta.1</version>
          <version>2.1.2</version>
        </versioning></metadata>`;
      },
      async arrayBuffer() {
        return new ArrayBuffer(0);
      },
    });
    await expect(resolvePedroFtcVersion({ fetchImpl })).resolves.toBe("2.1.2");
    await expect(resolvePedroFtcVersion({ fetchImpl, version: "v2.0.3" })).resolves.toBe("2.0.3");
  });
});

describe("detect / add / scaffold", () => {
  it("detects missing then add patches gradle", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-pedro-"));
    tempDirs.push(root);
    await writeOfficialProject(root);

    const before = await detectPedroStatus(root);
    expect(before.ftcVersion).toBeUndefined();
    expect(before.pedroPathingPackagePresent).toBe(false);

    const fetchImpl: FetchLike = async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      async json() {
        return {};
      },
      async text() {
        return `<metadata><versioning><version>2.1.2</version></versioning></metadata>`;
      },
      async arrayBuffer() {
        return new ArrayBuffer(0);
      },
    });

    const dry = await addPedroPathing({
      projectRoot: root,
      runner: new FakeRunner(),
      fetchImpl,
      dryRun: true,
    });
    expect(dry.success).toBe(true);
    expect(dry.plan.length).toBeGreaterThan(0);

    const applied = await addPedroPathing({
      projectRoot: root,
      runner: new FakeRunner(),
      fetchImpl,
      yes: true,
    });
    expect(applied.success).toBe(true);
    expect(applied.backupDirectory).toBeTruthy();

    const after = await detectPedroStatus(root);
    expect(after.ftcVersion).toBe("2.1.2");
    expect(after.byalazarRepoPresent).toBe(true);
    expect(after.compileSdk).toBe(34);
  });

  it("refuses dirty tree without --force", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-pedro-"));
    tempDirs.push(root);
    await writeOfficialProject(root);
    const runner = new FakeRunner();
    runner.dirty = true;
    const result = await addPedroPathing({
      projectRoot: root,
      runner,
      version: "2.1.2",
      yes: true,
    });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("PEDRO_DIRTY_TREE");
  });

  it("scaffolds only pedroPathing paths and preserves other TeamCode", async () => {
    const project = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-pedro-proj-"));
    const upstream = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-pedro-up-"));
    tempDirs.push(project, upstream);
    await writeOfficialProject(project);

    const pedroRel = path.join(
      "TeamCode",
      "src",
      "main",
      "java",
      "org",
      "firstinspires",
      "ftc",
      "teamcode",
      "pedroPathing",
      "Constants.java",
    );
    await fs.mkdir(path.dirname(path.join(upstream, pedroRel)), { recursive: true });
    await fs.writeFile(path.join(upstream, pedroRel), "package pedro;\n");
    await fs.mkdir(path.join(upstream, "TeamCode", "src", "main", "java"), { recursive: true });
    await fs.writeFile(
      path.join(upstream, "TeamCode", "src", "main", "java", "Other.java"),
      "should-not-copy\n",
    );

    expect(isAllowedPedroScaffoldPath(pedroRel.replace(/\\/g, "/"))).toBe(true);
    expect(isAllowedPedroScaffoldPath("TeamCode/src/main/java/Other.java")).toBe(false);

    const result = await scaffoldPedroPathing({
      projectRoot: project,
      runner: new FakeRunner(),
      yes: true,
      sourceRoot: upstream,
    });
    expect(result.success).toBe(true);
    expect(result.appliedPaths.some((p) => p.includes("pedroPathing"))).toBe(true);

    const secret = await fs.readFile(
      path.join(project, "TeamCode", "src", "main", "java", "MyOpMode.java"),
      "utf8",
    );
    expect(secret).toBe("team-secret\n");
    await expect(
      fs.access(path.join(project, "TeamCode", "src", "main", "java", "Other.java")),
    ).rejects.toBeTruthy();
  });
});
