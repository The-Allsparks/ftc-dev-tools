# GitHub issue labels

This repository uses labels for **triage**, **roadmap priority**, **code surface**, **cross-cutting concerns**, and **Vision Lab sub-areas**. Issues **#48+** established the current convention; older parity and onboarding issues follow the same rules via [scripts/issue-label-catalog.json](../scripts/issue-label-catalog.json).

## Required labels on roadmap issues

Every open tracking issue (features, epics, hardening work) should include:

1. **Exactly one priority:** `priority: P0`, `priority: P1`, or `priority: P2`
2. **At least one surface or umbrella:**
   - `shared-core` — `packages/shared`
   - `vscode` — VS Code / Cursor extension
   - `cli` — `ftc` CLI
   - `mcp` — MCP server tools
   - `vision` — FTC Vision Lab (see vision sub-labels below)
   - Or `documentation` / `architecture` when the work is docs-only or design-only
3. **Type (when applicable):** `enhancement`, `bug`, or `documentation` (GitHub templates set this automatically for new reports)

Epics must include **`epic`**.

## Priority meanings

| Label          | Use when                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------- |
| `priority: P0` | Release-blocking, security-critical path, or umbrella epic for the next rookie/deploy milestone |
| `priority: P1` | Important for 1.0 quality, onboarding, deploy reliability, or validated hardware work           |
| `priority: P2` | Valuable later work, investigations, vision backlog, or polish                                  |

## Cross-cutting labels (optional, add when relevant)

| Label                  | Meaning                                         |
| ---------------------- | ----------------------------------------------- |
| `student-ux`           | Copy, wizards, errors aimed at students         |
| `developer-experience` | Mentor/contributor workflows                    |
| `reliability`          | Concurrency, recovery, lifecycle, locking       |
| `security`             | Credentials, consent, redaction, trust          |
| `testing`              | Automated tests                                 |
| `hardware-validation`  | Physical Control Hub / phone matrix             |
| `release`              | Packaging, channels, metadata, install          |
| `competition`          | Competition-day / offline readiness             |
| `integration`          | Third-party tools (Dashboard, simulators, etc.) |

## Vision Lab

Issues under the Vision epic use **`vision`** plus one or more sub-labels (`limelight`, `visionportal`, `webview`, `codegen`, …). All vision child issues use **`priority: P2`** unless promoted.

## Maintainer workflow

```bash
# Check all issues against the catalog and generic rules
npm run check:issue-labels

# Add missing catalog labels (dry-run first)
node scripts/issue-labels.mjs apply --dry-run
node scripts/issue-labels.mjs apply
```

When filing or editing issues:

1. Match labels to an existing similar issue when possible.
2. Add the issue title and label set to `scripts/issue-label-catalog.json` if it is a new roadmap item.
3. Run `npm run check:issue-labels` before merging catalog changes.

CI runs the same validation on pull requests that touch the catalog and weekly on `main` ([`.github/workflows/issue-labels.yml`](../.github/workflows/issue-labels.yml)).

Label definitions live in [`.github/labels.yml`](../.github/labels.yml) and sync on push to `main`.

## Pull requests

PRs are not covered by this catalog. Use conventional scope in titles/descriptions; issue links should reference labeled issues.
