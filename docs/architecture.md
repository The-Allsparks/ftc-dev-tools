# Architecture

This document is the architectural plan for `ftc-dev-tools` version `0.1.0`.

## Purpose

Provide a shared TypeScript core that powers:

1. A standalone CLI (`ftc`)
2. A VS Code / Cursor extension
3. A stdio MCP server (`ftc-mcp`) for Cursor agents

All surfaces must share project detection, Gradle Wrapper invocation, ADB device handling, log filtering, configuration validation, and student-friendly error interpretation. Neither surface reimplements those concerns independently.

## Design principles

- **Wrap, do not replace**: Use the project's checked-in Gradle Wrapper and system `adb`. Do not reimplement Gradle or ADB.
- **Shared core, thin UIs**: CLI, extension, and MCP depend on `@ftc-dev-tools/shared`. The extension may shell out to the CLI for long-running streams when that simplifies cancellation UX, but business logic lives in shared.
- **Explicit device selection**: Never silently pick among multiple connected Android devices.
- **Safety by default**: No firmware changes, no OS/Wi-Fi changes, no automatic uninstalls, no arbitrary command execution from config files.
- **Deterministic errors**: Rule-based friendly error interpretation only. No AI classification in 0.1.0.
- **Testability**: Inject process runners and device providers. Mock providers cover CI without physical hardware.

## Monorepo layout

```text
packages/
  shared/            # @ftc-dev-tools/shared — types, services, mocks
  cli/               # @ftc-dev-tools/cli — executable `ftc`
  mcp/               # @ftc-dev-tools/mcp — stdio MCP (`ftc-mcp`)
  vscode-extension/  # ftc-dev-tools extension (thin UI)
docs/                # Student/coach/mentor documentation
examples/            # Minimal sample FTC-like layout for detection tests
```

npm workspaces coordinate builds. TypeScript project references keep package boundaries clear.

## Package boundaries

### `@ftc-dev-tools/shared`

Owns:

- Types: project info, devices, build/deploy results, log entries, friendly errors, command specs
- Interfaces: `ProjectAdapter`, `DeviceProvider`, `ProcessRunner`, `Logger`
- Implementations: `OfficialFtcProjectAdapter`, `AdbDeviceProvider`, `MockDeviceProvider`, `NodeProcessRunner`
- Discovery: Android SDK / ADB / Java / Gradle Wrapper / OS paths
- Config: `.ftc-dev.json` load + JSON Schema validation
- Errors: rule-based interpreter
- Doctor: checklist aggregation

Does **not** own CLI argument parsing, MCP protocol framing, or VS Code UI.

### `@ftc-dev-tools/cli`

Owns:

- Commander-based argument parsing
- Human and `--json` presentation
- Exit codes
- Signal handling (Ctrl+C) for log streams

Delegates all substantive work to shared services.

### `@ftc-dev-tools/mcp`

Owns:

- stdio MCP protocol framing (`@modelcontextprotocol/sdk`)
- Tool registration and confirmation gates (`yes` / `dryRun`)
- Cursor / agent-facing tool descriptions

Delegates all substantive work to shared services. Does not replace the extension for interactive UX (tree, status bar, live Logcat).

### `vscode-extension`

Owns:

- Command palette registration
- Activity-bar / tree view
- Status bar
- Output channel `FTC Dev Tools`
- Progress notifications and QuickPick device selection

Constructs shared services with `NodeProcessRunner` and presents results. Does not duplicate Gradle/ADB orchestration.

## Core interfaces

```ts
export interface ProjectAdapter {
  detect(directory: string): Promise<boolean>;
  inspect(directory: string): Promise<FtcProjectInfo>;
  getBuildCommand(project: FtcProjectInfo): Promise<CommandSpec>;
  locateApk(project: FtcProjectInfo): Promise<string>;
}

export interface DeviceProvider {
  listDevices(): Promise<AndroidDevice[]>;
  installApk(device: AndroidDevice, apkPath: string): Promise<void>;
  launchApp(device: AndroidDevice, applicationId: string): Promise<void>;
  streamLogs(device: AndroidDevice, options?: LogOptions): AsyncIterable<LogEntry>;
}

export interface ProcessRunner {
  run(spec: CommandSpec, options?: RunOptions): Promise<CommandResult>;
  spawn(spec: CommandSpec, options?: SpawnOptions): ChildProcessHandle;
}
```

Dependency injection keeps tests free of real Gradle/ADB.

