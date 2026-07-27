import type { HardwareMapCategory } from "./types.js";

export interface XmlTypeMapping {
  javaType: string;
  javaImport: string;
  category: HardwareMapCategory;
  includedInCodegen: boolean;
}

/** Structural hub/module tags — shown but not codegen'd as hardwareMap devices. */
const MODULE_TAGS = new Set([
  "lynxusbdevice",
  "lynxmodule",
  "usbdevice",
  "legacy module",
  "legacymodule",
  "deviceinterfacemodule",
  "motorscontroller",
  "servocontroller",
  "dcmotorcontroller",
]);

/**
 * Map FTC robot-config XML tags → hardwareMap Java types.
 * Unknown tags still appear in `show` with category unknown.
 */
const TAG_MAP: Record<string, Omit<XmlTypeMapping, "includedInCodegen"> & { includedInCodegen?: boolean }> = {
  motor: {
    javaType: "DcMotor",
    javaImport: "com.qualcomm.robotcore.hardware.DcMotor",
    category: "actuator",
  },
  servo: {
    javaType: "Servo",
    javaImport: "com.qualcomm.robotcore.hardware.Servo",
    category: "actuator",
  },
  continuousrotationservo: {
    javaType: "CRServo",
    javaImport: "com.qualcomm.robotcore.hardware.CRServo",
    category: "actuator",
  },
  digitaldevice: {
    javaType: "DigitalChannel",
    javaImport: "com.qualcomm.robotcore.hardware.DigitalChannel",
    category: "sensor",
  },
  analoginput: {
    javaType: "AnalogInput",
    javaImport: "com.qualcomm.robotcore.hardware.AnalogInput",
    category: "sensor",
  },
  analogoutput: {
    javaType: "AnalogOutput",
    javaImport: "com.qualcomm.robotcore.hardware.AnalogOutput",
    category: "actuator",
  },
  pwmoutput: {
    javaType: "PWMOutput",
    javaImport: "com.qualcomm.robotcore.hardware.PWMOutput",
    category: "actuator",
  },
  lynxembeddedimu: {
    javaType: "IMU",
    javaImport: "com.qualcomm.robotcore.hardware.IMU",
    category: "sensor",
  },
  imu: {
    javaType: "IMU",
    javaImport: "com.qualcomm.robotcore.hardware.IMU",
    category: "sensor",
  },
  voltagesensor: {
    javaType: "VoltageSensor",
    javaImport: "com.qualcomm.robotcore.hardware.VoltageSensor",
    category: "sensor",
  },
  touchsensor: {
    javaType: "TouchSensor",
    javaImport: "com.qualcomm.robotcore.hardware.TouchSensor",
    category: "sensor",
  },
  revtouchsensor: {
    javaType: "TouchSensor",
    javaImport: "com.qualcomm.robotcore.hardware.TouchSensor",
    category: "sensor",
  },
  colorsensor: {
    javaType: "ColorSensor",
    javaImport: "com.qualcomm.robotcore.hardware.ColorSensor",
    category: "sensor",
  },
  revcolorsensorv3: {
    javaType: "ColorSensor",
    javaImport: "com.qualcomm.robotcore.hardware.ColorSensor",
    category: "sensor",
  },
  distancesensor: {
    javaType: "DistanceSensor",
    javaImport: "com.qualcomm.robotcore.hardware.DistanceSensor",
    category: "sensor",
  },
  opticaldistancesensor: {
    javaType: "OpticalDistanceSensor",
    javaImport: "com.qualcomm.robotcore.hardware.OpticalDistanceSensor",
    category: "sensor",
  },
  ultrasonicsensor: {
    javaType: "UltrasonicSensor",
    javaImport: "com.qualcomm.robotcore.hardware.UltrasonicSensor",
    category: "sensor",
  },
  gyrosensor: {
    javaType: "GyroSensor",
    javaImport: "com.qualcomm.robotcore.hardware.GyroSensor",
    category: "sensor",
  },
  lightsensor: {
    javaType: "LightSensor",
    javaImport: "com.qualcomm.robotcore.hardware.LightSensor",
    category: "sensor",
  },
  led: {
    javaType: "LED",
    javaImport: "com.qualcomm.robotcore.hardware.LED",
    category: "actuator",
  },
  webcam: {
    javaType: "WebcamName",
    javaImport: "org.firstinspires.ftc.robotcore.external.hardware.camera.WebcamName",
    category: "vision",
  },
  webcamname: {
    javaType: "WebcamName",
    javaImport: "org.firstinspires.ftc.robotcore.external.hardware.camera.WebcamName",
    category: "vision",
  },
};

export function resolveXmlTypeMapping(xmlType: string): XmlTypeMapping | undefined {
  const key = xmlType.trim().toLowerCase();
  if (MODULE_TAGS.has(key)) {
    return {
      javaType: "",
      javaImport: "",
      category: "module",
      includedInCodegen: false,
    };
  }
  const mapped = TAG_MAP[key];
  if (!mapped) {
    return undefined;
  }
  return {
    ...mapped,
    includedInCodegen: mapped.includedInCodegen !== false,
  };
}

/** Turn a config device name into a Java field identifier. */
export function toJavaFieldName(configName: string, used: Set<string>): string {
  let base = configName
    .trim()
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!base) {
    base = "device";
  }
  if (/^[0-9]/.test(base)) {
    base = `device_${base}`;
  }
  if (!/^[A-Za-z_]/.test(base)) {
    base = `device_${base}`;
  }
  // Prefer camelCase-ish: leave as-is if already a valid id; lowercase first only for ALLCAPS?
  let candidate = base;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${base}_${n}`;
    n += 1;
  }
  used.add(candidate);
  return candidate;
}
