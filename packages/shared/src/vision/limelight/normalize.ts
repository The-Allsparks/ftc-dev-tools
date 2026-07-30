import type {
  LimelightDeviceStatus,
  LimelightQuaternion,
  LimelightTargetingResults,
} from "./types.js";

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asBooleanFromInt(value: unknown): boolean | undefined {
  const num = asNumber(value);
  if (num === undefined) {
    return undefined;
  }
  return num !== 0;
}

function parseQuaternion(value: unknown): LimelightQuaternion | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const w = asNumber(record.w);
  const x = asNumber(record.x);
  const y = asNumber(record.y);
  const z = asNumber(record.z);
  if (w === undefined || x === undefined || y === undefined || z === undefined) {
    return undefined;
  }
  return { w, x, y, z };
}

function parseBgrArray(value: unknown): [number, number, number] | undefined {
  if (!Array.isArray(value) || value.length < 3) {
    return undefined;
  }
  const b = asNumber(value[0]);
  const g = asNumber(value[1]);
  const r = asNumber(value[2]);
  if (b === undefined || g === undefined || r === undefined) {
    return undefined;
  }
  return [b, g, r];
}

export function normalizeLimelightStatus(
  host: string,
  apiBaseUrl: string,
  raw: Record<string, unknown> | undefined,
  httpStatus: number,
  reachable: boolean,
  message: string,
): LimelightDeviceStatus {
  const fetchedAt = new Date().toISOString();
  if (!raw) {
    return {
      host,
      apiBaseUrl,
      reachable,
      httpStatus,
      fetchedAt,
      message,
    };
  }

  return {
    host,
    apiBaseUrl,
    reachable,
    httpStatus,
    deviceName: typeof raw.name === "string" ? raw.name : undefined,
    pipelineIndex: asNumber(raw.pipelineIndex),
    pipelineType: typeof raw.pipelineType === "string" ? raw.pipelineType : undefined,
    fps: asNumber(raw.fps),
    cpuPercent: asNumber(raw.cpu),
    ramPercent: asNumber(raw.ram),
    temperatureCelsius: asNumber(raw.temp),
    hardwareType: asNumber(raw.hwType),
    snapshotMode: asNumber(raw.snapshotMode),
    ignoreNetworkTables: asBooleanFromInt(raw.ignoreNT),
    cameraQuat: parseQuaternion(raw.cameraQuat),
    raw,
    fetchedAt,
    message,
  };
}

export function normalizeLimelightResults(
  host: string,
  apiBaseUrl: string,
  raw: Record<string, unknown> | undefined,
  httpStatus: number,
  reachable: boolean,
  message: string,
  staleThresholdMs = 500,
): LimelightTargetingResults {
  const fetchedAt = new Date().toISOString();
  if (!raw) {
    return {
      host,
      apiBaseUrl,
      reachable,
      httpStatus,
      target: { valid: false },
      stale: true,
      fetchedAt,
      message,
    };
  }

  const valid = asNumber(raw.v) === 1;
  const latencyPipelineMs = asNumber(raw.tl);
  const latencyCaptureMs = asNumber(raw.cl);
  const latencyTotalMs =
    latencyPipelineMs !== undefined && latencyCaptureMs !== undefined
      ? latencyPipelineMs + latencyCaptureMs
      : (latencyPipelineMs ?? latencyCaptureMs);

  const timestampMicros =
    asNumber(raw.ts_us) ?? (asNumber(raw.ts) !== undefined ? asNumber(raw.ts)! * 1000 : undefined);
  const fetchedMs = Date.parse(fetchedAt);
  const updateAgeMs =
    timestampMicros !== undefined && Number.isFinite(fetchedMs)
      ? Math.max(0, fetchedMs - timestampMicros / 1000)
      : undefined;
  const stale = updateAgeMs !== undefined ? updateAgeMs > staleThresholdMs : false;

  return {
    host,
    apiBaseUrl,
    reachable,
    httpStatus,
    target: {
      valid,
      tx: asNumber(raw.tx),
      ty: asNumber(raw.ty),
      ta: asNumber(raw.ta),
      latencyPipelineMs,
      latencyCaptureMs,
      latencyTotalMs,
      timestampMicros,
      frameIndex: asNumber(raw.fidx),
      pipelineIndex: asNumber(raw.pID ?? raw.pipelineIndex),
      pipelineType:
        typeof raw.pTYPE === "string"
          ? raw.pTYPE
          : typeof raw.pipelineType === "string"
            ? raw.pipelineType
            : undefined,
      crosshairColorBgr: parseBgrArray(raw.tc),
      classifierClass: typeof raw.tcclass === "string" ? raw.tcclass : undefined,
      detectorClass: typeof raw.tdclass === "string" ? raw.tdclass : undefined,
    },
    updateAgeMs,
    stale,
    raw,
    fetchedAt,
    message,
  };
}
