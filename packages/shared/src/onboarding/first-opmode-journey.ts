/** Plain-language Driver Station steps shown after deploy (#42). */
export const DRIVER_STATION_INIT_START_LINES = [
  "On the Driver Station phone or tablet:",
  "1. Tap Init — the app scans for the robot and loads your configuration.",
  "2. Choose your new OpMode from the list (same name as the Java class).",
  "3. Tap Start when you are ready to run it on the robot.",
  "If Init fails, check USB/Wi‑Fi connection and that deploy finished without errors.",
] as const;

export function formatDriverStationInitStartMessage(): string {
  return DRIVER_STATION_INIT_START_LINES.join("\n");
}
