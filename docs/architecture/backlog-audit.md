# Backlog Audit

Fresh audit of GitHub issues and milestones against the Orchestrator v2 epic taxonomy (§15). See [coordination-ledger.md](./coordination-ledger.md).

**Audit date:** 2026-07-30  
**Open issues:** 102 (gh `issue list --limit 200`, post–Gate A)  
**Phase:** Phase 3 active; Phase 4 unblocked — Gate A approved 2026-07-30

---

## Executive summary

| Metric                            | Count   | Notes                                                                                                                                                                                                                             |
| --------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Open issues                       | 102     | Down from ~105 pre–Gate A (#49–#53, #186 closed; #233–#235 filed)                                                                                                                                                                 |
| Epic issues                       | 16      | §15 epics + #205 Robot Inspector (post-§15 umbrella)                                                                                                                                                                              |
| TUNE child issues                 | 25      | #208–#232 filed since last audit                                                                                                                                                                                                  |
| VISION child issues open          | 0       | #49–#53 **closed** (Gate A); VISION-06–18 previously closed                                                                                                                                                                       |
| REPLAY / SIM / ADAPT child series | 3 filed | [#233 REPLAY-01](https://github.com/The-Allsparks/ftc-dev-tools/issues/233), [#234 SIM-01](https://github.com/The-Allsparks/ftc-dev-tools/issues/234), [#235 ADAPT-01](https://github.com/The-Allsparks/ftc-dev-tools/issues/235) |
| MCP read-only smoke bugs          | 17      | #188–#204 — triage category, not epic work                                                                                                                                                                                        |
| Catalog gaps                      | 64      | Open issues not in `issue-label-catalog.json`                                                                                                                                                                                     |
| Duplicate issues                  | 0       | #186 **closed as duplicate** of #185 (Gate A)                                                                                                                                                                                     |

---

## Epic coverage matrix

Orchestrator v2 §15 defines **Core Platform**, five **Capability Modules**, two **Workflow Modules**, and six **Integration Adapter** epics. All §15 epics exist on GitHub. A post-§15 umbrella epic (#205) spans Core telemetry, FTC Dashboard, and Replay recording.

| Orchestrator epic     | GitHub issue                                                      | Catalog         | Priority | Open children            | Status / notes                                                                                               |
| --------------------- | ----------------------------------------------------------------- | --------------- | -------- | ------------------------ | ------------------------------------------------------------------------------------------------------------ |
| **Core Platform**     | [#142](https://github.com/The-Allsparks/ftc-dev-tools/issues/142) | Partial         | P1       | ~27 `shared-core` issues | Release hardening (#71–#88), REQ-* (#159–#161), diagnostics; no CORE-* series                                |
| **Vision Lab**        | [#48](https://github.com/The-Allsparks/ftc-dev-tools/issues/48)   | Yes             | P2       | 0                        | VISION-01–18 complete; #49–#53 closed (Gate A)                                                               |
| **FTC Replay**        | [#143](https://github.com/The-Allsparks/ftc-dev-tools/issues/143) | Yes             | P2       | 1 REPLAY-*               | [#233 REPLAY-01](https://github.com/The-Allsparks/ftc-dev-tools/issues/233) filed; schema foundation shipped |
| **FTC Sim**           | [#145](https://github.com/The-Allsparks/ftc-dev-tools/issues/145) | Yes             | P2       | 3                        | [#234 SIM-01](https://github.com/The-Allsparks/ftc-dev-tools/issues/234) + scattered #89, #91                |
| **Hardware Lab**      | [#144](https://github.com/The-Allsparks/ftc-dev-tools/issues/144) | Yes             | P2       | ~7                       | #19 deployment matrix, #77 compatibility matrix, hwmap/MCP bugs                                              |
| **Tuning Lab**        | [#146](https://github.com/The-Allsparks/ftc-dev-tools/issues/146) | **Stale title** | P2       | 25 TUNE-* (#208–#232)    | Full child backlog filed; catalog title mismatch                                                             |
| **Adapter Framework** | [#147](https://github.com/The-Allsparks/ftc-dev-tools/issues/147) | Yes             | P1       | 1 ADAPT-*                | [#235 ADAPT-01](https://github.com/The-Allsparks/ftc-dev-tools/issues/235) filed; Phase 4 **active**         |
| **Pedro Pathing**     | [#149](https://github.com/The-Allsparks/ftc-dev-tools/issues/149) | Yes             | P2       | 1 adapter (#226 TUNE-19) | Shipped in `packages/shared/src/pedro/`; migration to adapter contract pending                               |
| **Road Runner**       | [#148](https://github.com/The-Allsparks/ftc-dev-tools/issues/148) | Yes             | P2       | 1 adapter (#227 TUNE-20) | Experimental / deferred                                                                                      |
| **NextFTC**           | [#150](https://github.com/The-Allsparks/ftc-dev-tools/issues/150) | Yes             | P2       | 0                        | Evaluation epic only                                                                                         |
| **FTCLib**            | [#151](https://github.com/The-Allsparks/ftc-dev-tools/issues/151) | Yes             | P2       | 0                        | Evaluation epic only                                                                                         |
| **FTC Dashboard**     | [#152](https://github.com/The-Allsparks/ftc-dev-tools/issues/152) | Yes             | P2       | 0                        | **Sub-issue of #205**; VISION-06 closed                                                                      |
| **Match Analysis**    | [#153](https://github.com/The-Allsparks/ftc-dev-tools/issues/153) | Missing         | P2       | 0                        | Workflow module; Phase 5 blocked                                                                             |
| **Autonomous Studio** | [#154](https://github.com/The-Allsparks/ftc-dev-tools/issues/154) | Missing         | P2       | 0                        | Workflow module; Phase 5 blocked                                                                             |

**Phase meta:** [#141](https://github.com/The-Allsparks/ftc-dev-tools/issues/141) — Orchestrator coordination (Phase 1 complete; keep for Phase 3–6 tracking)

### Post-§15 umbrella epic (not in original taxonomy)

| Epic                           | GitHub issue                                                      | Relationship to §15                               | Notes                                                                                           |
| ------------------------------ | ----------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Robot Inspector / Live Monitor | [#205](https://github.com/The-Allsparks/ftc-dev-tools/issues/205) | Spans Core + FTC Dashboard + Replay + diagnostics | Links #152 as sub-issue; supersedes scattered telemetry work; **not** a duplicate of Vision Lab |

---

## Open issue distribution by epic (approximate)

Counts overlap when issues span multiple epics (e.g. TUNE-* with `adapter-framework`).

| Epic area                  | Open count | Key issue IDs                                         |
| -------------------------- | ---------- | ----------------------------------------------------- |
| Core Platform              | 27         | #9–#88 band, #159–#161 REQ-*, #141, #142              |
| Vision Lab                 | 1          | #48 (epic only)                                       |
| Tuning Lab                 | 26         | #146, #208–#232                                       |
| MCP smoke triage           | 17         | #188–#204                                             |
| Hardware Lab               | 7          | #144, #19, #77, MCP hwmap/config bugs                 |
| FTC Sim                    | 3          | #145, #89, #91                                        |
| Adapter Framework          | 3          | #147, TUNE-06/21 with `adapter-framework`             |
| Pedro / Road Runner        | 3–4        | #149, #148, #226, #227                                |
| FTC Dashboard              | 2          | #152, #205 (parent)                                   |
| FTC Replay                 | 3          | #143, #233 REPLAY-01, TUNE issues with `replay` label |
| Workflow modules           | 2          | #153, #154                                            |
| Unassigned (Core-adjacent) | 14         | Release (#84–#86), UX (#183–#184), MCP auth (#73)     |

---

## Scattered backlog → epic mapping

| Catalog / backlog item                                                  | Mapped epic                                      | GitHub                                            |
| ----------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------- |
| `Backlog: Integrate existing FTC simulators through pluggable adapters` | FTC Sim                                          | #91 → #145                                        |
| `Add a no-hardware practice and validation mode`                        | FTC Sim                                          | #89 → #145                                        |
| `VISION-13: Implement capture, session recording, and offline replay`   | FTC Replay + Vision Lab                          | Closed #61; capture pipeline → #143               |
| `VISION-06: Implement FTC Dashboard interoperability`                   | FTC Dashboard + Robot Inspector                  | Closed #54; provider work → #152, umbrella → #205 |
| `Build physical deployment test matrix`                                 | Hardware Lab + Core                              | #19 → #144, #142                                  |
| `Publish and test an FTC tooling compatibility matrix`                  | Hardware Lab + Core                              | #77                                               |
| Pedro Pathing (shipped)                                                 | Pedro → Adapter Framework                        | #149 → #147; TUNE-19 (#226)                       |
| `REQ-PROJ-001: Create FTC project from scratch`                         | Core Platform                                    | #159                                              |
| `REQ-DBG-001: Java breakpoint attach on Robot Controller`               | Core Platform                                    | #160 (0.4 Debugging Investigation)                |
| `REQ-RULE-001: Season handbook and game manual awareness`               | Core Platform (Season Support workflow deferred) | #161                                              |
| MCP read-only smoke failures                                            | Triage — fix before 1.0 MCP claims               | #188–#204                                         |
| RC Console Wi-Fi manage                                                 | Core Platform                                    | #185, #186, #187                                  |
| VS Code sidebar / Simple Browser UX                                     | Core Platform                                    | #183, #184                                        |

---

## MCP read-only smoke test triage (#188–#204)

Filed from `scripts/mcp-readonly-smoke.mjs` against a connected Control Hub. **17 open bugs**, all labeled `bug`, `mcp`, `testing`, `hardware-validation`, `priority: P1`. Treat as a **cross-cutting triage category**, not an epic.

| Epic area affected   | Issues           | Root-cause themes                                       |
| -------------------- | ---------------- | ------------------------------------------------------- |
| Core / doctor        | #188             | Doctor check failed                                     |
| Core / devices / SDK | #189, #190, #191 | Device count, SDK version, hub console                  |
| Pedro adapter        | #192             | `pedro_status` unexpected result                        |
| Config / hwmap       | #193–#196        | Config tree, validation flag, hwmap entries             |
| Provider registry    | #197             | `providers_list` unexpected result                      |
| Vision / Limelight   | #198–#204        | Pipeline validate/diff, limelight HTTP, dashboard probe |

**Proposed handling:** Parent tracking issue or milestone slice `MCP Read-Only Hardening`; fix Core/doctor/config first (#188–#196), then vision tools (#198–#204). Do not file duplicate epics.

---

## Milestone alignment

| Milestone                      | Open count | Orchestrator alignment                                   |
| ------------------------------ | ---------- | -------------------------------------------------------- |
| _(none)_                       | 68         | Phase 3 capability work (TUNE-_, epics, MCP bugs, REQ-_) |
| 1.0 Hardware-Validated Release | 18         | Core Platform + release hardening                        |
| 0.3 Diagnostics and Testing    | 9          | Core diagnostics, Logcat, deployment recovery            |
| FTC Vision Lab                 | 0          | #49–#53 closed (Gate A)                                  |
| Future Integrations            | 2          | #91 sim adapters, #12 SDK sample browser                 |
| 0.4 Debugging Investigation    | 1          | #20 JDWP (superseded by #160 REQ-DBG-001?)               |
| 0.1 Release Hardening          | 1          | #9 Marketplace                                           |

**Gaps:**

- TUNE-01–25 have **no milestone** — assign `Tuning Lab` milestone when created
- MCP smoke bugs have **no milestone** — propose `0.3 Diagnostics and Testing` or pre-1.0 gate
- VISION-01–05 (#49–#53) **closed** (Gate A 2026-07-30)

**Proposed (not created):** milestone `2.0 Modular Architecture` — registry extractions, adapter framework, first capability package splits (unchanged from Phase 1 proposal)

---

## Label and catalog gaps

### Catalog sync status

`npm run check:issue-labels` reports **150 catalog entries validated** but warns:

```
Catalog issue not found in repo: [EPIC] Tuning Lab — PID and mechanism tuning workflows
```

GitHub epic #146 title changed to **"safe drivetrain characterization, localization, and control tuning"** — catalog entry is stale.

**64 open issues missing from catalog**, including:

- All TUNE-01–25 (#208–#232)
- #205 Robot Inspector epic
- All MCP smoke bugs (#188–#204)
- REQ-* issues (#159–#161)
- Several §15 epics (#142–#154) missing exact title match
- Recent Core fixes (#183–#187)

### Label gaps (proposed, not applied)

| Label             | Purpose                                                 |
| ----------------- | ------------------------------------------------------- |
| `robot-inspector` | #205 and future Robot Inspector / Live Monitor children |
| `mcp-smoke`       | Triage bucket for #188–#204 and regression tracking     |
| `requirements`    | REQ-* issues from requirements doc                      |

### Existing labels in use

Confirmed in `.github/labels.yml` and on epics: `sim`, `adapter-framework`, `hardware-lab`, `tuning-lab`, `workflow`, `replay`, `recording`, `vision`, `ftc-dashboard`, `telemetry`, `diagnostics`.

---

## Misalignments and duplicates

| Issue              | Problem                                    | Recommended action                                                                   |
| ------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------ |
| #185 / #186        | Identical title (RC Console Wi-Fi manage)  | **Done** — #186 closed as duplicate of #185                                          |
| #49–#53            | VISION-01–05 open; ledger marks complete   | **Done** — closed with Phase 3 completion note                                       |
| #20 vs #160        | Both JDWP/debugger attach                  | Consolidate; prefer REQ-DBG-001 (#160)                                               |
| #146 catalog title | "PID and mechanism tuning" vs GitHub title | Update catalog to match #146                                                         |
| #152 vs #205       | Potential duplicate epics                  | **Resolved:** #205 subsumes #152 per #205 body; keep both, link in Development panel |
| VISION-13 / Replay | Recording split across Vision and Replay   | VISION-13 closed; platform capture → FTC Replay (#143)                               |

---

## Relationship rules (avoid duplication)

1. **Vision Lab (#48)** remains umbrella for VISION-01–18; do not re-file under new epics. VISION-01–18 all closed (#49–#53 closed Gate A).
2. **FTC Replay (#143)** is platform-wide session recording; TUNE-02/08 and #205 Phase 6 extend schemas — coordinate via ADR-0005, not duplicate issues.
3. **FTC Dashboard (#152)** is a sub-issue of **Robot Inspector (#205)** for provider/interop; VISION-06 dashboard commands remain Vision Lab surface.
4. **Pedro (#149)** tracks adapter-framework migration; TUNE-19 (#226) is Tuning Lab adapter work under same integration.
5. **Road Runner (#148)** stays experimental; TUNE-20 (#227) is tuning adapter only.
6. **Tuning Lab (#146)** owns TUNE-01–25; do not scatter tuning work under Hardware Lab or Core without cross-links.
7. **MCP smoke bugs (#188–#204)** are triage/fix items — not capability epics.

---

## Child-issue skeletons

Tuning Lab skeleton is **superseded** by TUNE-01–25 (#208–#232).

### FTC Replay (#143)

- **REPLAY-01:** [#233](https://github.com/The-Allsparks/ftc-dev-tools/issues/233) — Define platform session capture pipeline (**filed**, Gate A)
- REPLAY-02: CLI `ftc replay record` / `export` hardening (not filed)
- REPLAY-03: MCP replay tools — align with smoke test expectations (not filed)
- REPLAY-04: Cross-link TUNE-08 recording and Robot Inspector #205 Phase 6 (not filed)

### FTC Sim (#145)

- **SIM-01:** [#234](https://github.com/The-Allsparks/ftc-dev-tools/issues/234) — Define simulation runtime provider interface (**filed**, Gate A)
- SIM-02: Prototype no-hardware validation mode (extends #89) (not filed)
- SIM-03: Document simulator adapter evaluation criteria (extends #91) (not filed)
- SIM-04: First adapter spike (FTCSimulator or Webots evaluation) (not filed)

### Hardware Lab (#144)

- HW-01: Pinpoint adapter evaluation
- HW-02: OTOS adapter evaluation
- HW-03: Extend hwmap workflows for localization devices
- HW-04: Close MCP hwmap/config smoke failures (#194–#196)

### Adapter Framework (#147) — Phase 4

- **ADAPT-01:** [#235](https://github.com/The-Allsparks/ftc-dev-tools/issues/235) — Define IntegrationAdapter interface and registration API (**filed**, Gate A)
- ADAPT-02: Migrate Pedro to adapter contract (#149) (not filed)
- ADAPT-03: Generate integration docs from registry (not filed)

### Core Platform (#142)

- Close REQ-* triage and 1.0 milestone blockers
- Registry-driven doctor checks for integrations (post smoke fixes)

### Robot Inspector (#205) — proposed RI-* series (not filed)

- RI-01: Passive Robot Inspector (configuration pull + compare)
- RI-02: ADB system telemetry provider
- RI-03: Robot-side agent scaffold (`ftc-dev-tools-robot-agent`)
- RI-04: Live Monitor UI + session recording integration

---

## Catalog sync checklist

1. Update Tuning Lab epic title in `scripts/issue-label-catalog.json` to match #146
2. Add TUNE-01–25 label entries (batch)
3. Add #205, REQ-*, MCP smoke bugs, and missing epic title variants
4. Add proposed labels to `.github/labels.yml` if adopted (`robot-inspector`, `mcp-smoke`)
5. Run `npm run check:issue-labels` after edits

---

## Gate A actions (2026-07-30)

| Action                                                | Status   |
| ----------------------------------------------------- | -------- |
| Close VISION-01–05 (#49–#53)                          | **Done** |
| Close duplicate #186 (keep #185)                      | **Done** |
| File REPLAY-01 (#233), SIM-01 (#234), ADAPT-01 (#235) | **Done** |
| Sync Tuning Lab epic title in catalog                 | **Done** |
| Add Robot Inspector epic to catalog                   | **Done** |
| MCP smoke triage (#188–#204)                          | Pending  |

## Next steps (post–Gate A)

1. **Sync catalog** — 64 open issues still missing; batch TUNE-* and MCP smoke entries
2. **Triage MCP smoke** #188–#204 — prioritize Core/doctor/config (#188–#196) before vision MCP
3. **Assign milestones** — TUNE-* → new Tuning Lab milestone; MCP bugs → 0.3 or 1.0 gate
4. **Link #152 under #205** in GitHub Development panel if not already done
5. **Execute Phase 4** — ADAPT-01 (#235); file REPLAY-02+ / SIM-02+ as scope clarifies
6. **Gate B** — see [coordination-ledger.md](./coordination-ledger.md) before Phase 5 workflow modules

---

## References

- [ADR-0001: Product taxonomy](./adr/0001-product-taxonomy.md) — §15 epic layers
- [coordination-ledger.md](./coordination-ledger.md) — Phase 3 deliverable status
- [scripts/issue-label-catalog.json](../../scripts/issue-label-catalog.json)
- [scripts/mcp-readonly-smoke.mjs](../../scripts/mcp-readonly-smoke.mjs)
