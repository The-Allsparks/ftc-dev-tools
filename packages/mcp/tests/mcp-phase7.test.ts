import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createFtcMcpServer, FTC_MCP_TOOL_NAMES } from "../src/server.js";
import {
  toolConfigList,
  toolDoctor,
  toolHwMapShow,
  toolOpModeCreate,
  toolOpModeList,
  toolPedroStatus,
} from "../src/tools.js";

const tempDirs: string[] = [];

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

async function writeOfficialProject(root: string): Promise<void> {
  await fs.writeFile(path.join(root, "settings.gradle"), "include ':TeamCode'\n");
  await fs.writeFile(path.join(root, "build.gradle"), "// root\n");
  await fs.writeFile(path.join(root, "build.common.gradle"), "compileSdkVersion 34\n");
  await fs.writeFile(path.join(root, "build.dependencies.gradle"), "dependencies {\n}\n");
  await fs.mkdir(path.join(root, "FtcRobotController"), { recursive: true });
  await fs.mkdir(
    path.join(root, "TeamCode", "src", "main", "java", "org", "firstinspires", "ftc", "teamcode"),
    { recursive: true },
  );
  await fs.mkdir(path.join(root, "TeamCode", "src", "main", "res", "xml"), { recursive: true });
  await fs.writeFile(
    path.join(root, "TeamCode", "src", "main", "res", "xml", "robot_config.xml"),
    `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>
<Robot type="FirstInspires-FTC">
  <LynxUsbDevice name="Control Hub Portal" serialNumber="ABC" >
    <LynxModule name="Control Hub" port="0">
      <Motor name="leftFront" port="0" />
      <Servo name="claw" port="0" />
    </LynxModule>
  </LynxUsbDevice>
</Robot>
`,
  );
}

function parsePayload(result: {
  content: Array<{ type: string; text?: string }>;
}): Record<string, unknown> {
  const text = result.content.find((c) => c.type === "text")?.text;
  expect(text).toBeTruthy();
  return JSON.parse(text!) as Record<string, unknown>;
}

describe("mcp phase 7 tools", () => {
  it("exports the expected tool name catalog and constructs a server", () => {
    expect(FTC_MCP_TOOL_NAMES).toHaveLength(58);
    expect(FTC_MCP_TOOL_NAMES).toContain("doctor");
    expect(FTC_MCP_TOOL_NAMES).toContain("integrations_list");
    expect(FTC_MCP_TOOL_NAMES).toContain("modules_list");
    expect(FTC_MCP_TOOL_NAMES).toContain("providers_list");
    expect(FTC_MCP_TOOL_NAMES).toContain("hwmap_codegen");
    expect(() => createFtcMcpServer()).not.toThrow();
  });

  it("refuses mutating tools without yes or dryRun", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-mcp-"));
    tempDirs.push(root);
    await writeOfficialProject(root);

    const refused = await toolOpModeCreate({
      projectRoot: root,
      className: "MyTele",
      type: "teleop",
    });
    expect(refused.isError).toBe(true);
    const payload = parsePayload(refused);
    expect(payload.code).toBe("CONFIRMATION_REQUIRED");
  });

  it("lists configs and shows hardware map for a fixture project", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-mcp-"));
    tempDirs.push(root);
    await writeOfficialProject(root);

    const configs = parsePayload(await toolConfigList({ projectRoot: root }));
    expect(configs.error).toBeUndefined();
    expect(Array.isArray(configs.configs)).toBe(true);
    expect((configs.configs as unknown[]).length).toBeGreaterThan(0);

    const hwmap = parsePayload(await toolHwMapShow({ projectRoot: root, config: "robot_config" }));
    expect(hwmap.success).toBe(true);
    expect(Array.isArray(hwmap.entries)).toBe(true);
    expect((hwmap.entries as unknown[]).length).toBeGreaterThanOrEqual(2);
  });

  it("creates an OpMode with dryRun and lists OpModes after yes", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-mcp-"));
    tempDirs.push(root);
    await writeOfficialProject(root);

    const preview = parsePayload(
      await toolOpModeCreate({
        projectRoot: root,
        className: "Phase7Tele",
        type: "teleop",
        dryRun: true,
      }),
    );
    expect(preview.success).toBe(true);
    expect(preview.dryRun).toBe(true);
    const confirmation = preview.confirmation as { planId: string; planHash: string };
    expect(confirmation.planId).toBeTruthy();
    expect(confirmation.planHash).toBeTruthy();

    const created = parsePayload(
      await toolOpModeCreate({
        projectRoot: root,
        className: "Phase7Tele",
        type: "teleop",
        confirmPlanId: confirmation.planId,
        confirmPlanHash: confirmation.planHash,
      }),
    );
    expect(created.success).toBe(true);
    expect(created.dryRun).toBe(false);

    const listed = parsePayload(await toolOpModeList({ projectRoot: root }));
    const names = ((listed.opmodes as Array<{ className: string }>) ?? []).map((o) => o.className);
    expect(names).toContain("Phase7Tele");
  });

  it("reports pedro status and doctor without crashing on fixture", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "ftc-mcp-"));
    tempDirs.push(root);
    await writeOfficialProject(root);

    const pedro = parsePayload(await toolPedroStatus({ projectRoot: root }));
    expect(pedro.message).toBeTruthy();

    const doctor = parsePayload(await toolDoctor({ projectRoot: root }));
    expect(Array.isArray(doctor.checks)).toBe(true);
    expect(doctor.sections?.machine).toBeDefined();
    expect(doctor.sections?.project).toBeDefined();
  }, 60_000);
});
