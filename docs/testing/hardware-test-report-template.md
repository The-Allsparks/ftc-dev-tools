# Hardware test report template

Privacy-safe format for golden-path and Control Hub validation runs. Copy this template into an issue, PR comment, or local file. Do **not** include personal names, student names, Wi-Fi passwords, tokens, private repository content, or full device serial numbers.

---

## Report

```yaml
# Golden-path hardware test report (no PII)
reportVersion: "1.0"

# Product versions
ftcDevToolsVersion: ""       # ftc --version
extensionVersion: ""         # VS Code/Cursor Extensions panel
cliVersion: ""               # ftc --version (should match extension)

# Host environment
hostOs: ""                   # e.g. Windows 11 Pro 26200
javaVersion: ""              # from ftc validation env
adbVersion: ""               # from ftc validation env
androidSdkPresent: true      # yes/no

# Robot and project
ftcSdkVersion: ""            # from build.dependencies.gradle
controlHubOsVersion: ""      # from REV Hardware Client or ftc hub status (optional)
robotControllerVersion: ""   # RC app version if known
connectionType: "usb"        # usb | wifi-adb
projectShape: ""             # e.g. official-ftc, TeamCode module, Gradle Wrapper present

# Test metadata
testDate: "YYYY-MM-DD"
testerRole: ""               # maintainer | student | mentor | external-team (no personal name)
testProtocolVersion: "golden-path.md @ commit or tag"

# Workflow step results
steps:
  installation:
    result: pass             # pass | partial | fail | skipped
    minutes: 0
    notes: ""
  extensionActivation:
    result: pass
    minutes: 0
    notes: ""
  projectDetection:
    result: pass
    minutes: 0
    notes: ""
  doctor:
    result: pass
    minutes: 0
    notes: ""
  deviceDiscovery:
    result: pass
    minutes: 0
    notes: ""
  build:
    result: pass
    minutes: 0
    notes: ""
  usbDeploy:
    result: pass
    minutes: 0
    notes: ""
  driverStationHandoff:
    result: pass
    minutes: 0
    notes: ""
  opmodeExecution:
    result: pass
    minutes: 0
    notes: ""
  logCapture:
    result: pass
    minutes: 0
    notes: ""
  repeatDeploy:
    result: pass
    minutes: 0
    notes: ""
  failureRecovery:
    result: pass
    minutes: 0
    notes: ""

# Repeated-cycle scenarios (see golden-path.md §G)
repeatCycle:
  incrementalRebuild: pass
  robotRebootReconnect: pass
  adbServerRestart: pass
  usbDisconnectReconnect: pass
  ideRestart: pass
  cliAndExtensionSameProject: pass
  multiDeviceExplicitSelection: skipped   # optional scenario

# User-centered metrics
metrics:
  minutesToDoctorPass: 0
  minutesToFirstDeploy: 0
  minutesToUpdatedDeploy: 0
  minutesToActionableExplanation: 0       # 0 if no failures
  manualTerminalCommands: 0
  mentorInterventions: 0
  knewNextActionWithoutExternalDocs: true

# Failures (repeat block per failure)
failures: []
  # - step: build
  #   code: GRADLE_COMPILE_ERROR
  #   recoveryActions: "Fixed typo in TeleOpDrive.java"
  #   mentorRequired: false

# Summary
finalResult: pass            # pass | partial | fail
knownLimitations: ""
diagnosticBundleAttached: false   # redacted bundle shared with maintainers only
```

---

## Plain-text summary (for PR comments)

```text
Golden-path test — YYYY-MM-DD
Host: Windows 11 | Connection: USB | SDK: 11.x
Result: pass | partial | fail
Steps failed: (none | list)
Mentor intervention: yes/no
Repeat cycle: pass | partial | fail
Notes:
```

---

## Collecting evidence locally

```bash
ftc validation env --json > env.json
ftc doctor --json > doctor.json
ftc validation bundle collect --redact -o bundle.json
```

Review files before sharing. Redact serial numbers and paths if `--redact` was not used.

---

## Updating the validation matrix

After a **pass** on a checklist row, a maintainer updates:

1. [validation-matrix.md](validation-matrix.md) — evidence date and maturity level
2. `packages/shared/src/validation/golden-path/checklists.ts` — row status and `evidenceDate`
3. [feature-maturity.md](../feature-maturity.md) — per-feature maturity when criteria met

Do not mark hardware-validated without a dated test report.
