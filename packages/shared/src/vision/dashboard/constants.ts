/** Default FTC Dashboard port on the Robot Controller network. */
export const DEFAULT_FTC_DASHBOARD_PORT = 8080;

/** Default FTC Dashboard path (Acme Robotics convention). */
export const DEFAULT_FTC_DASHBOARD_PATH = "/dash";

export function buildFtcDashboardUrl(
  host: string,
  port: number = DEFAULT_FTC_DASHBOARD_PORT,
  path: string = DEFAULT_FTC_DASHBOARD_PATH,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `http://${host}:${port}${normalizedPath}`;
}
