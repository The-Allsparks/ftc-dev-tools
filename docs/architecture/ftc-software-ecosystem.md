# FTC Software Ecosystem

Classification of libraries and tools that FTC Dev Tools integrates with or may support through adapters. Maintained as part of Orchestrator Phase 2; see [integration registry](../../packages/shared/src/registry/catalog.ts) for machine-readable metadata.

## Classification legend

| Class            | Meaning                                                               |
| ---------------- | --------------------------------------------------------------------- |
| **Official**     | FIRST / FTC SDK or documented official mechanism                      |
| **Supported**    | Community library with active maintenance; adapter planned or shipped |
| **Experimental** | Under evaluation; may change or not ship                              |
| **Legacy**       | Still used in the community but not the project's primary focus       |
| **Deprecated**   | Do not use for new projects; adapter may warn                         |

FTC Dev Tools **integrates** with the ecosystem; it does not replace upstream projects unless explicitly approved.

## Official

| Library                  | Category  | FTC Dev Tools status                         |
| ------------------------ | --------- | -------------------------------------------- |
| FTC SDK                  | Core      | Project detection, build, deploy, SDK update |
| VisionPortal             | Vision    | Vision Lab target (VISION-08)                |
| Driver Station telemetry | Dashboard | Documented; competition-legal                |

## Supported

| Library          | Category     | FTC Dev Tools status                                           |
| ---------------- | ------------ | -------------------------------------------------------------- |
| Pedro Pathing    | Pathing      | **Shipped** — `ftc pedro`                                      |
| FTC Dashboard    | Dashboard    | Epic #152; VISION-06; [telemetry spike](../telemetry-spike.md) |
| EasyOpenCV       | Vision       | Vision Lab adapter target (VISION-09)                          |
| Limelight        | Vision       | Vision Lab provider (VISION-04)                                |
| GoBilda Pinpoint | Localization | Hardware Lab epic                                              |
| SparkFun OTOS    | Localization | Hardware Lab epic                                              |

## Experimental

| Library                  | Category   | Notes                                |
| ------------------------ | ---------- | ------------------------------------ |
| NextFTC                  | Framework  | Evaluation epic #150                 |
| FTCLib                   | Framework  | Evaluation epic #151                 |
| FTC simulators (generic) | Simulation | Epic #145; pluggable adapter backlog |

## Legacy / deferred

| Library     | Category | Notes                                       |
| ----------- | -------- | ------------------------------------------- |
| Road Runner | Pathing  | Epic #148; Pedro is committed pathing focus |

## Not yet classified

Libraries may be added after [library evaluation](./adr/0003-integration-registry.md) (maintenance, SDK compatibility, adoption, licensing, replay/sim compatibility).

Candidates for future classification: Ivy, SolversLib, Mercurial, Panels, Sloth, WPILib ports.

## Updating this document

1. Add or update entry in `packages/shared/src/registry/catalog.ts`
2. Update [library-capability-matrix.md](./library-capability-matrix.md)
3. Run `ftc integrations list --json` to verify registry output

## Related

- [Backlog audit](./backlog-audit.md)
- [ADR-0003 Integration registry](./adr/0003-integration-registry.md)
- [Pedro Pathing guide](../pedro-pathing.md)
