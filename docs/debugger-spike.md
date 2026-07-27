# Debugger spike (JDWP / VS Code Java)

**Status:** research document only. FTC Dev Tools does **not** claim breakpoint debugging support until validated on physical FTC hardware.

## Goal

Determine whether reliable Java breakpoint debugging of FTC `TeamCode` on a Control Hub or phone Robot Controller is practical through ADB + JDWP + the VS Code Java debugger.

## Technical path (hypothesis)

1. Build a **debug** APK (`assembleDebug` — already used by `ftc build`).
2. Install and launch the Robot Controller application.
3. Discover the app process / JDWP pid via `adb jdwp` (or `adb shell ps` + forward).
4. `adb forward tcp:<local> jdwp:<pid>`.
5. Attach VS Code Java debugger (`java` debug type) to `localhost:<local>`.
6. Map sources from the Gradle project (`TeamCode`) into the debug session.

## Open questions (must answer on hardware)

| Question                                                      | Current answer                                                                                                       |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Is the RC process debuggable in the standard FTC debug build? | **Unknown on Control Hub** — Android `android:debuggable` typically true for debug builds, but hub policy may differ |
| Can `adb jdwp` identify it?                                   | **Likely on phones**; Control Hub restrictions unvalidated                                                           |
| Can VS Code attach reliably?                                  | **Unproven**                                                                                                         |
| What launch configuration is required?                        | Likely attach config with `host`/`port` after forward; may need `sourcePaths`                                        |
| Can breakpoints in `TeamCode` be hit?                         | **Unproven** — depends on source mapping and class loading                                                           |
| Does pausing create robot safety risks?                       | **Yes, assume yes** until proven otherwise                                                                           |
| Watchdogs / motors / Driver Station while paused?             | **Expect motors may hold last command; DS may disconnect or watchdog**; document emergency stop                      |
| USB required vs Wi-Fi ADB?                                    | USB preferred for reliability; Wi-Fi ADB unknown for JDWP stability                                                  |
| Control Hub vs phone RC differences?                          | **Expected**; must test both                                                                                         |
| Competition / safety warnings?                                | Mandatory if ever shipped                                                                                            |

## Safety requirements (if ever implemented)

Commands under consideration (not shipped):

- `FTC: Attach Java Debugger to Robot Controller`
- `FTC: Build, Deploy, and Debug`
- `FTC: Stop Debug Session`

Required UX copy:

- Only debug with the robot raised or otherwise made safe
- Breakpoints may pause control loops
- Motor outputs may remain in their last commanded state
- Do **not** use breakpoint debugging during a match
- Documented emergency-stop procedure (Driver Station stop + physical E-stop / power)

## If not viable

Document the blocker here and improve non-pausing diagnostics instead:

- Structured telemetry
- Conditional logging / logpoints
- Recording and replay
- Assertion / error capture + diagnostic bundles

## Acceptance criteria for implementation (future)

- Breakpoints hit reliably in `TeamCode` on a Control Hub
- Source mapping works
- Attach procedure is repeatable
- Safety behavior documented and acknowledged in UI
- Robot remains recoverable after pause/disconnect
- Physical Control Hub testing complete and recorded in [feature-maturity.md](feature-maturity.md)

Until then: **no-go for product claims**.
