import type { OpModeKind, OpModeStyle } from "../opmode/types.js";
import { isValidFtcDeviceName } from "../robot-config/defaults.js";
import type { HardwareMapEntry } from "./types.js";

export interface HwMapOpModeTemplateInput {
  className: string;
  kind: OpModeKind;
  style: OpModeStyle;
  packageName: string;
  name: string;
  group?: string;
  configName: string;
  entries: HardwareMapEntry[];
}

export function renderHwMapOpModeSource(input: HwMapOpModeTemplateInput): string {
  const codegenEntries = input.entries.filter(
    (e) => e.includedInCodegen && e.javaType && e.javaImport && isValidFtcDeviceName(e.configName),
  );
  const imports = collectImports(input, codegenEntries);
  const annotation = buildAnnotation(input);
  const fields = codegenEntries.map((e) => `    private ${e.javaType} ${e.fieldName};`).join("\n");
  const inits = codegenEntries
    .map(
      (e) =>
        `        ${e.fieldName} = hardwareMap.get(${e.javaType}.class, "${escapeJavaString(e.configName)}");`,
    )
    .join("\n");

  const fieldBlock = fields.length > 0 ? `\n${fields}\n` : "\n";
  const initBlock =
    inits.length > 0
      ? inits
      : "        // No mapped devices from config — add hardwareMap.get(...) as needed.";

  const configComment = sanitizeJavaComment(input.configName);

  if (input.style === "iterative") {
    return `package ${input.packageName};

${imports}

${annotation}
public class ${input.className} extends OpMode {
${fieldBlock}
    @Override
    public void init() {
        // Generated from robot config: ${configComment}
${initBlock}
        telemetry.addData("Status", "Initialized");
    }

    @Override
    public void loop() {
        telemetry.addData("Status", "Running");
    }
}
`;
  }

  return `package ${input.packageName};

${imports}

${annotation}
public class ${input.className} extends LinearOpMode {
${fieldBlock}
    @Override
    public void runOpMode() {
        // Generated from robot config: ${configComment}
${initBlock}

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

function collectImports(input: HwMapOpModeTemplateInput, entries: HardwareMapEntry[]): string {
  const lines = new Set<string>();
  if (input.style === "iterative") {
    lines.add("import com.qualcomm.robotcore.eventloop.opmode.OpMode;");
  } else {
    lines.add("import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;");
  }
  lines.add(
    `import com.qualcomm.robotcore.eventloop.opmode.${input.kind === "teleop" ? "TeleOp" : "Autonomous"};`,
  );
  for (const e of entries) {
    if (e.javaImport) {
      lines.add(`import ${e.javaImport};`);
    }
  }
  return [...lines].sort().join("\n");
}

function buildAnnotation(input: HwMapOpModeTemplateInput): string {
  const type = input.kind === "teleop" ? "TeleOp" : "Autonomous";
  const parts = [`name="${escapeJavaString(input.name)}"`];
  if (input.group?.trim()) {
    parts.push(`group="${escapeJavaString(input.group.trim())}"`);
  }
  return `@${type}(${parts.join(", ")})`;
}

/**
 * Escape for a Java "..." string literal in generated source.
 * Backslashes become \\u005c so a following uXXXX cannot form a Unicode escape
 * at the Java translation phase (CWE-94).
 */
export function escapeJavaString(value: string): string {
  let out = "";
  for (const ch of value) {
    switch (ch) {
      case "\\":
        out += "\\u005c";
        break;
      case '"':
        out += '\\"';
        break;
      case "\n":
        out += "\\n";
        break;
      case "\r":
        out += "\\r";
        break;
      case "\t":
        out += "\\t";
        break;
      default: {
        const code = ch.charCodeAt(0);
        if (code < 0x20) {
          out += `\\u${code.toString(16).padStart(4, "0")}`;
        } else {
          out += ch;
        }
      }
    }
  }
  return out;
}

/** Keep // comments from being terminated or extended via Unicode escapes. */
function sanitizeJavaComment(value: string): string {
  return value.replace(/\\|[\u0000-\u001f]/g, "_");
}
