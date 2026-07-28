# Releasing

Versioning starts at `0.1.0`.

## What a release produces

- CLI package archive under `packages/cli/artifacts/` (`ftc-cli-<version>.tar.gz`, with vendored `@ftc-dev-tools/shared` for offline `npm install -g`)
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
npm run check:identity
npm run release:check
```

`release:check` validates package versions, repository URLs, publisher format, extension icon/metadata, licenses, README links, changelog entry, and packages CLI + VSIX. Use `--allow-dirty` while iterating locally; use `--skip-package` for a metadata-only pass.

Marketplace and Open VSX auto-publish remain **disabled**. See [branding-and-publishing.md](branding-and-publishing.md).

## Documentation site (GitHub Pages)

User-facing guides under `docs/` are published with [VitePress](https://vitepress.dev/) when changes land on `main`:

- Workflow: [`.github/workflows/pages.yml`](../.github/workflows/pages.yml)
- Public URL: <https://the-allsparks.github.io/ftc-dev-tools/>
- Local preview: `npm run docs:dev` (build: `npm run docs:build`)

Repository **Settings → Pages** must use **GitHub Actions** as the source (not a legacy branch deploy).

## Checklist before tagging

1. CI green on Windows, macOS, Linux
2. Docs updated for behavior changes
3. `npm run check:identity` passes
4. No claim of physical Control Hub validation unless performed
5. SAFETY invariants unchanged (no auto-uninstall, no firmware/Wi-Fi mutation)
6. GitHub repository description (settings UI / API; not set by this repo alone) should stay aligned with:

```text
FTC development tools built by The Allsparks for our team and the wider FTC community. Open source, Apache 2.0 licensed, with optional support through our nonprofit fiscal sponsor.
```

7. Confirm Marketplace publisher ownership before publishing a VSIX (`publisher` in `packages/vscode-extension/package.json` is currently `ftc-dev-tools`)
