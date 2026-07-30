# Changelog

All notable changes to FTC Dev Tools are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Vision Lab documentation** — student/mentor guides (`docs/vision-lab.md`, provider pages, configuration, security, sessions, hardware testing)
- Vision Lab sidebar on the documentation site; sample workspace and session schema files under `docs/samples/`
- README, MCP reference, troubleshooting, snippets, and architecture docs updated for Vision Lab (VISION-01–17)
- **Student onboarding (0.2)** — Start Here wizard, VS Code walkthrough, USB-first connect flow, First OpMode journey, competition readiness milestones ([#32](https://github.com/The-Allsparks/ftc-dev-tools/issues/32)–[#42](https://github.com/The-Allsparks/ftc-dev-tools/issues/42), [#45](https://github.com/The-Allsparks/ftc-dev-tools/issues/45)/[#46](https://github.com/The-Allsparks/ftc-dev-tools/issues/46))
- **Readiness model** — five-category `readinessSnapshot` in doctor JSON and sidebar competition checklist ([#82](https://github.com/The-Allsparks/ftc-dev-tools/issues/82))
- **State-aware FTC Robot sidebar** — student dashboard grouped by workflow state ([#180](https://github.com/The-Allsparks/ftc-dev-tools/issues/180))
- **GitHub error reporting** — opt-in `ftc github link` and `--report` on build/deploy/doctor ([#131](https://github.com/The-Allsparks/ftc-dev-tools/issues/131))
- **Maintainer MCP** — optional `@ftc-dev-tools/maintainer-mcp` for GitHub/CI triage ([#166](https://github.com/The-Allsparks/ftc-dev-tools/issues/166))
- **Registry introspection** — `ftc integrations|modules|providers list` and matching MCP read tools

### Notes

- Vision Lab capabilities remain **Mock-tested** until physical hardware checklists pass
- Vision Lab panel screenshots still use placeholders ([docs/images/README.md](docs/images/README.md))
- Tuning Lab ([#146](https://github.com/The-Allsparks/ftc-dev-tools/issues/146)) is planned; no user-facing tuning commands ship yet
- Session replay validates schema only; live record/playback remains deferred ([vision-sessions.md](docs/vision-sessions.md))

## [0.1.0] - 2026-07-27

### Added

- Shared TypeScript core powering CLI (`ftc`), VS Code/Cursor extension, and MCP server (`ftc-mcp`)
- Environment doctor, device listing, Gradle Wrapper build/clean, ADB deploy with multi-device refusal
- Logcat streaming with teamcode/errors/raw filters
- FTC SDK check/update (never modifies `TeamCode/`)
- Wi-Fi ADB, dual-NIC routing, hub Wi-Fi manage helpers, Control Hub OS helpers
- Pedro Pathing add/scaffold, OpMode create, robot config list/show/validate/pull, hardware-map codegen
- Release validation (`npm run release:check`), project identity CI checks, branding/publishing docs
- Feature maturity matrix and Android Studio / FTC for VS Code parity audit documents
- Versioned FTC Java snippets and guided computer/project setup commands (preview-before-write)
- Consumer CLI install docs, GitHub Release tarball packaging (bundled shared), and **FTC: Install FTC CLI** extension command
- Debugger and telemetry technical spike documents (no hardware support claimed yet)

### Changed

- Graduated SDK, Wi-Fi, hub OS helpers, Pedro, OpModes, robot config, hardware map, and MCP from “preview” framing to first-class supported features with honest maturity labels
- Repository metadata and schema URLs point at `The-Allsparks/ftc-dev-tools`

### Safety

- No automatic Control Hub OS/firmware flash, no silent multi-device selection, no auto-uninstall
- Hub multipart upload (`--attempt-upload`) remains experimental
- Physical REV Control Hub validation is not claimed as complete
