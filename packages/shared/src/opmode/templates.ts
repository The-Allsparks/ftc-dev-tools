import type { OpModeKind, OpModeStyle } from "./types.js";

export interface OpModeTemplateInput {
  className: string;
  kind: OpModeKind;
  style: OpModeStyle;
  packageName: string;
  /** Display name in @TeleOp/@Autonomous; defaults to className. */
  name: string;
  group?: string;
}

export function renderOpModeSource(input: OpModeTemplateInput): string {
  const annotation = buildAnnotation(input);
  if (input.style === "iterative") {
    return renderIterative(input, annotation);
  }
  return renderLinear(input, annotation);
}

function buildAnnotation(input: OpModeTemplateInput): string {
  const type = input.kind === "teleop" ? "TeleOp" : "Autonomous";
  const parts = [`name="${escapeJavaString(input.name)}"`];
  if (input.group?.trim()) {
    parts.push(`group="${escapeJavaString(input.group.trim())}"`);
  }
  return `@${type}(${parts.join(", ")})`;
}

function escapeJavaString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function renderLinear(input: OpModeTemplateInput, annotation: string): string {
  return `package ${input.packageName};

import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.${input.kind === "teleop" ? "TeleOp" : "Autonomous"};

${annotation}
public class ${input.className} extends LinearOpMode {
    @Override
    public void runOpMode() {
        telemetry.addData("Status", "Initialized");
        telemetry.update();

        waitForStart();

        while (opModeIsActive()) {
            telemetry.addData("Status", "Running");
            telemetry.update();
        }
    }
}
`;
}

function renderIterative(input: OpModeTemplateInput, annotation: string): string {
  return `package ${input.packageName};

import com.qualcomm.robotcore.eventloop.opmode.OpMode;
import com.qualcomm.robotcore.eventloop.opmode.${input.kind === "teleop" ? "TeleOp" : "Autonomous"};

${annotation}
public class ${input.className} extends OpMode {
    @Override
    public void init() {
        telemetry.addData("Status", "Initialized");
    }

    @Override
    public void loop() {
        telemetry.addData("Status", "Running");
    }
}
`;
}