## Command flows

### `ftc doctor`

1. Collect environment facts (OS, Node, Java, SDK, adb, project, wrapper, devices).
2. Map each fact to pass / warn / fail with suggested actions.
3. Print checklist or stable JSON; nonzero exit when required checks fail.

### `ftc build`

1. Detect project via `OfficialFtcProjectAdapter`.
2. Build `CommandSpec` for Gradle Wrapper task(s).
3. Run via `ProcessRunner` (no shell when avoidable).
4. Interpret failures; on success locate APK by inspecting known FTC layouts and Gradle outputs.

### `ftc deploy`

1. Validate project.
2. Resolve device (explicit serial, config preference, preferred connection filter, or single connected device). Refuse if ambiguous.
3. Build → locate APK → install → resolve application ID → launch when safe.
4. Dry-run prints planned steps without mutating the device.
5. Signature conflicts are explained; never auto-uninstall.

### `ftc logs`

Stream Logcat through `DeviceProvider.streamLogs`, with display filters (`teamcode`, `errors`, `raw`) and `AbortSignal` cancellation. Filtering does not permanently discard availability of raw mode.

## Configuration

Optional `.ftc-dev.json` validated against an in-repo JSON Schema. Unknown properties warn. Secrets are rejected / discouraged. Shared team settings vs local machine preferences (for example preferred device serial) are documented as separate concerns; 0.1.0 stores optional serial preference in the project file with a clear warning that serials are machine-local.

## Cross-platform

- Windows: `gradlew.bat`, common SDK paths under `%LOCALAPPDATA%` and `%USERPROFILE%\AppData\Local\Android\Sdk`
- macOS / Linux: `./gradlew`, `~/Library/Android/sdk`, `~/Android/Sdk`, `ANDROID_HOME` / `ANDROID_SDK_ROOT`
- Direct `spawn` with argument arrays; timeouts and abort signals on long operations

## Testing strategy

- **Unit**: detection, config, ADB parsing, wrapper paths, APK discovery, app ID parsing, Logcat parsing, error rules, device selection, path helpers
- **Integration-style**: mocked processes + `MockDeviceProvider` scenarios (none / one / unauthorized / offline / multiple / install success/fail / disconnect)
- **CI**: Windows, macOS, Linux matrix — no physical Control Hub required
- **Optional local**: physical device / Control Hub docs; do not claim Control Hub compatibility until tested

## CI / release

- PR workflow: install, identity check, lint, format check, typecheck, test, build, VSIX + CLI package dry-run on matrix
- Release workflow (manual or tag): attach CLI archive, VSIX, checksums, notes — **no** automatic npm / Marketplace publish in 0.1.0
- Local dry-run: `npm run release:check` (see [branding-and-publishing.md](branding-and-publishing.md))

## Integrated capabilities (post-scaffold)

First-class product surfaces (CLI + extension + shared; MCP subset where noted):

- FTC SDK check/update
- Wi-Fi ADB, dual-NIC routing, hub Wi-Fi manage
- Control Hub OS helpers (explicit; `--attempt-upload` remains experimental)
- Pedro Pathing add/scaffold
- OpMode list/create
- Robot config list/show/validate/pull
- Hardware map show/codegen
- MCP server (`ftc-mcp`)

Maturity levels (mock-tested through hardware-validated) live in [feature-maturity.md](feature-maturity.md). Do not call Control Hub–affecting features **Stable** until physical checklists pass.

## Still deferred / investigative

- Telemetry / FTC Dashboard interoperability ([telemetry-spike.md](telemetry-spike.md))
- Java debugger attach via JDWP ([debugger-spike.md](debugger-spike.md)) — safety-critical; no support claim until hardware validation
- Richer Logcat UX, diagnostic bundles, TeamCode unit-test starters
- Road Runner (Pedro Pathing remains the committed pathing focus)
- AI-assisted fixes (only if rule-based errors stay the default)
- Remote deploy beyond LAN

## Hard line unless redesigned

- Automatic firmware flash / factory reset
- Silent multi-device selection
- Auto-uninstall

## Safety invariants

Encoded in shared deployment and process helpers:

- No multi-device silent selection
- No factory reset / automatic firmware flash
- No automatic uninstall
- No project file deletion
- No command execution from config values
- Wi-Fi / hub OS mutations only when explicitly confirmed (`--yes` / modal)
- Argument sanitization and direct process execution preferred over shells
