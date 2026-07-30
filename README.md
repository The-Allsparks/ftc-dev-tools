# FTC Dev Tools

Community tools that make building, deploying, diagnosing, and managing FIRST Tech Challenge Android robot projects simpler from VS Code, Cursor, or a terminal.

**Documentation:** [the-allsparks.github.io/ftc-dev-tools](https://the-allsparks.github.io/ftc-dev-tools/) (also in [`docs/`](docs/))

## Built by The Allsparks

FTC Dev Tools is created and maintained by **The Allsparks**, a FIRST Tech Challenge team based in Las Vegas, Nevada.

We originally built these tools to improve our own team’s development workflow, make it easier for our students to work outside Android Studio, and reduce the setup and deployment difficulties commonly encountered by FTC teams.

We publish the project for the broader FTC community because useful team-built tools should be shared, improved collaboratively, and made available to students, coaches, mentors, and software contributors everywhere.

The Allsparks remain the project’s founding maintainers, but FTC Dev Tools is intended to be a community project. Contributions, testing, documentation improvements, feature requests, and feedback from other FTC teams are welcome.

> **Disclaimer:** This project is community-developed and unofficial. It is **not** affiliated with or endorsed by FIRST, REV Robotics, Limelight Vision, Microsoft, Anysphere, or other referenced vendors or community projects.
>
> FIRST®, FIRST Tech Challenge®, FTC®, REV Robotics®, Limelight Vision®, Visual Studio Code®, and Cursor® may be trademarks of their respective owners. Their names are used only to describe compatibility and intended use.

## Current status

**Version 0.1.0**

Integrated tooling for environment checks, device listing, Gradle Wrapper builds/cleans, ADB deploy orchestration, Logcat viewing, student-friendly errors, VS Code/Cursor UI, FTC SDK check/update, Wi-Fi ADB + dual-NIC helpers, Control Hub OS helpers, Pedro Pathing, OpMode/config/hardware-map helpers, and the `ftc-mcp` agent server.

Physical REV Control Hub compatibility has **not** been claimed as validated in this repository yet. CI uses mocked devices. See [docs/physical-device-testing.md](docs/physical-device-testing.md) and [docs/feature-maturity.md](docs/feature-maturity.md).

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
- **Vision Lab** — `ftc vision …` CLI, Limelight, VisionPortal, EasyOpenCV, FTC Dashboard, diagnostics, validation, Java codegen; see [docs/vision-lab.md](docs/vision-lab.md)
- `ftc replay status|validate|create-header` — session schema validation (live capture deferred); see [docs/vision-sessions.md](docs/vision-sessions.md)
- `ftc integrations list`, `ftc modules list`, `ftc providers list` — built-in registry introspection
- `ftc github link|status|unlink` — optional GitHub error reports on build/deploy/doctor failures
- `ftc-mcp` — stdio MCP server for Cursor agents (59 tools); see [docs/mcp.md](docs/mcp.md)
- Optional `.ftc-dev.json` configuration + JSON Schema
- VS Code/Cursor extension: state-aware **FTC Robot** sidebar, **Vision** sidebar/panel, status bar, output channel, and Java snippets
- Student onboarding: **FTC: Start Here**, Welcome walkthrough, **FTC: Connect My Robot (USB First)**, **FTC: First OpMode Journey**, competition readiness milestones
- Guided setup commands: **FTC: Get or Open FTC Project**, **FTC: Set Up This Computer**, **FTC: Set Up This FTC Project**, **FTC: Configure Recommended Extensions**, **FTC: Install FTC CLI**
- Cancellable robot log streaming in the extension (`FTC: Stop Robot Logs`)
- Unit/integration-style tests with `MockDeviceProvider`
- GitHub Actions CI on Windows, macOS, and Linux; Dependabot version updates; CodeQL analysis; pull request dependency review; [documentation site](https://the-allsparks.github.io/ftc-dev-tools/) on GitHub Pages

Maturity for each area (mock-tested through hardware-validated) is tracked in [docs/feature-maturity.md](docs/feature-maturity.md). Parity analysis vs Android Studio and FTC for VS Code: [docs/parity-audit.md](docs/parity-audit.md).

## Roadmap

Integrated features above are first-class product surfaces. Remaining work aims at **practical FTC workflow parity** (editing via recommended language tooling, build/deploy, logs/diagnostics, tests, samples/docs, robot config workflow, device management, reliable onboarding)—not full Android Studio clone parity. Interactive breakpoint debugging is a separate advanced capability and may remain experimental.

### Planned (strong interest)

| Capability                                     | Notes                                                                                                                        |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Vision Lab hardware validation**             | Foundation shipped (mock-tested); physical Limelight/Control Hub checklists pending                                          |
| **Tuning Lab**                                 | Epic planned ([#146](https://github.com/The-Allsparks/ftc-dev-tools/issues/146)); not shipped yet                            |
| **Telemetry / FTC Dashboard interoperability** | Vision Lab ships status/open helpers; full telemetry recording deferred — [docs/telemetry-spike.md](docs/telemetry-spike.md) |
| **Java debugger attach (investigation)**       | JDWP spike only until Control Hub validated; see [docs/debugger-spike.md](docs/debugger-spike.md)                            |
| **Richer Logcat / diagnostic bundles**         | Process filters, clickable stack traces, redacted share bundles                                                              |
| **TeamCode unit-test starter workflow**        | Document + Gradle/test commands; do not reinvent Test Explorer                                                               |

### Maybe later

- **Road Runner** integration (optional; Pedro Pathing is the committed pathing focus)
- AI-assisted fixes (only if rule-based errors stay the default)
- Remote deployment beyond the local network
- SDK sample browser / import workflow

### Still out of scope unless redesigned

- Control Hub **firmware** flashing / factory reset as an automatic background action
- Silent multi-device selection, auto-uninstall, or arbitrary commands from `.ftc-dev.json`
- Generic Java language server, Android XML visual layout editor, full profiler/emulator tooling (delegate to established VS Code extensions)

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
  maintainer-mcp/     Optional GitHub triage MCP for maintainers (`ftc-maintainer-mcp`)
  vscode-extension/   VS Code / Cursor extension
docs/                 Student, coach, and mentor docs
examples/             Sample FTC-like layout (not a full SDK)
```

## Names and identifiers

| Kind                | Value                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| Public project name | **FTC Dev Tools**                                                           |
| Provenance          | Built by The Allsparks                                                      |
| GitHub organization | `The-Allsparks`                                                             |
| Repository          | `The-Allsparks/ftc-dev-tools`                                               |
| npm scope           | `@ftc-dev-tools`                                                            |
| Extension publisher | `ftc-dev-tools` (Marketplace ID; ownership must be verified before publish) |
| CLI executable      | `ftc`                                                                       |

Details: [docs/branding-and-publishing.md](docs/branding-and-publishing.md).

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

### Consumer install (`ftc` CLI)

Students and teams should **not** need to clone this repository to use `ftc`.

1. Install JDK + `adb` (table above).
2. Install the CLI globally from a [GitHub Release](https://github.com/The-Allsparks/ftc-dev-tools/releases) tarball (after the first `v*` tag):

```bash
npm install -g "https://github.com/The-Allsparks/ftc-dev-tools/releases/download/v0.1.0/ftc-cli-0.1.0.tar.gz"
```

On Windows, use `npm.cmd install -g "…"` (same URL) if PowerShell blocks `npm.ps1`.

3. In your FTC project folder: `ftc doctor`

Full guide: [docs/cli-install.md](docs/cli-install.md). When `@ftc-dev-tools/cli` is published to npm, `npm install -g @ftc-dev-tools/cli` will work as well (on Windows: `npm.cmd install -g …`).

The **VS Code/Cursor extension** does not include the CLI. Install the VSIX separately (below) and the CLI using the steps above (or **FTC: Install FTC CLI** in the extension).

### From source (contributors)

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

3. Or use the Command Palette in VS Code/Cursor: **FTC: Start Here** or **FTC: Run Environment Check**.

Track **Competition readiness** milestones in the FTC Robot sidebar after doctor, device, build, and deploy checks pass.

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
- [First OpMode journey](docs/first-opmode-journey.md)
- [Onboarding 0.2 closure (maintainers)](docs/onboarding-0.2-closure.md)
- [Environment doctor](docs/doctor.md)
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
- [Vision Lab](docs/vision-lab.md)
- [MCP server](docs/mcp.md)
- [Maintainer MCP (optional)](docs/maintainer-mcp.md)
- [Vision sessions / replay schema](docs/vision-sessions.md)
- [Snippets](docs/snippets.md)
- [Wi-Fi manage API notes](docs/wifi-manage-api.md)
- [Configuration](docs/configuration.md)
- [Architecture](docs/architecture.md)
- [Branding and publishing](docs/branding-and-publishing.md)
- [Feature maturity](docs/feature-maturity.md)
- [Parity audit](docs/parity-audit.md)
- [Recommended extensions](docs/recommended-extensions.md)
- [Debugger spike](docs/debugger-spike.md)
- [Telemetry spike](docs/telemetry-spike.md)
- [Releasing](docs/releasing.md)
- [Physical device testing](docs/physical-device-testing.md)
- [Changelog](CHANGELOG.md)

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
npm run release:check -- --allow-dirty
```
