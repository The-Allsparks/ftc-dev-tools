# Feature maturity

Unit tests alone do **not** make a feature Stable. Use these levels in docs, issues, and release notes.

## Levels

| Level                        | Meaning                                                                                             |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `Mock-tested`                | Covered by unit/integration tests with mocked Gradle/ADB/devices                                    |
| `Desktop integration tested` | Exercised on a maintainer desktop against a real JDK/SDK/adb install (may use phone or emulator)    |
| `Android phone tested`       | Validated against a phone Robot Controller (or similar Android device)                              |
| `REV Control Hub tested`     | Validated on a physical REV Control Hub                                                             |
| `Multi-team field tested`    | Used successfully by more than one team outside The Allsparks in real practice/competition contexts |
| `Stable`                     | Meets release bar for that surface: docs, safety, and appropriate hardware validation complete      |

Hardware-affecting features must not be labeled `Stable` solely because CI is green.

## Per-feature status (0.1.0)

| Feature                              | Maturity      | Notes                                                         |
| ------------------------------------ | ------------- | ------------------------------------------------------------- |
| Project detection / doctor           | `Mock-tested` | Desktop use common; Control Hub not required                  |
| Build / clean (Gradle Wrapper)       | `Mock-tested` | Desktop integration common on maintainer machines             |
| Deploy (USB)                         | `Mock-tested` | Needs published physical matrix for Stable                    |
| Deploy (Wi-Fi ADB)                   | `Mock-tested` | Needs phone + Control Hub rows                                |
| Logcat stream                        | `Mock-tested` | Basic filters only                                            |
| SDK check/update                     | `Mock-tested` | Never touches TeamCode; rollback hardening tracked separately |
| Wi-Fi helpers                        | `Mock-tested` | Explicit confirmation required                                |
| Hub OS check/download/guided apply   | `Mock-tested` | `--attempt-upload` **experimental**; not Stable               |
| Pedro Pathing                        | `Mock-tested` |                                                               |
| OpMode create                        | `Mock-tested` |                                                               |
| Robot config list/show/validate/pull | `Mock-tested` | No push/activate                                              |
| Hardware map codegen                 | `Mock-tested` |                                                               |
| MCP server                           | `Mock-tested` | Subset of CLI                                                 |
| Java snippets / setup wizards        | `Mock-tested` |                                                               |
| Java debugger attach                 | Not shipped   | See [debugger-spike.md](debugger-spike.md)                    |
| Telemetry dashboard                  | Not shipped   | See [telemetry-spike.md](telemetry-spike.md)                  |

Update this table when physical test reports land. Do not include personal data in public reports.

## Hardware test report template (no PII)

```text
Feature:
Host OS:
Connection (USB / Wi-Fi ADB):
Device type (Control Hub / phone RC / other):
FTC SDK version:
Hub OS version (if applicable):
Result (pass / fail / partial):
Known limitations:
Tester role (e.g. maintainer / external team — no personal name required):
Test date (YYYY-MM-DD):
```
