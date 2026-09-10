# Hub connection troubleshooting

Use this only when `devices` is empty, a device is `offline` / `unauthorized`, or deploy fails after a good dry-run.

## Expected wireless layout

Control Hub AP is `192.168.43.0/24`. Wireless ADB serial is usually `192.168.43.1:5555`. Console is `http://192.168.43.1:8080`.

The laptop needs a NIC on that subnet (robot Wi-Fi, often a second adapter while ethernet keeps internet). `wifi_status` reports wireless adb and console reachability. MCP does **not** expose `wifi join` / password apply — do not try to set Hub Wi-Fi from the agent.

## Reconnect ADB

If console (port 8080) answers but ADB does not:

```powershell
adb kill-server
adb start-server
adb connect 192.168.43.1:5555
adb devices -l
```

Then re-run MCP `devices`. Prefer `adb` from Android SDK platform-tools if PATH is stale: `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe` on Windows.

USB fallback: data-capable cable, unlock Hub, accept the debugging prompt, then `devices` again. Pass that USB serial into `deploy` instead of the Wi-Fi serial.

## Deploy failures

- **Multiple devices:** pass `device` explicitly. Tools will not guess.
- **OpMode running:** ask the driver to STOP. Install restarts Robot Controller.
- **Unauthorized:** debugging prompt on the Hub; do not keep retrying blindly.
- **Gradle/Java:** `doctor` first. Use the JDK the FTC season requires. Do not swap in a system `gradle` — use the project wrapper via MCP `build` / `deploy`.
- **Composite libraries:** deploy the FTC Android project (`includeBuild` consumers), not a library folder alone.

## After a dropped Hub mid-session

Wireless ADB often drops after RC restart. Reconnect, then `devices` before another deploy or `adb pull`. Console download of `robotControllerLog.txt` still works at `http://192.168.43.1:8080/downloadFile?name=robotControllerLog.txt` when ADB is down.
