# Supported alpha configuration

Initial supported configuration for external alpha invitations. Other environments may work; they are not primary evidence targets for this milestone.

---

## Target configuration

| Dimension          | Supported alpha value                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------- |
| **Host OS**        | Windows 11                                                                                   |
| **IDE**            | VS Code and Cursor                                                                           |
| **Robot platform** | REV Control Hub                                                                              |
| **Robot language** | Java                                                                                         |
| **Project type**   | Official-style FTC Android project (Gradle Wrapper, `TeamCode` module, `FtcRobotController`) |
| **FTC SDK**        | **11.0.x – 11.1.x** Maven coordinates in `build.dependencies.gradle`                         |
| **Connection**     | USB ADB first                                                                                |
| **Build system**   | Checked-in Gradle Wrapper (`gradlew` / `gradlew.bat`)                                        |
| **Deployment**     | ADB install via `ftc deploy`                                                                 |
| **Logs**           | Bounded or streaming TeamCode logcat via `ftc logs`                                          |

---

## FTC SDK version guidance

Document the exact Maven version from the team project under test, for example:

```gradle
implementation 'org.firstinspires.ftc:RobotCore:11.1.0'
```

FTC Dev Tools reads this via `ftc sdk check` and `ftc validation env`. SDK versions outside 11.0.x – 11.1.x may work but are not alpha-gated until validated.

---

## Explicitly out of scope for alpha gate

These are not required for the golden-path alpha milestone:

- macOS / Linux as primary host
- Phone-only Robot Controller as primary target
- Wi-Fi ADB as primary connection (documented, not gated)
- Vision Lab hardware validation
- Kotlin-only or non-official project layouts
- Systemcore, FRC, C++, Python, plugin marketplace, Tuning Lab, simulation expansion, Match Analysis, Autonomous Studio

Experimental features (hub `--attempt-upload`, Vision Lab live capture, etc.) are separated from the supported golden path — see [feature-maturity.md](../feature-maturity.md).

---

## Verify your machine

```bash
ftc validation alpha-config
ftc validation alpha-config --json
ftc validation env
ftc doctor
```

Version skew between extension and CLI is reported in `ftc validation env` under `versionSkewWarnings`.

---

## Related

- [Golden-path test protocol](golden-path.md)
- [External alpha release gate](external-alpha-gate.md)
- [Validation matrix](validation-matrix.md)
