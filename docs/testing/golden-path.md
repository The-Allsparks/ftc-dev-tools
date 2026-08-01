# Golden-path test protocol

Repeatable procedure for validating the core FTC Dev Tools workflow on a physical REV Control Hub. A tester who did not write FTC Dev Tools should be able to execute this protocol using only this document and the linked user guides.

**Supported alpha target:** [supported-alpha-configuration.md](supported-alpha-configuration.md)

**Report results using:** [hardware-test-report-template.md](hardware-test-report-template.md)

**Track evidence in:** [validation-matrix.md](validation-matrix.md)

---

## Required hardware

| Item                  | Notes                                               |
| --------------------- | --------------------------------------------------- |
| Windows 11 PC         | Primary alpha evidence target                       |
| REV Control Hub       | Charged, known-good USB cable                       |
| USB cable             | Data-capable (not charge-only)                      |
| Driver Station device | Android phone or tablet with REV Driver Station app |
| Optional: USB hub     | Document if used — can affect ADB stability         |

Do **not** factory-reset the Control Hub or flash firmware as part of this protocol.

---

## Required host environment

| Component                  | Requirement                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------ |
| IDE                        | VS Code or Cursor with FTC Dev Tools extension installed                                         |
| CLI                        | `ftc` on PATH (`ftc --version` matches extension release when possible)                          |
| JDK                        | 17 (`ftc doctor` Java check passes)                                                              |
| Android SDK platform-tools | ADB available (`ftc doctor` ADB check passes)                                                    |
| FTC project                | Official-style Android project with Gradle Wrapper and TeamCode module                           |
| FTC SDK                    | Document exact Maven version from `build.dependencies.gradle` (supported range: 11.0.x – 11.1.x) |

Record versions with:

```bash
ftc validation env
ftc validation env --json
```

---

## Starting conditions

Before step 1, ensure:

1. Control Hub is **not** connected via USB (for install validation) OR document that install was verified previously.
2. FTC project opens cleanly in VS Code/Cursor at the **project root** (folder containing `settings.gradle`).
3. No other Android devices are connected unless testing multi-device behavior (§G.7).
4. Driver Station app is installed on the DS device but **not** required until step 7.

---

## Installation procedure (step 1)

Follow [Getting started](../getting-started.md) and [CLI install](../cli-install.md).

1. Install FTC Dev Tools extension from VSIX or marketplace channel documented for the release under test.
2. Install CLI globally or use the bundled CLI from the extension.
3. Install JDK 17 and Android SDK platform-tools using **FTC: Set Up This Computer** or the install-deps script for Windows.
4. Restart terminal and IDE after PATH changes.

**Expected:** `ftc --version` prints the release under test. Extension version visible in VS Code Extensions panel matches (or skew is documented).

**Failure evidence:** Screenshot of extension panel, `ftc validation env --json`, doctor output.

---

## Project preparation (step 2)

1. Clone or open an official-style FTC project (e.g. team repository or FTC SDK template).
2. Open the **repository root** in VS Code/Cursor — not the `TeamCode` subfolder alone.
3. Confirm project detection: sidebar shows FTC project context or `ftc doctor` project check passes.

**Expected:** Doctor project and Gradle Wrapper checks pass. No “wrong folder” warning.

**Failure evidence:** `ftc doctor --json`, `ftc validation bundle collect --redact -o bundle.json`.

---

## Control Hub preparation (steps 4–5)

1. Power on Control Hub.
2. Connect USB cable to the Windows PC.
3. On first connect, accept **USB debugging** authorization on the hub (if prompted).
4. Run `ftc devices` or **FTC: Refresh Device Status**.

**Expected:** Exactly one authorized device listed. Serial visible. Connection type USB.

**Failure evidence:** `adb devices -l` output (redact serial in public reports), `ftc validation env --json`.

**Recovery:** Re-plug cable, revoke/re-authorize USB debugging, restart ADB (`adb kill-server && adb start-server`).

---

## Driver Station preparation (step 7)

1. Pair Driver Station with the same robot network / team number as the Control Hub.
2. Confirm DS sees the robot before attempting OpMode start.

**Expected:** DS shows robot available. No blocking configuration errors.

---

## Workflow steps

| #   | Step                   | Command / action                                  | Expected result                                        | Failure evidence                 |
| --- | ---------------------- | ------------------------------------------------- | ------------------------------------------------------ | -------------------------------- |
| 1   | Install toolchain      | See Installation above                            | Doctor computer checks pass                            | `ftc doctor --json`              |
| 2   | Open project           | Open root in IDE                                  | Project detected                                       | Doctor project section           |
| 3   | Run diagnostics        | `ftc doctor` or **FTC: Run Environment Check**    | Required checks pass; actionable messages for failures | Doctor JSON, bundle              |
| 4   | Connect Control Hub    | USB + authorize                                   | One authorized device                                  | `ftc devices`, env snapshot      |
| 5   | Build                  | `ftc build` or **FTC: Build Robot Code**          | BUILD SUCCESSFUL; APK produced                         | Build stdout/stderr (bounded)    |
| 6   | Deploy                 | `ftc deploy` or **FTC: Deploy to Robot**          | Install succeeds; RC app updated                       | Deploy steps, ADB install output |
| 7   | Driver Station handoff | Start configured OpMode on DS                     | OpMode appears in list; starts without crash           | DS screenshot (no PII), logcat   |
| 8   | Capture logs           | `ftc logs --teamcode` or **FTC: View Robot Logs** | TeamCode lines stream; Ctrl+C stops cleanly            | Last 50 log lines                |
| 9   | Modify code            | Change a TeleOp comment or telemetry line         | File saves                                             | Git diff (do not publish)        |
| 10  | Repeat cycle           | Build → deploy → logs                             | Updated behavior or log message visible                | Timings, bundle if fail          |

