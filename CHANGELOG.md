# Changelog

All notable changes to FTC Dev Tools are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Debugger and telemetry technical spike documents (no hardware support claimed yet)

### Changed

- Graduated SDK, Wi-Fi, hub OS helpers, Pedro, OpModes, robot config, hardware map, and MCP from “preview” framing to first-class supported features with honest maturity labels
- Repository metadata and schema URLs point at `The-Allsparks/ftc-dev-tools`

### Safety

- No automatic Control Hub OS/firmware flash, no silent multi-device selection, no auto-uninstall
- Hub multipart upload (`--attempt-upload`) remains experimental
- Physical REV Control Hub validation is not claimed as complete
