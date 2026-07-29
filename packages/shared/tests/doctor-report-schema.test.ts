import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020Import from "ajv/dist/2020.js";
import addFormatsImport from "ajv-formats";
import { describe, expect, it } from "vitest";
import { buildReadinessSnapshotFromDoctor } from "../src/readiness/readiness-model.js";
import type { DoctorCheck } from "../src/types/errors.js";

const Ajv2020 = Ajv2020Import as unknown as new (opts: object) => {
  compile: (schema: object) => (data: unknown) => boolean;
};
const addFormats = addFormatsImport as unknown as (ajv: object) => void;

const schemaPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../schemas/doctor-report.schema.json",
);

describe("doctor-report.schema.json", () => {
  it("validates a report with readinessSnapshot (#82)", () => {
    const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8")) as object;
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(schema);

    const checks: DoctorCheck[] = [
      { id: "java", label: "Java", status: "pass", required: true, category: "machine" },
      { id: "ftc-project", label: "Project", status: "pass", required: true, category: "project" },
      {
        id: "devices",
        label: "Devices",
        status: "skip",
        required: false,
        category: "robot",
        detail: "No device provider",
      },
    ];
    const readinessSnapshot = buildReadinessSnapshotFromDoctor({
      checks,
      readiness: { computerReady: true, projectReadyToBuild: true, robotReadyToDeploy: false },
    });

    const report = {
      ready: false,
      readiness: {
        computerReady: true,
        projectReadyToBuild: true,
        robotReadyToDeploy: false,
      },
      readinessSnapshot,
      checks,
      sections: {
        machine: { id: "machine", title: "Computer setup", ready: true, checks: [checks[0]!] },
        project: { id: "project", title: "FTC project setup", ready: true, checks: [checks[1]!] },
        robot: { id: "robot", title: "Robot connection", ready: false, checks: [checks[2]!] },
      },
      summaryLine: "Not ready to deploy yet.",
      generatedAt: new Date().toISOString(),
      version: "0.1.0",
    };

    expect(validate(report)).toBe(true);
  });
});
