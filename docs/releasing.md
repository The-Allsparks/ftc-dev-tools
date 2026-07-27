# Releasing

Versioning starts at `0.1.0`.

## What a release produces

- CLI package archive under `packages/cli/artifacts/`
- VSIX under `packages/vscode-extension/artifacts/`
- SHA-256 checksums
- Release notes generated from commits/changelog

Automatic publish to npm or the VS Code Marketplace is **not** enabled in 0.1.0.

## Manual / tag workflow

The GitHub Actions workflow `.github/workflows/release.yml` runs on:

- `workflow_dispatch`
- version tags matching `v*`

Local packaging:

```bash
npm run build
npm test
npm run package:cli
npm run package:extension
```

## Checklist before tagging

1. CI green on Windows, macOS, Linux
2. Docs updated for behavior changes
3. No claim of physical Control Hub validation unless performed
4. SAFETY invariants unchanged (no auto-uninstall, no firmware/Wi-Fi mutation)
