import type { Command } from "commander";
import fs from "node:fs/promises";
import {
  createSessionHeader,
  getReplayStatus,
  parseSessionEventLine,
  validateSessionEvent,
  validateSessionHeader,
  interpretFromUnknown,
} from "@ftc-dev-tools/shared";
import { createCliContext } from "../context.js";

export function registerReplayCommand(program: Command): void {
  const replay = program
    .command("replay")
    .description("Session recording and offline replay (VISION-13 foundation)");

  replay
    .command("status")
    .description("Report replay schema versions, capabilities, and registered backends")
    .option("--json", "Emit stable machine-readable JSON")
    .action((options: { json?: boolean }) => {
      const report = getReplayStatus();
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        return;
      }

      console.log("Replay status\n");
      console.log(report.message);
      for (const line of report.humanSummary) {
        console.log(line);
      }
      console.log(`Session schema: ${report.sessionSchemaUrl}`);
      console.log(`Event schema: ${report.eventSchemaUrl}`);
      console.log("\nLimits:");
      console.log(`  max duration: ${report.limits.maxDurationMs} ms`);
      console.log(`  max total bytes: ${report.limits.maxTotalBytes}`);
      console.log(`  max event payload: ${report.limits.maxEventPayloadBytes} bytes`);
      console.log("\nRecommended .gitignore entries:");
      for (const entry of report.gitignoreRecommendations) {
        console.log(`  ${entry}`);
      }
      console.log("\nReplay backends:");
      for (const backend of report.replayBackends) {
        console.log(`  ${backend.id} (${backend.kind}) — ${backend.summary}`);
      }
      console.log("\nCapabilities:");
      for (const [key, enabled] of Object.entries(report.capabilities)) {
        console.log(`  ${key}: ${enabled ? "yes" : "deferred"}`);
      }
    });

  const validate = replay.command("validate").description("Validate session header or JSONL event");

  validate
    .command("header")
    .description("Validate a session header JSON file")
    .argument("[file]", "Path to session header JSON (defaults to stdin when omitted)")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (file: string | undefined, options: { json?: boolean }) => {
      try {
        const text = file ? await fs.readFile(file, "utf8") : await readStdin();
        const parsed = JSON.parse(text) as unknown;
        const result = validateSessionHeader(parsed);
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result.valid ? "Session header is valid." : "Session header is invalid.");
          for (const error of result.errors) {
            console.log(`  ${error}`);
          }
        }
        process.exitCode = result.valid ? 0 : 1;
      } catch (error) {
        console.error(interpretFromUnknown(error).summary);
        process.exitCode = 1;
      }
    });

  validate
    .command("event")
    .description("Validate one session event JSON object or a single JSONL line")
    .argument("[file]", "Path to event JSON / JSONL line")
    .option("--json", "Emit stable machine-readable JSON")
    .action(async (file: string | undefined, options: { json?: boolean }) => {
      try {
        const text = file ? await fs.readFile(file, "utf8") : await readStdin();
        const result = text.includes("\n")
          ? parseSessionEventLine(text.split("\n").find((line) => line.trim()) ?? "")
          : validateSessionEvent(JSON.parse(text) as unknown);
        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result.valid ? "Session event is valid." : "Session event is invalid.");
          for (const error of result.errors) {
            console.log(`  ${error}`);
          }
        }
        process.exitCode = result.valid ? 0 : 1;
      } catch (error) {
        console.error(interpretFromUnknown(error).summary);
        process.exitCode = 1;
      }
    });

  replay
    .command("create-header")
    .description("Create a new session header JSON (stdout)")
    .requiredOption("--source <id...>", "Provider id(s) contributing to the session")
    .option("--project-root <path>", "FTC project root at record time")
    .option("--team-number <n>", "FTC team number", (value) => Number.parseInt(value, 10))
    .option("--notes <text>", "Human-readable session label")
    .option("--json", "Emit stable machine-readable JSON")
    .action(
      (options: {
        source: string[];
        projectRoot?: string;
        teamNumber?: number;
        notes?: string;
        json?: boolean;
      }) => {
        try {
          const header = createSessionHeader({
            sources: options.source,
            projectRoot: options.projectRoot ?? createCliContext().cwd,
            teamNumber: options.teamNumber,
            notes: options.notes,
          });
          const validation = validateSessionHeader(header);
          if (!validation.valid) {
            console.error(validation.errors.join("\n"));
            process.exitCode = 1;
            return;
          }
          const output = options.json
            ? JSON.stringify(header, null, 2)
            : JSON.stringify(header, null, 2);
          console.log(output);
        } catch (error) {
          console.error(error instanceof Error ? error.message : String(error));
          process.exitCode = 1;
        }
      },
    );
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}
