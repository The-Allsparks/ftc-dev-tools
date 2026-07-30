import {
  VISION_BRIDGE_CLASS_NAMES,
  VISION_BRIDGE_CODE_VERSION,
  VISION_BRIDGE_LIMITS,
  VISION_DIAGNOSTIC_LOG_PREFIX,
  VISION_DIAGNOSTIC_SCHEMA_VERSION,
} from "./constants.js";

export interface VisionBridgeTemplateInput {
  packageName: string;
  includeVisionPortalHelpers?: boolean;
}

function renderVisionPortalUtilityMethods(): string {
  return `
    /** Snapshot helpers for VisionPortal (VISION-08). Safe when portal is null. */
    public static JSONObject cameraFromPortal(VisionPortal portal) {
        JSONObject camera = new JSONObject();
        if (portal == null) {
            try {
                camera.put("state", "unknown");
            } catch (Exception ignored) {
            }
            return camera;
        }
        try {
            camera.put("state", portal.getCameraState().name().toLowerCase());
            org.firstinspires.ftc.robotcore.external.hardware.camera.CameraName active =
                    portal.getActiveCamera();
            if (active != null) {
                camera.put("name", active.toString());
            }
        } catch (Exception error) {
            try {
                camera.put("state", "error");
                camera.put("error", error.getMessage());
            } catch (Exception ignored) {
            }
        }
        return camera;
    }

    public static JSONArray processorsFromPortal(VisionPortal portal) {
        JSONArray processors = new JSONArray();
        if (portal == null) {
            return processors;
        }
        try {
            for (String name : portal.getProcessorNames()) {
                if (processors.length() >= ${VISION_BRIDGE_LIMITS.maxProcessors}) {
                    break;
                }
                JSONObject entry = new JSONObject();
                entry.put("name", name);
                entry.put("enabled", portal.isProcessorEnabled(name));
                entry.put("kind", classifyProcessor(name));
                processors.put(entry);
            }
        } catch (Exception ignored) {
            // omit broken processor enumeration
        }
        return processors;
    }

    private static String classifyProcessor(String processorName) {
        String lower = processorName.toLowerCase();
        if (lower.contains("apriltag")) {
            return "apriltag";
        }
        if (lower.contains("color")) {
            return "color";
        }
        if (lower.contains("tfod") || lower.contains("tensorflow")) {
            return "tfod";
        }
        return "generic";
    }
`;
}

export function renderVisionDiagnosticBridgeSource(input: VisionBridgeTemplateInput): string {
  const { utility } = VISION_BRIDGE_CLASS_NAMES;
  const visionPortalImports = input.includeVisionPortalHelpers
    ? "\nimport org.firstinspires.ftc.vision.VisionPortal;"
    : "";
  const visionPortalMethods = input.includeVisionPortalHelpers
    ? renderVisionPortalUtilityMethods()
    : "";

  return `package ${input.packageName};

import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;${visionPortalImports}

/**
 * Optional Vision Lab diagnostic bridge (VISION-07).
 * Emits structured JSON to Logcat — never motor commands or raw frames.
 * ${input.includeVisionPortalHelpers ? "VisionPortal snapshot helpers included (VISION-08)." : "Wire VisionPortal via `ftc vision visionportal status` hints or re-scaffold after adding VisionPortal."}
 */
public final class ${utility} {
    public static final String BRIDGE_VERSION = "${VISION_BRIDGE_CODE_VERSION}";
    public static final String SCHEMA_VERSION = "${VISION_DIAGNOSTIC_SCHEMA_VERSION}";
    public static final String LOG_TAG = "FtcVisionBridge";
    public static final String LOG_PREFIX = "${VISION_DIAGNOSTIC_LOG_PREFIX}";
    public static final int MAX_PAYLOAD_BYTES = ${VISION_BRIDGE_LIMITS.maxPayloadBytes};
    public static final long MIN_INTERVAL_MS = ${VISION_BRIDGE_LIMITS.minIntervalMs}L;

    private String sessionId;
    private int sequence;
    private long lastEmitMs;

    public void beginSession(String sessionId) {
        this.sessionId = sessionId;
        this.sequence = 0;
        this.lastEmitMs = 0L;
    }

    public boolean emitSnapshot(long timestampMs, JSONObject camera, JSONArray processors, JSONArray warnings) {
        if (sessionId == null) {
            return false;
        }
        long now = System.currentTimeMillis();
        if (lastEmitMs > 0 && (now - lastEmitMs) < MIN_INTERVAL_MS) {
            return false;
        }
        try {
            JSONObject payload = new JSONObject();
            payload.put("schemaVersion", SCHEMA_VERSION);
            payload.put("sessionId", sessionId);
            payload.put("sequence", sequence++);
            payload.put("timestampMs", timestampMs);
            payload.put("bridgeVersion", BRIDGE_VERSION);
            if (camera != null) {
                payload.put("camera", camera);
            }
            if (processors != null) {
                payload.put("processors", processors);
            }
            if (warnings != null) {
                payload.put("warnings", warnings);
            }
            String json = payload.toString();
            if (json.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > MAX_PAYLOAD_BYTES) {
                Log.w(LOG_TAG, "Diagnostic payload exceeded MAX_PAYLOAD_BYTES; dropped.");
                return false;
            }
            Log.i(LOG_TAG, LOG_PREFIX + json);
            lastEmitMs = now;
            return true;
        } catch (Exception error) {
            Log.w(LOG_TAG, "Failed to emit diagnostic payload: " + error.getMessage());
            return false;
        }
    }${visionPortalMethods}
}
`;
}

export function renderVisionDiagnosticOpModeSource(input: VisionBridgeTemplateInput): string {
  const { utility, opMode } = VISION_BRIDGE_CLASS_NAMES;
  const visionPortalFields = input.includeVisionPortalHelpers
    ? `
    // Assign your team's VisionPortal instance (see \`ftc vision visionportal status\`):
    private VisionPortal visionPortal = null;
`
    : "";
  const snapshotBlock = input.includeVisionPortalHelpers
    ? `            JSONObject camera = ${utility}.cameraFromPortal(visionPortal);
            JSONArray processors = ${utility}.processorsFromPortal(visionPortal);`
    : `            JSONObject camera = new JSONObject();
            try {
                camera.put("state", "unknown");
            } catch (Exception ignored) {
            }
            JSONArray processors = new JSONArray();`;

  return `package ${input.packageName};

import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.UUID;${input.includeVisionPortalHelpers ? "\nimport org.firstinspires.ftc.vision.VisionPortal;" : ""}

/**
 * Development-only diagnostic OpMode. Does not drive motors or accept gamepad input.
 * Run while streaming Logcat; desktop tools parse lines prefixed with FTC_VISION_DIAG.
 */
@TeleOp(name = "FTC Vision Diagnostic", group = "FTC Dev Tools")
public class ${opMode} extends LinearOpMode {
    private final ${utility} bridge = new ${utility}();${visionPortalFields}

    @Override
    public void runOpMode() {
        bridge.beginSession(UUID.randomUUID().toString());
        telemetry.addLine("Vision diagnostic bridge active.");
        telemetry.addLine("No motors are controlled by this OpMode.");
        telemetry.update();

        waitForStart();

        while (opModeIsActive()) {
${snapshotBlock}
            bridge.emitSnapshot(System.currentTimeMillis(), camera, processors, new JSONArray());
            sleep(250);
        }
    }
}
`;
}
