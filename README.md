# FTC Dev Tools

Community tools that make building, deploying, diagnosing, and managing FIRST Tech Challenge Android robot projects simpler from VS Code, Cursor, or a terminal.

## Built by The Allsparks

FTC Dev Tools is created and maintained by **The Allsparks**, a FIRST Tech Challenge team based in Las Vegas, Nevada.

We originally built these tools to improve our own team’s development workflow, make it easier for our students to work outside Android Studio, and reduce the setup and deployment difficulties commonly encountered by FTC teams.

We publish the project for the broader FTC community because useful team-built tools should be shared, improved collaboratively, and made available to students, coaches, mentors, and software contributors everywhere.

The Allsparks remain the project’s founding maintainers, but FTC Dev Tools is intended to be a community project. Contributions, testing, documentation improvements, feature requests, and feedback from other FTC teams are welcome.

> **Disclaimer:** This project is community-developed and unofficial. It is **not** affiliated with or endorsed by FIRST, REV Robotics, Microsoft, Anysphere, or other referenced vendors or community projects.
>
> FIRST®, FIRST Tech Challenge®, FTC®, REV Robotics®, Visual Studio Code®, and Cursor® may be trademarks of their respective owners. Their names are used only to describe compatibility and intended use.

## Current status

**Version 0.1.0 (+ SDK update preview toward 0.2.0)**

Usable locally for environment checks, device listing, Gradle Wrapper builds/cleans, ADB deploy orchestration, Logcat viewing, student-friendly errors, a thin VS Code/Cursor extension UI, **FTC SDK check / update**, **Wi-Fi adb + dual-NIC stay-online** helpers, **explicit Control Hub OS update** helpers, and **Pedro Pathing** add/scaffold.

Physical REV Control Hub compatibility has **not** been claimed as validated in this repository yet. CI uses mocked devices. See [docs/physical-device-testing.md](docs/physical-device-testing.md).

## Supported features (0.1.0)

- `ftc doctor` environment checklist (`--json` available), including optional FTC SDK freshness warn
- `ftc devices` listing with probable Control Hub labeling (never guaranteed)
- `ftc build` / `ftc clean` via the project's Gradle Wrapper
- `ftc deploy` with explicit multi-device refusal, `--device`, and `--dry-run`
- `ftc logs` with `--errors`, `--teamcode`, `--raw`
- `ftc sdk check` / `ftc sdk update` — detect Maven SDK drift and sync SDK-owned files (never `TeamCode/`); see [docs/sdk-update.md](docs/sdk-update.md)
- `ftc wifi` — wireless adb, dual-NIC routing, join SSID, hub manage get/set, RC Console; see [docs/wifi.md](docs/wifi.md)
- `ftc hub` — Control Hub status + explicit OS check/download/guided apply; see [docs/hub-update.md](docs/hub-update.md)
- `ftc pedro` — detect / add deps / scaffold Pedro Pathing; see [docs/pedro-pathing.md](docs/pedro-pathing.md)
- `ftc opmode` — list / create TeleOp & Autonomous stubs; see [docs/opmodes.md](docs/opmodes.md)
- `ftc config` — list / show / validate / pull robot config XML; see [docs/robot-config.md](docs/robot-config.md)
- `ftc hwmap` — show hardware map / generate OpMode stubs from config; see [docs/hwmap.md](docs/hwmap.md)
- `ftc-mcp` — stdio MCP server for Cursor agents; see [docs/mcp.md](docs/mcp.md)
- Optional `.ftc-dev.json` configuration + JSON Schema
- VS Code/Cursor extension commands, FTC view, status bar, and output channel
- Cancellable robot log streaming in the extension (`FTC: Stop Robot Logs`)
- Unit/integration-style tests with `MockDeviceProvider`
- GitHub Actions CI on Windows, macOS, and Linux

## Roadmap (not all shipped)

0.1.0 is the scaffold. Later releases aim for **Android Studio workflow parity** for FTC robot projects — and extras Android Studio does not prioritize — without replacing the official SDK.

### Shipped preview

