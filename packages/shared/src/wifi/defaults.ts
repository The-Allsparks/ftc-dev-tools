export const DEFAULT_CONTROL_HUB_HOST = "192.168.43.1";
export const DEFAULT_CONTROL_HUB_ADB_PORT = 5555;
export const DEFAULT_CONTROL_HUB_ADB_ENDPOINT = `${DEFAULT_CONTROL_HUB_HOST}:${DEFAULT_CONTROL_HUB_ADB_PORT}`;
export const DEFAULT_ROBOT_CONSOLE_URL = `http://${DEFAULT_CONTROL_HUB_HOST}:8080`;
export const DEFAULT_ROBOT_SUBNET_CIDR = "192.168.43.0/24";

export function parseHostPort(
  input?: string,
  defaultHost = DEFAULT_CONTROL_HUB_HOST,
  defaultPort = DEFAULT_CONTROL_HUB_ADB_PORT,
): { host: string; port: number; endpoint: string } {
  if (!input || !input.trim()) {
    return {
      host: defaultHost,
      port: defaultPort,
      endpoint: `${defaultHost}:${defaultPort}`,
    };
  }
  const trimmed = input.trim();
  if (trimmed.includes(":")) {
    const [host, portStr] = trimmed.split(":");
    const port = Number.parseInt(portStr ?? String(defaultPort), 10);
    return {
      host: host ?? defaultHost,
      port: Number.isFinite(port) ? port : defaultPort,
      endpoint: `${host}:${port}`,
    };
  }
  return {
    host: trimmed,
    port: defaultPort,
    endpoint: `${trimmed}:${defaultPort}`,
  };
}

export function parseCidr(cidr: string): { network: string; mask: string } {
  const [network, prefixStr] = cidr.split("/");
  const prefix = Number.parseInt(prefixStr ?? "24", 10);
  if (!network || !Number.isFinite(prefix) || prefix < 0 || prefix > 32) {
    throw Object.assign(new Error(`Invalid CIDR: ${cidr}`), { code: "WIFI_ROUTE_FAILED" });
  }
  const maskBits = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const octets = [
    (maskBits >>> 24) & 0xff,
    (maskBits >>> 16) & 0xff,
    (maskBits >>> 8) & 0xff,
    maskBits & 0xff,
  ];
  return {
    network,
    mask: octets.join("."),
  };
}