Record **time spent** on each major stage in the test report (§H metrics).

---

## Repeated-cycle tests (§G)

After the first successful deploy, run these scenarios in one session when possible:

| Scenario                    | Action                                             | Expected                                            |
| --------------------------- | -------------------------------------------------- | --------------------------------------------------- |
| G.1 Incremental rebuild     | Small code change → build → deploy                 | Second deploy succeeds without manual APK delete    |
| G.2 Robot reboot            | Reboot Control Hub, reconnect USB                  | Doctor device check passes; deploy works            |
| G.3 ADB server restart      | `adb kill-server && adb start-server`              | `ftc devices` recovers without IDE restart          |
| G.4 USB disconnect          | Unplug during idle, replug                         | Clear reconnect guidance; deploy works after replug |
| G.5 IDE restart             | Close and reopen VS Code/Cursor on same folder     | Project still detected; deploy works                |
| G.6 CLI + extension         | Build from CLI, deploy from extension (or reverse) | Same device selection; no silent multi-device pick  |
| G.7 Multi-device (optional) | Connect phone + Control Hub                        | Tool refuses until `--device` or picker selection   |

Document recovery actions taken for each failure.

---

## Failure evidence to collect

When any step fails:

```bash
ftc validation bundle collect --redact -o ftc-golden-path-bundle.json
ftc validation bundle collect --redact --markdown -o ftc-golden-path-bundle.md
ftc validation env --json > ftc-env.json
ftc doctor --json > ftc-doctor.json
```

Include in the test report:

- Step number and failure code (from friendly error or diagnostic codes in bundle)
- Whether the message told the user what to do next
- Whether a mentor had to intervene

Do **not** include Wi-Fi passwords, tokens, student names, or full device serial numbers in public reports.

---

## Recovery procedure

1. Read the friendly error title and suggested actions first.
2. Run `ftc doctor` — fix computer/project failures before device failures.
3. For device issues: re-authorize USB debugging, restart ADB, try a different USB port.
4. For install signature conflicts: follow documented manual uninstall guidance — never auto-uninstall.
5. For wrong folder: use doctor fix action to open the detected project root.
6. Re-run the failed step only after doctor passes relevant checks.
7. If still blocked, attach redacted bundle to a GitHub issue.

---

## Cleanup between runs

1. Stop log streaming (`ftc logs` Ctrl+C or **FTC: Stop Robot Logs**).
2. Disconnect USB if the next run tests cold connect.
3. Clear local bundle files containing paths (`ftc-golden-path-bundle.json`).
4. Do not uninstall RC app unless testing signature-conflict recovery.

---

## Pass / partial / fail criteria

| Result      | Criteria                                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Pass**    | Steps 1–8 complete without mentor intervention; step 10 repeat cycle succeeds at least once (G.1); all failures (if any) had actionable messages                   |
| **Partial** | Initial deploy succeeds but repeat-cycle or recovery scenario failed; OR mentor guided through a documented gap; OR version skew documented and workaround applied |
| **Fail**    | Cannot complete build + deploy + logs on Control Hub; OR silent multi-device selection; OR blocking failure with no actionable message                             |

---

## User-centered metrics (§H)

Record in each test report:

| Metric                         | How to measure                                                 |
| ------------------------------ | -------------------------------------------------------------- |
| Time to doctor pass            | Project open → first doctor `ready: true`                      |
| Time to first deploy           | Device connected → first successful deploy                     |
| Time to updated deploy         | Code save → deploy complete after change                       |
| Time to actionable explanation | Failure → first friendly error with suggested actions          |
| Manual terminal commands       | Count commands outside IDE/CLI golden-path flow                |
| Mentor interventions           | Count times a mentor ran undocumented steps                    |
| Knew next action               | Yes/No — did the tester know what to do without external docs? |

---

## Related commands

```bash
ftc validation status          # Mock vs hardware evidence summary
ftc validation status --json
ftc validation alpha-config    # Supported alpha target
ftc validation env             # Version and environment snapshot
ftc validation bundle collect --redact -o bundle.json
```

---

## Physical test status

No maintainer physical Control Hub runs are recorded in this repository yet. All golden-path workflow rows remain `Mock-tested` until dated hardware test reports land in [validation-matrix.md](validation-matrix.md).

When you complete a run, file the report using [hardware-test-report-template.md](hardware-test-report-template.md) and update the validation matrix in the same PR or follow-up issue.
