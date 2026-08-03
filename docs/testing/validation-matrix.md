# Golden-path validation matrix

Evidence levels for the core FTC Dev Tools workflow. Uses the same maturity terminology as [feature-maturity.md](../feature-maturity.md).

**Rule:** Do not mark a row `REV Control Hub tested` or higher unless a [dated hardware test report](hardware-test-report-template.md) supports it.

**Programmatic status:**

```bash
ftc validation status
ftc validation status --json
```

---

## Supported alpha configuration

See [supported-alpha-configuration.md](supported-alpha-configuration.md).

| Dimension  | Alpha target                                |
| ---------- | ------------------------------------------- |
| Host OS    | Windows 11                                  |
| IDE        | VS Code, Cursor                             |
| Robot      | REV Control Hub                             |
| Language   | Java                                        |
| Project    | Official-style FTC Android + Gradle Wrapper |
| FTC SDK    | 11.0.x – 11.1.x                             |
| Connection | USB first                                   |
| Logs       | Bounded / streaming TeamCode logcat         |

---

## Workflow evidence matrix

| Workflow step            | Mock / CI | Desktop integration           | Control Hub validated | Evidence date | Notes                                            |
| ------------------------ | --------- | ----------------------------- | --------------------- | ------------- | ------------------------------------------------ |
| Installation             | Yes       | Partial (maintainer machines) | **Pending**           | —             | `ftc validation env`, install-deps scripts       |
| Extension activation     | —         | Partial                       | **Pending**           | —             | Manual checklist in golden-path protocol         |
| Project detection        | Yes       | Yes                           | **Pending**           | —             | `project-detection.test.ts`                      |
| Doctor                   | Yes       | Yes                           | **Pending**           | —             | Wrong-folder discovery tested                    |
| Device discovery         | Yes       | Partial                       | **Pending**           | —             | ADB parsing fixtures; no Control Hub capture yet |
| Build                    | Yes       | Partial                       | **Pending**           | —             | `build-service.test.ts` with Gradle fixtures     |
| USB deployment           | Yes       | Partial                       | **Pending**           | —             | Install parsing fixtures; dry-run tests          |
| Driver Station handoff   | —         | —                             | **Pending**           | —             | Manual protocol step 7                           |
| OpMode execution handoff | —         | —                             | **Pending**           | —             | Manual protocol step 7                           |
| Log capture              | Yes       | Partial                       | **Pending**           | —             | `logcat.test.ts`, TeamCode fixture               |
| Repeat deployment        | Yes       | —                             | **Pending**           | —             | Protocol §G                                      |
| Failure recovery         | Yes       | Partial                       | **Pending**           | —             | Multi-device refusal, wrong-folder, bundle       |

**Legend:** Yes = automated tests in CI. Partial = exercised on maintainer desktop without Control Hub sign-off. **Pending** = no dated hardware report.

---

## Hardware checklist rows

These rows mirror `packages/shared/src/validation/golden-path/checklists.ts`. Update both when evidence lands.

| ID                                   | Label                                               | Status  | Evidence date |
| ------------------------------------ | --------------------------------------------------- | ------- | ------------- |
| `win11-usb-install-doctor`           | Windows 11 — clean install, doctor pass             | pending | —             |
| `win11-usb-control-hub-first-deploy` | Windows 11 USB — first Control Hub build and deploy | pending | —             |
| `win11-usb-control-hub-logs`         | Windows 11 USB — TeamCode logcat after deploy       | pending | —             |
| `win11-usb-repeat-cycle`             | Windows 11 USB — code change, rebuild, redeploy     | pending | —             |
| `win11-usb-reboot-reconnect`         | Windows 11 USB — Control Hub reboot and reconnect   | pending | —             |
| `win11-usb-adb-server-restart`       | Windows 11 USB — ADB server restart recovery        | pending | —             |
| `win11-usb-disconnect-reconnect`     | Windows 11 USB — cable disconnect and reconnect     | pending | —             |
| `win11-ide-restart`                  | Windows 11 — IDE restart with same project          | pending | —             |
| `win11-cli-extension-same-project`   | Windows 11 — CLI and extension same session         | pending | —             |
| `any-multi-device-selection`         | Multiple devices — explicit selection required      | pending | —             |
| `any-driver-station-opmode`          | Driver Station OpMode start after deploy            | pending | —             |
| `any-diagnostic-bundle-failure`      | Failed run produces redacted diagnostic bundle      | pending | —             |

---

## Automated coverage (CI)

| Area                   | Covered in CI |
| ---------------------- | ------------- |
| Project detection      | Yes           |
| Doctor checks          | Yes           |
| Device selection rules | Yes           |
| ADB output parsing     | Yes           |
| Gradle build service   | Yes           |
| Deploy dry-run         | Yes           |
| Logcat parsing         | Yes           |
| Error interpretation   | Yes           |
| Diagnostic bundle      | Yes           |
| Environment snapshot   | Yes           |
| Multi-device refusal   | Yes           |
| Wrong-folder discovery | Yes           |

---

## Physical tests performed

| Date | Tester role | Result | Report link                                                   |
| ---- | ----------- | ------ | ------------------------------------------------------------- |
| —    | —           | —      | No physical Control Hub golden-path runs recorded in-repo yet |

Maintainers: add a row when a hardware test report is filed.

---

## Related documentation

- [Golden-path test protocol](golden-path.md)
- [Hardware test report template](hardware-test-report-template.md)
- [External alpha release gate](external-alpha-gate.md)
- [Physical device testing](../physical-device-testing.md)
