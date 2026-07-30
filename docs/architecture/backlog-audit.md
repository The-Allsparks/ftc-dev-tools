# Backlog Audit

Phase 1 audit of GitHub issues and milestones against the Orchestrator v2 epic taxonomy (§15). See [coordination-ledger.md](./coordination-ledger.md).

## Epic coverage matrix

| Orchestrator epic | GitHub issue | Catalog | Priority | Notes |
|-------------------|-------------|---------|----------|-------|
| Core Platform | [#142](https://github.com/The-Allsparks/ftc-dev-tools/issues/142) | Yes | P1 | New — registry foundations |
| Vision Lab | [#48](https://github.com/The-Allsparks/ftc-dev-tools/issues/48) | Yes | P2 | VISION-01–18 children |
| FTC Replay | [#143](https://github.com/The-Allsparks/ftc-dev-tools/issues/143) | Yes | P2 | VISION-13 is child candidate |
| FTC Sim | [#145](https://github.com/The-Allsparks/ftc-dev-tools/issues/145) | Yes | P2 | Absorbs simulator adapter backlog |
| Hardware Lab | [#144](https://github.com/The-Allsparks/ftc-dev-tools/issues/144) | Yes | P2 | Pinpoint, OTOS, validation |
| Tuning Lab | [#146](https://github.com/The-Allsparks/ftc-dev-tools/issues/146) | Yes | P2 | New capability |
| Adapter Framework | [#147](https://github.com/The-Allsparks/ftc-dev-tools/issues/147) | Yes | P1 | ADR-0003 target |
| Pedro Pathing | [#149](https://github.com/The-Allsparks/ftc-dev-tools/issues/149) | Yes | P2 | Migration, not greenfield |
| Road Runner | [#148](https://github.com/The-Allsparks/ftc-dev-tools/issues/148) | Yes | P2 | Experimental / deferred |
| NextFTC | [#150](https://github.com/The-Allsparks/ftc-dev-tools/issues/150) | Yes | P2 | Evaluation epic |
| FTCLib | [#151](https://github.com/The-Allsparks/ftc-dev-tools/issues/151) | Yes | P2 | Evaluation epic |
| FTC Dashboard | [#152](https://github.com/The-Allsparks/ftc-dev-tools/issues/152) | Yes | P2 | Overlaps VISION-06 |
| Match Analysis | [#153](https://github.com/The-Allsparks/ftc-dev-tools/issues/153) | Yes | P2 | Workflow module |
| Autonomous Studio | [#154](https://github.com/The-Allsparks/ftc-dev-tools/issues/154) | Yes | P2 | Workflow module |

**Phase 1 meta:** [#141](https://github.com/The-Allsparks/ftc-dev-tools/issues/141) — Orchestrator coordination

## Existing epics (pre–Phase 1)

| Epic | Issue | Status | Child issues |
|------|-------|--------|--------------|
| Zero-to-first-deploy rookie journey | #46 | Closed (0.2) | Onboarding milestone items |
| FTC Vision Lab | #48 | Open | VISION-01–18 in catalog |

## Scattered backlog → epic mapping

| Catalog / backlog item | Mapped epic |
|------------------------|-------------|
| `Backlog: Integrate existing FTC simulators through pluggable adapters` | FTC Sim (#145) |
| `VISION-13: Implement capture, session recording, and offline replay` | FTC Replay (#143) + Vision Lab |
| `VISION-06: Implement FTC Dashboard interoperability` | FTC Dashboard (#152) + Vision Lab |
| `Add a no-hardware practice and validation mode` | FTC Sim (#145) |
| `Build physical deployment test matrix` | Hardware Lab (#144) + Core |
| `Publish and test an FTC tooling compatibility matrix` | Core Platform (#142) |
| Pedro Pathing (shipped) | Pedro Pathing (#149) under Adapter Framework (#147) |

## Milestone alignment

Existing milestones (`scripts/create-parity-issues.mjs`):

| Milestone | Orchestrator phase alignment |
|-----------|------------------------------|
| 0.1 Release Hardening | Phase 1 adjacent — stability |
| 0.2 Rookie Onboarding | Closed — Core + surfaces |
| 0.3 Diagnostics and Testing | Core Platform (#142) |
| 0.4 Debugging Investigation | Core — debugger spike |
| 1.0 Hardware-Validated Release | Hardware Lab (#144) + Core |
| Future Integrations | Adapter Framework (#147), library epics |

**Proposed (not created):** milestone `2.0 Modular Architecture` after Phase 2 review — tracks registry, schemas, first capability extractions.

## Proposed child-issue skeletons (not filed)

Placeholder titles for maintainer review before filing sub-issues.

### Core Platform (#142)

- Define module registry API and manifest schema
- Extract readiness into documented Core public API
- Add registry-driven doctor checks for integrations

### Adapter Framework (#147)

- Define adapter metadata schema and registration API
- Migrate Pedro to adapter contract
- Generate integration docs from registry

### FTC Replay (#143)

- Define session recording schema (ADR-0005)
- Implement desktop session capture pipeline
- Link VISION-13 vision capture as provider consumer

### FTC Sim (#145)

- Define simulation runtime provider interface
- Prototype no-hardware validation mode
- Document simulator adapter evaluation criteria

### Hardware Lab (#144)

- Pinpoint adapter evaluation
- OTOS adapter evaluation
- Extend hwmap workflows for localization devices

### FTC Dashboard (#152)

- Complete telemetry spike recommendations
- Implement dashboard discovery in doctor
- Bridge robot telemetry to desktop (Java schema)

## Label gaps resolved

New labels added to [`.github/labels.yml`](../../.github/labels.yml) and synced to GitHub:

| Label | Purpose |
|-------|---------|
| `sim` | FTC Sim work |
| `adapter-framework` | Generic adapter framework |
| `hardware-lab` | Hardware Lab capability |
| `tuning-lab` | Tuning Lab capability |
| `workflow` | Workflow modules |

Reused existing: `epic`, `vision`, `replay`, `recording`, `integration`, `architecture`, `ftc-dashboard`, `hardware-validation`.

## Relationship rules (avoid duplication)

1. **Vision Lab** remains the umbrella for VISION-01–18; do not re-file those under new epics.
2. **FTC Replay (#143)** is platform-wide; VISION-13 becomes a sub-issue or cross-links to Replay.
3. **FTC Dashboard (#152)** coordinates with VISION-06; single implementation, dual epic links.
4. **Pedro (#149)** tracks adapter-framework migration; implementation already exists in `packages/shared/src/pedro/`.
5. **Road Runner (#148)** stays experimental; README defers in favor of Pedro.

## Catalog sync

All new epic titles are entries in [`scripts/issue-label-catalog.json`](../../scripts/issue-label-catalog.json). Run `npm run check:issue-labels` after catalog edits.

## Next steps (post-review)

1. Maintainer sign-off on epic map and ADRs
2. Link GitHub sub-issues to epics via Development panel
3. File child-issue skeletons after Phase 2 scope approval
4. Add `docs/architecture/ftc-software-ecosystem.md` and capability matrix (Phase 2)
