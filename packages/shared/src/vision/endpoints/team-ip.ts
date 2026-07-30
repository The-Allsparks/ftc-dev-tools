/** Heuristic team-number → robot-network IP helpers (config-only candidates). */

export function teamNumberToSubnetOctets(teamNumber: number): [number, number] | undefined {
  if (!Number.isFinite(teamNumber) || teamNumber <= 0) {
    return undefined;
  }
  const digits = String(Math.trunc(teamNumber));
  const segment = digits.length > 4 ? digits.slice(-4) : digits.padStart(4, "0");
  const first = Number.parseInt(segment.slice(0, 2), 10);
  const second = Number.parseInt(segment.slice(2, 4), 10);
  if (!Number.isFinite(first) || !Number.isFinite(second)) {
    return undefined;
  }
  return [first, second];
}

export function teamNumberToLimelightHost(teamNumber: number): string | undefined {
  const octets = teamNumberToSubnetOctets(teamNumber);
  if (!octets) {
    return undefined;
  }
  return `10.${octets[0]}.${octets[1]}.11`;
}

export function wifiSerialToHost(serial: string): string | undefined {
  const trimmed = serial.trim();
  if (!trimmed.includes(":")) {
    return undefined;
  }
  const [host] = trimmed.split(":");
  if (!host || !/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)) {
    return undefined;
  }
  return host;
}
