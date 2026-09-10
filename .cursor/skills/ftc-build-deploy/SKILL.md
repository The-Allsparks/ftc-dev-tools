---
name: ftc-build-deploy
description: >-
  Build TeamCode and install it on a REV Control Hub using the FTC Dev Tools
  MCP (doctor, devices, build, deploy). Use when the user asks to build, deploy,
  push, or install robot/TeamCode on the Hub, Control Hub, or robot; when laptop
  Java/JSON will not take effect until an APK is on the device; or after TeamCode
  changes that must be floor-tested.
---

# FTC Hub build and deploy

Push robot code with the **FTC Dev Tools MCP**, not Android Studio, and not a silent Gradle/ADB guess.

## Defaults

| Item            | Value                                                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| MCP             | Discover `doctor` / `devices` / `build` / `deploy` (Cursor namespace is often `user-ftc-dev-tools`)                                                |
| Project root    | FTC Android project folder with `settings.gradle` (not workspace root, not `TeamCode/` alone). Use `FTC_PROJECT_ROOT` / `ftc.projectRoot` when set |
| Wireless serial | From `devices`; Control Hub ADB is often `192.168.43.1:5555`                                                                                       |
| RC console      | `http://192.168.43.1:8080`                                                                                                                         |

Inspect each tool with `GetDynamicTools` before `CallDynamicTool`. Always set `mcpDetails`. Pass `projectRoot` as an absolute path.

Do **not** pick a device when more than one is listed. Do **not** reuse `confirmPlanId` / `confirmPlanHash` from an old chat — copy them from **this** dry-run.

## Workflow

```
Task Progress:
- [ ] 1. Schema + doctor + devices
- [ ] 2. Dry-run deploy with an explicit serial
- [ ] 3. Confirm deploy (builds APK + installs + launches RC)
- [ ] 4. Tell the driver what to INIT on the DS
```

### 1. Readiness

Call in parallel:

- `doctor` — Java, adb, Gradle Wrapper, project
- `devices` — ADB serials (Hub labeling is probable only)

If the list is empty, run `wifi_status` and `hub_status`. Laptop must reach the Hub (often `192.168.43.1`). Then see [troubleshooting.md](troubleshooting.md).

If doctor/Java/adb fail, stop and report that. Do not invent a Gradle command as a workaround until MCP is actually unavailable.

### 2. Dry-run

```
deploy
  projectRoot: <FTC project abs path>
  device: <serial from devices>
  dryRun: true
```

Read the returned plan. Copy `confirmPlanId` and `confirmPlanHash` exactly.

### 3. Apply

```
deploy
  projectRoot: <same>
  device: <same serial>
  confirmPlanId: <from dry-run>
  confirmPlanHash: <from dry-run>
  yes: true
```

`deploy` already builds. A separate `build` is only for “compile now, Hub later.” `build` also needs `yes=true`; if it returns a plan, confirm that plan the same way.

### 4. After success

Say clearly:

1. APK is on the Hub and Robot Controller was launched.
2. On the Driver Station, STOP any running OpMode, then INIT the OpMode that contains the change.
3. Laptop source and `TeamCode/src/main/assets` files are **not** live until this install. PLAY does not reload them.
4. STOP before pulling on-robot logs (TRACE `.tlog` flush, if the team uses it, happens on STOP).

If deploy did not run, say so. Do not imply the robot has the new code.

## Build-only

Use `build` with `projectRoot` + `yes=true` when:

- the user asked to compile, not install
- no Hub is connected and they still want an APK ready

Confirm the plan if the tool returns one.

## Do not

- Run `gradlew` from a parent workspace that is not the FTC project. TeamCode Gradle lives in the folder with `settings.gradle`.
- Call `installDebug` / raw `adb install` while MCP `deploy` works.
- Flash Hub firmware or factory-reset.
- Join Hub Wi-Fi by embedding the password in chat or files.
- Treat “devices empty” as a successful deploy. Build the APK if useful, then stop.

## Related

- Connection and ADB recovery: [troubleshooting.md](troubleshooting.md)
- Crash logs after a bad run: [ftc-crash-diagnose](../ftc-crash-diagnose/SKILL.md)
- MCP tool catalog: [docs/mcp.md](../../docs/mcp.md)
