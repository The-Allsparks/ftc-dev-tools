# Architecture

This document is the architectural plan for `ftc-dev-tools` version `0.1.0`.

## Purpose

Provide a shared TypeScript core that powers:

1. A standalone CLI (`ftc`)
2. A VS Code / Cursor extension

Both surfaces must share project detection, Gradle Wrapper invocation, ADB device handling, log filtering, configuration validation, and student-friendly error interpretation. Neither surface reimplements those concerns independently.

## Design principles

- **Wrap, do not replace**: Use the project's checked-in Gradle Wrapper and system `adb`. Do not reimplement Gradle or ADB.
- **Shared core, thin UIs**: CLI and extension depend on `@ftc-dev-tools/shared`. The extension may shell out to the CLI for long-running streams when that simplifies cancellation UX, but business logic lives in shared.
- **Explicit device selection**: Never silently pick among multiple connected Android devices.
- **Safety by default**: No firmware changes, no OS/Wi-Fi changes, no automatic uninstalls, no arbitrary command execution from config files.
- **Deterministic errors**: Rule-based friendly error interpretation only. No AI classification in 0.1.0.
- **Testability**: Inject process runners and device providers. Mock providers cover CI without physical hardware.

## Monorepo layout

```text
packages/
  shared/            # @ftc-dev-tools/shared — types, services, mocks
  cli/               # @ftc-dev-tools/cli — executable `ftc`
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

Does **not** own CLI argument parsing or VS Code UI.

### `@ftc-dev-tools/cli`

Owns:

- Commander-based argument parsing
- Human and `--json` presentation
- Exit codes
- Signal handling (Ctrl+C) for log streams

Delegates all substantive work to shared services.

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

- PR workflow: install, lint, format check, typecheck, test, build, VSIX + CLI package dry-run on matrix
- Release workflow (manual or tag): attach CLI archive, VSIX, checksums, notes — **no** automatic npm / Marketplace publish in 0.1.0

## Deferred from 0.1.0 (see README roadmap)

Post-scaffold priorities (subject to change):

- **Shipped preview**: FTC SDK check/update; Wi-Fi Phase 1–3; Control Hub OS helpers (Phase 4); Pedro Pathing (Phase 5); OpMode create (Phase 6a); robot config XML (Phase 6b)
- **High**: Studio parity 6c (hardware map), then MCP server (Phase 7)
- **Strong interest**: telemetry dashboard
- **Maybe**: Road Runner (Pedro Pathing is the committed pathing focus), AI-assisted fixes, remote deploy beyond LAN
- **Hard line unless redesigned**: automatic firmware flash / factory reset, silent device selection, auto-uninstall

## Safety invariants

Encoded in shared deployment and process helpers:

- No multi-device silent selection
- No factory reset / firmware / system settings / Wi-Fi mutation APIs
- No automatic uninstall
- No project file deletion
- No command execution from config values
- Argument sanitization and direct process execution preferred over shells
