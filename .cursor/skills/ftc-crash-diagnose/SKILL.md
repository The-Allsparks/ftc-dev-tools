---
name: ftc-crash-diagnose
description: >-
  Connect to the REV Control Hub, download Robot Controller / match / logcat /
  TRACE / config files, then identify why an OpMode or the RC app crashed.
  Use when the user says the program crashed, the robot died on INIT/PLAY, the
  Driver Station shows a red error, the RC restart-loops, or asks to pull logs
  and identify the issue.
---

# FTC Hub crash diagnose

When the robot program dies, **pull evidence first, then name the failure**. Do not guess from laptop source. Do not deploy a fix unless the user asked.

There is **no** FTC MCP log-pull tool. Use ADB (and the RC console if ADB is down). Connection defaults match [ftc-build-deploy](../ftc-build-deploy/SKILL.md).

## Defaults

| Item        | Value                                                                           |
| ----------- | ------------------------------------------------------------------------------- |
| Serial      | from MCP `devices`, often `192.168.43.1:5555`                                   |
| ADB         | `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe` on Windows if PATH is stale |
| RC package  | `com.qualcomm.ftcrobotcontroller`                                               |
| Console log | `http://192.168.43.1:8080/downloadFile?name=robotControllerLog.txt`             |
| Pull dest   | `logs/hub-YYYY-MM-DD-HHmm/` next to the FTC project (do not commit)             |

Ask the driver to **STOP** the OpMode before pulling on-robot recordings. TRACE `.tlog` flush, if used, happens on STOP.

## Workflow

```
Task Progress:
- [ ] 1. Connect (devices / hub_status; reconnect if needed)
- [ ] 2. Snapshot Hub into logs/hub-<stamp>/
- [ ] 3. Search crash signatures (newest first)
- [ ] 4. Name the issue with evidence
```

### 1. Connect

Parallel: MCP `devices`, `hub_status`, `wifi_status` with `projectRoot` = the FTC Android project.

If empty: follow [ftc-build-deploy/troubleshooting.md](../ftc-build-deploy/troubleshooting.md) (`adb connect 192.168.43.1:5555`). Console on 8080 with ADB down is still enough to pull `robotControllerLog.txt`.

If the Hub is **off**, diagnose from the newest `logs/hub-*` (or the team's `hub-logs/` copy). Say that the dump is not live.

Crash-loop check:

```powershell
adb -s <serial> shell pidof com.qualcomm.ftcrobotcontroller
```

If the PID changes every few seconds, the **app** is dying at startup, not a single OpMode.

### 2. Pull

Create `logs/hub-<stamp>/`. Do not write throwaway pulls into `TeamCode/`.

Using `-s <serial>`:

1. List: `/sdcard/FIRST/`, `matchlogs/`, `trace/`, `/sdcard/robotControllerLog*`
2. `adb pull` (ignore missing paths):
   - `/sdcard/robotControllerLog.txt` and `.1` (also try `/storage/emulated/0/robotControllerLog.txt`)
   - `/sdcard/FIRST/matchlogs/`
   - `/sdcard/FIRST/trace/` (if the team records TRACE)
   - `/sdcard/FIRST/*.xml` (active config names matter)
3. `adb logcat -d -v time -t 2500` → `logcat-recent.txt`
4. If ADB pull of the RC log fails, download from the console URL above

### 3. Search

Grep the **new pull**, newest lines first. Patterns: [signatures.md](signatures.md).

Ignore generic noise from an RC restart after deploy unless it is the only hit or the PID is crash-looping.

Read the matching **match log** (`Match-0-<OpMode>.txt`). INIT vs PLAY vs STOP is in that file.

If there is no Java exception but the robot “felt dead,” check loop-time / GC / optional TRACE health. That is a performance finding, not an RC crash.

### 4. Identify

Lead with the answer in this shape:

1. **What died** — RC process, OpMode INIT, OpMode PLAY, DS warning only, or recording unavailable while drive continued
2. **Exception** — type + first TeamCode / library frame
3. **Evidence** — file + timestamp (e.g. `robotControllerLog.txt` at 16:08)
4. **Cause** — one sentence (config name mismatch, missing class in APK, Android 7 API, unused webcam, …)
5. **What is not the cause** — if match log is clean, say the OpMode started/stopped; do not treat webcam warnings as OpMode crashes

Shop-proven classes of failure:

| Symptom                                    | Typical cause                                                                                                         |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| RC restart-loops, DS never stays connected | Missing class at RC start (`NoClassDefFoundError`; e.g. a dashboard scanning a library class that never made the APK) |
| OpMode dies at INIT, RC stays up           | Hardware map name mismatch (code `front_left_drive` vs config `left front`; wrong active XML)                         |
| INIT crash, `NoSuchMethodError: toPath`    | Control Hub Android 7 — do not use `File.toPath()` / `java.nio.file.Files`                                            |
| DS red text, match log clean               | Config warning (missing `Webcam 1`), not TeamCode throwing                                                            |
| Drive runs, no `/sdcard/FIRST/trace`       | Recorder failed at configure; look for `unavailable` / library tags in the RC log                                     |

Do **not** auto-fix. After the identification, offer the next step (edit config, code, then [ftc-build-deploy](../ftc-build-deploy/SKILL.md)) only if they want it.

## Do not

- Diagnose from laptop Java without Hub files when the Hub is reachable
- Treat “Unable to find webcam” as the OpMode crash when match logs show a clean START/STOP
- Clear logcat (`logcat -c`) before capturing the failure
- Factory-reset the Hub or flash firmware
- Open a canvas for a single-stack crash. Canvas is for metrics reviews, not this skill’s default
