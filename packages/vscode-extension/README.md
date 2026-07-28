# FTC Dev Tools (VS Code / Cursor extension)

Build, deploy, and diagnose **FIRST Tech Challenge** Android robot projects from VS Code or Cursor—without living in Android Studio.

Created by **[The Allsparks](https://www.theallsparks.org)** for our team and the wider FTC community. This extension is **community-developed and unofficial** (not affiliated with FIRST or REV).

**Version:** 0.1.0

## What you get

- Command Palette actions: environment check, build, deploy, logs, SDK check, Wi‑Fi/hub helpers, OpModes, robot config, and more
- **FTC Robot** sidebar and status bar for common workflows
- Guided setup commands: **FTC: Set Up This Computer**, **FTC: Set Up This FTC Project**, **FTC: Configure Recommended Extensions**, **FTC: Install FTC CLI**
- Java snippets for TeleOp and Autonomous stubs

Most features call the shared **`ftc` CLI** under the hood. Install the CLI separately if commands fail with “command not found” — use **FTC: Install FTC CLI** or [cli-install.md](https://github.com/The-Allsparks/ftc-dev-tools/blob/main/docs/cli-install.md).

## Before you start

1. Open your **FTC project folder** (the directory that contains `settings.gradle` or `settings.gradle.kts` and `gradlew`).
2. Install prerequisites on your computer:
   - **Java JDK** (often JDK 17 for current FTC seasons)
   - **Android SDK platform-tools** (`adb` on your PATH)
   - **Node.js 20+** (needed for the `ftc` CLI if you use terminal/MCP features)

Install guides (no Android Studio required):

| OS            | Documentation                                                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Windows       | [Install without Android Studio](https://github.com/The-Allsparks/ftc-dev-tools/blob/main/docs/install-without-android-studio.md) |
| macOS / Linux | Same doc + repo `scripts/install-deps-*.sh`                                                                                       |

3. Run **FTC: Run Environment Check** (or `ftc doctor` in a terminal) and fix anything marked failed.

## Quick start (extension)

1. **Extensions: Install from VSIX…** — you already did this if you are reading this page.
2. Open your team’s FTC codebase folder in VS Code or Cursor.
3. Command Palette → **FTC: Run Environment Check**.
4. Command Palette → **FTC: Show Devices** (robot connected via USB; enable USB debugging on the Control Hub / phone).
5. Command Palette → **FTC: Build and Deploy** (or build, then deploy separately).
6. Command Palette → **FTC: View Robot Logs** (try **FTC: View Error Logs** if something fails).

## Command Palette cheat sheet

| Command                                      | Purpose                                                         |
| -------------------------------------------- | --------------------------------------------------------------- |
| FTC: Run Environment Check                   | JDK, adb, Gradle wrapper, project layout                        |
| FTC: Set Up This Computer / This FTC Project | Guided JDK, SDK, tasks, snippets (preview before writing files) |
| FTC: Build Robot Code                        | Gradle assemble via project wrapper                             |
| FTC: Deploy to Robot                         | Install APK to selected device                                  |
| FTC: View Robot Logs / Error Logs            | TeamCode-focused logcat in the output panel                     |
| FTC: Check SDK Version                       | Compare project SDK to Maven                                    |
| FTC: Select Deployment Device                | Required when multiple devices are connected                    |

Full CLI reference: [README on GitHub](https://github.com/The-Allsparks/ftc-dev-tools/blob/main/README.md).

## Documentation (GitHub)

- [Safety guarantees](https://github.com/The-Allsparks/ftc-dev-tools/blob/main/README.md#safety-guarantees)
- [SDK update](https://github.com/The-Allsparks/ftc-dev-tools/blob/main/docs/sdk-update.md)
- [Wi‑Fi ADB](https://github.com/The-Allsparks/ftc-dev-tools/blob/main/docs/wifi.md)
- [Control Hub OS helpers](https://github.com/The-Allsparks/ftc-dev-tools/blob/main/docs/hub-update.md)
- [OpModes](https://github.com/The-Allsparks/ftc-dev-tools/blob/main/docs/opmodes.md)
- [Robot configuration](https://github.com/The-Allsparks/ftc-dev-tools/blob/main/docs/robot-config.md)
- [Feature maturity (what is mock-tested vs hardware-validated)](https://github.com/The-Allsparks/ftc-dev-tools/blob/main/docs/feature-maturity.md)

## Physical hardware

REV Control Hub compatibility is **not** claimed as fully validated in this release. CI uses mocked devices. See [physical device testing](https://github.com/The-Allsparks/ftc-dev-tools/blob/main/docs/physical-device-testing.md).

## Help and feedback

- [Report a bug or request a feature](https://github.com/The-Allsparks/ftc-dev-tools/issues)
- [Contributing](https://github.com/The-Allsparks/ftc-dev-tools/blob/main/CONTRIBUTING.md)

## License

Apache-2.0 — see [LICENSE](https://github.com/The-Allsparks/ftc-dev-tools/blob/main/LICENSE) in the repository.