| Capability                           | Notes                                                                                        |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| **FTC SDK auto-update**              | `ftc sdk check` / `ftc sdk update` with dry-run, confirmation, dirty-tree guard, and backups |
| **Wi-Fi configuration (Phase 1–3)**  | Wireless adb, dual-NIC routing, OS join, hub manage, stay-online metrics/adapters            |
| **Control Hub OS helpers (Phase 4)** | Explicit status / check / download / guided apply (never automatic flash)                    |
| **Pedro Pathing (Phase 5)**          | `ftc pedro status` / `add` / `scaffold` for official FTC projects                            |
| **OpModes (Phase 6a)**               | `ftc opmode list` / `create` TeleOp & Autonomous templates                                   |
| **Robot config (Phase 6b)**          | `ftc config list` / `show` / `validate` / `pull` for TeamCode `res/xml`                      |
| **Hardware map (Phase 6c)**          | `ftc hwmap show` / `codegen` — config XML → `hardwareMap.get` OpMode                         |
| **MCP server (Phase 7)**             | Thin stdio MCP (`ftc-mcp`) over shared for Cursor agents                                     |

### Planned (strong interest)

| Capability              | Notes                                                        |
| ----------------------- | ------------------------------------------------------------ |
| **Telemetry dashboard** | Live / recorded telemetry view in the editor (beyond Logcat) |

### Maybe later

- **Road Runner** integration (optional; Pedro Pathing is the committed pathing focus)
- AI-assisted fixes (only if rule-based errors stay the default)
- Remote deployment beyond the local network

### Still out of scope unless redesigned

- Control Hub **firmware** flashing / factory reset as an automatic background action
- Silent multi-device selection, auto-uninstall, or arbitrary commands from `.ftc-dev.json`

Priorities may shift with community feedback.

## Safety guarantees

- Uses the project's checked-in **Gradle Wrapper** and system **adb**
- Does **not** reimplement Gradle or ADB
- Does **not** automatically flash Control Hub firmware/OS; Phase 4 helpers are **explicit and confirmed** only (see [docs/hub-update.md](docs/hub-update.md))
- Does **not** silently change hub AP credentials
- Explicit **wireless adb**, **robot-subnet routing**, and **interface metric / adapter** changes are allowed when you confirm (`--yes` / modal)
- Does **not** uninstall apps unless the user does so explicitly themselves
- Never silently chooses among multiple connected Android devices
- Never executes arbitrary commands from `.ftc-dev.json`
- Prefer direct process execution over shells; sanitize arguments
- SDK update is **explicit and user-initiated**; never touches `TeamCode/`
- Future Wi-Fi / hub tooling must remain **explicit and user-initiated**, never silent

## Repository layout

```text
packages/
  shared/             Shared TypeScript services
  cli/                `ftc` command-line tool
  mcp/                `ftc-mcp` stdio MCP server for agents
  vscode-extension/   VS Code / Cursor extension
docs/                 Student, coach, and mentor docs
examples/             Sample FTC-like layout (not a full SDK)
```

## Names and identifiers

| Kind                | Value                         |
| ------------------- | ----------------------------- |
| Public project name | **FTC Dev Tools**             |
| Provenance          | Built by The Allsparks        |
| GitHub organization | `The-Allsparks`               |
| Repository          | `The-Allsparks/ftc-dev-tools` |
| npm scope           | `@ftc-dev-tools`              |
| CLI executable      | `ftc`                         |

## Installation

### Prerequisites

- Node.js 20+
- Java JDK suitable for your FTC season (often 17)
- Android SDK platform-tools (`adb`)
- An official FTC Android Studio project (with Gradle Wrapper)

Android Studio itself is **optional**. Install JDK + `adb`/SDK tools without it:

| OS          | Command                                                              |
| ----------- | -------------------------------------------------------------------- |
| **Windows** | `scripts\install-deps-windows.cmd` or `npm run install-deps:windows` |
| macOS       | `bash scripts/install-deps-macos.sh` or `npm run install-deps:macos` |
| Linux       | `bash scripts/install-deps-linux.sh` or `npm run install-deps:linux` |

Details: [docs/install-without-android-studio.md](docs/install-without-android-studio.md) and [scripts/README.md](scripts/README.md).

### From source

```bash
git clone https://github.com/The-Allsparks/ftc-dev-tools.git
cd ftc-dev-tools
npm install
npm run build
```

Link the CLI locally:

```bash
npm link --workspace @ftc-dev-tools/cli
ftc --help
```

### Extension (VSIX)

```bash
npm run package:extension
```

Install the generated `.vsix` in VS Code/Cursor via **Extensions: Install from VSIX…**

Marketplace publishing is intentionally not automated yet.

## Quick start

