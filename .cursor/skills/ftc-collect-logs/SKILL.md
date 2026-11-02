---
name: ftc-collect-logs
description: >-
  Connect to a REV Control Hub over USB or Wi-Fi ADB, copy Robot Controller,
  match, logcat, and TRACE logs onto the laptop, then ask before deleting
  those logs on the robot. Use when the user asks to connect to the robot
  (wired or Wi-Fi), collect, grab, or download hub logs, or clear, remove,
  or delete logs from the Control Hub after a copy.
---

# Collect Hub logs

Copy the on-robot logs to the laptop, show what landed, then **ask** before deleting anything on the Hub. Do not diagnose unless the user asked why something crashed — that is [ftc-crash-diagnose](../ftc-crash-diagnose/SKILL.md).

There is **no** FTC MCP log-pull or log-delete tool. Use ADB. Connection defaults match [ftc-build-deploy](../ftc-build-deploy/SKILL.md).

## Defaults

| Item | Value |
| --- | --- |
| Serial | from MCP `devices`. Wi-Fi ADB is `host:port` (often `192.168.43.1:5555`). A serial with no `:` is USB |
| ADB | `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe` on Windows if PATH is stale |
| RC package | `com.qualcomm.ftcrobotcontroller` |
| Console log | `http://192.168.43.1:8080/downloadFile?name=robotControllerLog.txt` |
| Pull dest | `logs/hub-YYYY-MM-DD-HHmm/` next to the FTC project (do not commit) |

Ask the driver to **STOP** the OpMode before the pull. TRACE `.tlog` flush, if used, happens on STOP.

## Workflow

```
Task Progress:
- [ ] 1. Connect (USB or Wi-Fi; one explicit serial)
- [ ] 2. Copy logs into logs/hub-<stamp>/
- [ ] 3. Report the local copy
- [ ] 4. Ask before removing anything on the Hub
- [ ] 5. Delete only the confirmed paths that copied
```

### 1. Connect

Parallel: MCP `devices`, `hub_status`, `wifi_status` with `projectRoot` = the FTC Android project (absolute path). Inspect each tool with `GetDynamicTools` before `CallDynamicTool`.

| `devices` | What to do |
| --- | --- |
| One serial | Use it. Say whether it is USB or Wi-Fi |
| USB and Wi-Fi both listed | Ask which link. Do not pick |
| Empty | Reconnect, then `devices` again |

**USB.** Data-capable cable. Accept the Hub debugging prompt if it appears. The serial has no `:`.

**Wi-Fi.** Laptop must be on `192.168.43.0/24`. If the console answers and ADB does not, follow [troubleshooting.md](../ftc-build-deploy/troubleshooting.md):

```powershell
adb kill-server
adb start-server
adb connect 192.168.43.1:5555
adb devices -l
```

`adb tcpip 5555` (CLI: `ftc wifi enable-tcpip --device <usb-serial> --yes`) changes how the Hub accepts ADB. Do that only when the user wants Wi-Fi and a USB serial is already listed. Do not put the Hub Wi-Fi password in chat or files. MCP does not join Wi-Fi.

If ADB stays down and port 8080 answers, download `robotControllerLog.txt` from the console URL and stop. Match logs and TRACE are not on that URL, and nothing on the Hub may be deleted.

If the Hub is **off**, say so. Do not offer to delete logs you cannot see.

### 2. Copy

Create `logs/hub-<stamp>/`. Do not write the pull into `TeamCode/`.

Using `-s <serial>`:

1. List `/sdcard/FIRST/`, `/sdcard/FIRST/matchlogs/`, `/sdcard/FIRST/trace/`, `/sdcard/robotControllerLog*`.
2. `adb pull` (skip a path that is not there):
   - `/sdcard/robotControllerLog.txt` and `/sdcard/robotControllerLog.txt.1`
   - the same two names under `/storage/emulated/0/` when the sdcard pull is empty
   - `/sdcard/FIRST/matchlogs/`
   - `/sdcard/FIRST/trace/`
3. `adb logcat -d -v time -t 4000` → `logcat-recent.txt`

Leave `/sdcard/FIRST/*.xml` on the Hub. Those are config, not logs.

### 3. Report

Tell the user the serial (USB or Wi-Fi), the folder, and each file or directory with its size. Name any Hub path that was missing. A 0-byte local file while the Hub listing showed a larger file is a **failed** copy.

### 4. Ask

Stop after the report. Do not delete in the same turn as the copy.

Ask with `AskQuestion` when it is available. Otherwise ask in chat and wait. List only paths whose local copy succeeded. Wording:

> Remove the copied logs from the Control Hub?

- **Files only** — RC log and `.1`, `matchlogs/`, `trace/`
- **Files and logcat** — those paths, plus clear the logcat buffer
- **Keep them** — laptop copy only

A user who already said “and delete them” still gets this confirm, with the path list from this pull. “Keep them” or no answer means stop.

### 5. Delete

Run only after they choose. Use the same `-s <serial>`. Skip any path whose copy failed.

**Files only** (and the file half of **Files and logcat**):

```powershell
adb -s <serial> shell rm -f /sdcard/robotControllerLog.txt /sdcard/robotControllerLog.txt.1 /storage/emulated/0/robotControllerLog.txt /storage/emulated/0/robotControllerLog.txt.1
adb -s <serial> shell rm -rf /sdcard/FIRST/matchlogs /sdcard/FIRST/trace
```

Omit `matchlogs` or `trace` when that directory was not on the Hub.

**Files and logcat** also runs:

```powershell
adb -s <serial> logcat -c
```

Then `ls` the same paths and say what is gone. The laptop folder stays.

## Do not

- `rm` anything under `/sdcard/FIRST/` except `matchlogs` and `trace`
- Delete config XML, the APK, or the Robot Controller app
- `logcat -c` before the copy, or at all unless they chose **Files and logcat**
- Delete when the local copy is missing or smaller than the Hub file
- Factory-reset the Hub or flash firmware
- Stream `ftc logs` and call that a collect. This skill is a one-shot copy

## Related

- Why it crashed: [ftc-crash-diagnose](../ftc-crash-diagnose/SKILL.md) (does not delete Hub logs)
- USB / Wi-Fi reconnect: [troubleshooting.md](../ftc-build-deploy/troubleshooting.md)
- TRACE graphs after a clean run stay a separate pull; this skill may remove `/sdcard/FIRST/trace` only after the confirm above
