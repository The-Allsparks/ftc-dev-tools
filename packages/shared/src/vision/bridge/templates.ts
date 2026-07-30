import {
  VISION_BRIDGE_CLASS_NAMES,
  VISION_BRIDGE_CODE_VERSION,
  VISION_BRIDGE_LIMITS,
  VISION_DIAGNOSTIC_LOG_PREFIX,
  VISION_DIAGNOSTIC_SCHEMA_VERSION,
} from "./constants.js";

export interface VisionBridgeTemplateInput {
  packageName: string;
}

export function renderVisionDiagnosticBridgeSource(input: VisionBridgeTemplateInput): string {
  const { utility } = VISION_BRIDGE_CLASS_NAMES;
  return `package ${input.packageName};

import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Optional Vision Lab diagnostic bridge (VISION-07).
 * Emits structured JSON to Logcat — never motor commands or raw frames.
 * Wire VisionPortal in VISION-08; this utility only serializes snapshots you provide.
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
    }
}
`;
}

export function renderVisionDiagnosticOpModeSource(input: VisionBridgeTemplateInput): string {
  const { utility, opMode } = VISION_BRIDGE_CLASS_NAMES;
  return `package ${input.packageName};

import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.UUID;

/**
 * Development-only diagnostic OpMode. Does not drive motors or accept gamepad input.
 * Run while streaming Logcat; desktop tools parse lines prefixed with FTC_VISION_DIAG.
 */
@TeleOp(name = "FTC Vision Diagnostic", group = "FTC Dev Tools")
public class ${opMode} extends LinearOpMode {
    private final ${utility} bridge = new ${utility}();

    @Override
    public void runOpMode() {
        bridge.beginSession(UUID.randomUUID().toString());
        telemetry.addLine("Vision diagnostic bridge active.");
        telemetry.addLine("No motors are controlled by this OpMode.");
        telemetry.update();

        waitForStart();

        while (opModeIsActive()) {
            JSONObject camera = new JSONObject();
            try {
                camera.put("state", "unknown");
            } catch (Exception ignored) {
            }
            bridge.emitSnapshot(System.currentTimeMillis(), camera, new JSONArray(), new JSONArray());
            sleep(250);
        }
    }
}
`;
}