1. Open your FTC project folder (the one with `settings.gradle` / `gradlew`).
2. Run:

```bash
ftc doctor
ftc devices
ftc build
ftc deploy
ftc logs --teamcode
ftc sdk check
ftc wifi status
```

3. Or use the Command Palette in VS Code/Cursor: `FTC: Run Environment Check`.

## CLI examples

```bash
ftc doctor --json
ftc devices
ftc build --verbose
ftc deploy --device SERIAL123
ftc deploy --dry-run
ftc logs --errors
ftc logs --raw
ftc clean
ftc sdk check
ftc sdk update --dry-run
ftc sdk update --yes
ftc wifi interfaces
ftc wifi use-interface "Wi-Fi 2"
ftc wifi route ensure --yes
ftc wifi connect --yes
ftc wifi join --ssid FTC-XXXX --password-env FTC_WIFI_PASSWORD --yes
ftc wifi manage get
```

## Extension screenshots

Placeholder screenshots (to be replaced with real captures):

- `docs/images/extension-view.placeholder.png` — FTC Robot view
- `docs/images/status-bar.placeholder.png` — status bar states
- `docs/images/command-palette.placeholder.png` — command palette entries

## Troubleshooting

See [docs/troubleshooting.md](docs/troubleshooting.md) and run `ftc doctor`.

## Supported operating systems

- Windows (primary initially tested platform for local development of this repo)
- macOS
- Linux

Automated tests run on all three in CI.

## Supported FTC project expectations

Official-style Android Studio projects with:

- `settings.gradle` (or `.kts`)
- `FtcRobotController` and/or `build.common.gradle`
- `TeamCode` module (typical)
- Checked-in Gradle Wrapper (`gradlew` / `gradlew.bat`)

## Documentation

### Project identity and stewardship

- [Project governance](GOVERNANCE.md)
- [Authors and contributors](AUTHORS.md)
- [Supporting The Allsparks](SUPPORT.md)
- [Project principles](docs/project-principles.md)
- [How The Allsparks use FTC Dev Tools](docs/team-use.md)
- [NOTICE](NOTICE) (attribution and independence statement)

### Guides

- [Getting started](docs/getting-started.md)
- [Install without Android Studio](docs/install-without-android-studio.md)
- [Windows setup](docs/windows-setup.md)
- [macOS setup](docs/macos-setup.md)
- [Linux setup](docs/linux-setup.md)
- [Device connections](docs/device-connections.md)
- [FTC SDK update](docs/sdk-update.md)
- [Wi-Fi and dual-NIC](docs/wifi.md)
- [Control Hub OS update](docs/hub-update.md)
- [Pedro Pathing](docs/pedro-pathing.md)
- [OpModes](docs/opmodes.md)
- [Robot configuration](docs/robot-config.md)
- [Hardware map](docs/hwmap.md)
- [MCP server](docs/mcp.md)
- [Wi-Fi manage API notes](docs/wifi-manage-api.md)
- [Configuration](docs/configuration.md)
- [Architecture](docs/architecture.md)
- [Releasing](docs/releasing.md)
- [Physical device testing](docs/physical-device-testing.md)

## Project stewardship

FTC Dev Tools is an Allsparks-led open-source project.

The Allsparks maintain the project direction, releases, safety standards, and compatibility goals. Community contributors do not need to be members of The Allsparks.

See [GOVERNANCE.md](GOVERNANCE.md) for details.

## Support The Allsparks

FTC Dev Tools is free and open source. The Allsparks maintain it for our team and the wider FTC community.

Optional donations help continue project development and support robotics education. They are processed through our nonprofit fiscal sponsor; The Allsparks itself is not an independent 501(c)(3).

Donations do **not** purchase features, roadmap influence, support contracts, governance authority, or endorsements.

**[Support The Allsparks](https://hcb.hackclub.com/donations/start/the-allsparks)**

Details: [SUPPORT.md](SUPPORT.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

Please use **GitHub Discussions** (when enabled on the repository) for Q&A and design conversation, and Issues for actionable bugs/features.

## Licensing

Apache License 2.0 — see [LICENSE](LICENSE). Attribution and independence statements: [NOTICE](NOTICE). Authors: [AUTHORS.md](AUTHORS.md).

## Development commands

```bash
npm install
npm run build
npm test
npm run lint
npm run format:check
npm run typecheck
npm run package:cli
npm run package:extension
npm run check:identity
```
