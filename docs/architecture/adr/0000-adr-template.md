# ADR-0000: ADR template

## Status

Accepted

## Context

FTC Dev Tools needs a consistent format for documenting architecture decisions that affect public APIs, module boundaries, safety, or cross-language contracts.

## Decision

Use a MADR-lite format for all ADRs:

1. **Title** — short noun phrase
2. **Status** — Proposed | Accepted | Deprecated | Superseded
3. **Context** — forces and constraints
4. **Decision** — what we will do
5. **Consequences** — positive, negative, and follow-ups
6. **Links** — related issues, PRs, docs

File naming: `NNNN-short-title.md` in `docs/architecture/adr/`.

New ADRs start as **Proposed**. Maintainers move to **Accepted** after review in a PR linked from the [coordination ledger](../coordination-ledger.md).

## Consequences

- Decisions are searchable and reviewable without reading chat history.
- Proposed ADRs can land in Phase 1 before implementation commits.
- Superseded ADRs remain for history; do not delete.

## Links

- [GOVERNANCE.md](../../../GOVERNANCE.md)
- [coordination-ledger.md](../coordination-ledger.md)
