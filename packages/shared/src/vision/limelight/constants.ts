/** Limelight Vision REST API defaults (port 5807). */
export const DEFAULT_LIMELIGHT_API_PORT = 5807;
export const DEFAULT_LIMELIGHT_WEB_PORT = 5801;
export const DEFAULT_LIMELIGHT_STREAM_PORT = 5800;

export function limelightApiBaseUrl(host: string, port = DEFAULT_LIMELIGHT_API_PORT): string {
  return `http://${host.trim()}:${port}`;
}
