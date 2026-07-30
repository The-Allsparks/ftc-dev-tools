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

| Feature                                | Maturity      | Notes                                                                           |
| -------------------------------------- | ------------- | ------------------------------------------------------------------------------- |
| Project detection / doctor             | `Mock-tested` | Desktop use common; Control Hub not required                                    |
| Build / clean (Gradle Wrapper)         | `Mock-tested` | Desktop integration common on maintainer machines                               |
| Deploy (USB)                           | `Mock-tested` | Needs published physical matrix for Stable                                      |
| Deploy (Wi-Fi ADB)                     | `Mock-tested` | Needs phone + Control Hub rows                                                  |
| Logcat stream                          | `Mock-tested` | Basic filters only                                                              |
| SDK check/update                       | `Mock-tested` | Never touches TeamCode; rollback hardening tracked separately                   |
| Wi-Fi helpers                          | `Mock-tested` | Explicit confirmation required                                                  |
| Hub OS check/download/guided apply     | `Mock-tested` | `--attempt-upload` **experimental**; not Stable                                 |
| Pedro Pathing                          | `Mock-tested` |                                                                                 |
| OpMode create                          | `Mock-tested` |                                                                                 |
| Robot config list/show/validate/pull   | `Mock-tested` | No push/activate                                                                |
| Hardware map codegen                   | `Mock-tested` |                                                                                 |
| MCP server                             | `Mock-tested` | Subset of CLI                                                                   |
| Java snippets / setup wizards          | `Mock-tested` |                                                                                 |
| Java debugger attach                   | Not shipped   | See [debugger-spike.md](debugger-spike.md)                                      |
| Telemetry dashboard                    | Not shipped   | See [telemetry-spike.md](telemetry-spike.md)                                    |
| Vision Lab — workspace discovery       | `Mock-tested` | See [vision-hardware-validation.md](architecture/vision-hardware-validation.md) |
| Vision Lab — endpoint discovery        | `Mock-tested` | Never auto-selects among hosts/cameras                                          |
| Vision Lab — Limelight HTTP            | `Mock-tested` | Physical Limelight 3A checklist pending                                         |
| Vision Lab — pipeline-as-code          | `Mock-tested` | Upload/activate deferred                                                        |
| Vision Lab — FTC Dashboard             | `Mock-tested` | Stream validation on hardware pending                                           |
| Vision Lab — diagnostic bridge         | `Mock-tested` | Robot-side transport pending                                                    |
| Vision Lab — VisionPortal / EasyOpenCV | `Mock-tested` | UVC webcam on Control Hub pending                                               |
| Vision Lab — diagnostics               | `Mock-tested` |                                                                                 |
| Vision Lab — inspector / codegen       | `Mock-tested` | Generated Java not compiled on robot in CI                                      |
| Vision Lab — session replay schema     | `Mock-tested` | Live capture deferred                                                           |
| Vision Lab — agent MCP tools           | `Mock-tested` | 59 MCP tools including `vision_validation_status`                               |

Update this table when physical test reports land. Do not include personal data in public reports.

Vision Lab detail: [vision-lab.md](vision-lab.md) and [vision-hardware-testing.md](vision-hardware-testing.md).

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
