# Library Capability Matrix

Cross-reference of FTC ecosystem libraries against capability areas. Generated from the [integration registry](../../packages/shared/src/registry/catalog.ts); update catalog when adding adapters.

## Capability columns

| Capability      | Description                                |
| --------------- | ------------------------------------------ |
| Path Planning   | Autonomous paths, splines, motion profiles |
| Commands        | Command-based / scheduler frameworks       |
| Vision          | Cameras, pipelines, AprilTag, detection    |
| Dashboard       | Live telemetry UI                          |
| Replay          | Session recording and offline playback     |
| Simulation      | No-hardware or virtual robot runtimes      |
| Logging         | Structured logs beyond Logcat              |
| Hardware        | Device configuration, sensors, actuators   |
| Localization    | Pose estimation, odometry                  |
| Code Generation | Scaffold, snippets, codegen from config    |

## Matrix

| Library            | Class        | Path | Cmd | Vision | Dash | Replay | Sim | Log | HW  | Loc | Codegen |
| ------------------ | ------------ | :--: | :-: | :----: | :--: | :----: | :-: | :-: | :-: | :-: | :-----: |
| FTC SDK (official) | Official     |      |  ✓  |   ✓    |      |        |     |  ✓  |  ✓  |     |         |
| Pedro Pathing      | Supported    |  ✓   |     |        |      |        |     |     |     |  ✓  |    ✓    |
| FTC Dashboard      | Supported    |      |     |        |  ✓   |   ✓    |     |  ✓  |     |     |         |
| VisionPortal       | Official     |      |     |   ✓    |      |   ✓    |  ✓  |     |     |     |         |
| EasyOpenCV         | Supported    |      |     |   ✓    |      |   ✓    |     |     |     |     |         |
| Limelight          | Supported    |      |     |   ✓    |      |   ✓    |     |     |     |  ✓  |         |
| Road Runner        | Legacy       |  ✓   |     |        |      |        |  ✓  |     |     |  ✓  |         |
| NextFTC            | Experimental |      |  ✓  |        |      |        |     |     |     |     |         |
| FTCLib             | Experimental |      |  ✓  |        |      |        |     |     |  ✓  |     |         |
| Pinpoint           | Supported    |      |     |        |      |   ✓    |     |     |  ✓  |  ✓  |         |
| OTOS               | Supported    |      |     |        |      |   ✓    |     |     |  ✓  |  ✓  |         |

✓ = capability declared in registry metadata (planned or shipped).

## Capability modules (not libraries)

| Module       | Layer      | Provides                          |
| ------------ | ---------- | --------------------------------- |
| Vision Lab   | Capability | Vision, replay (partial), codegen |
| FTC Replay   | Capability | Replay, logging                   |
| FTC Sim      | Capability | Simulation                        |
| Hardware Lab | Capability | Hardware, localization            |
| Tuning Lab   | Capability | (TBD — tuning workflows)          |

## CLI / MCP surfacing

| Shipped today           | Command / tool                                   |
| ----------------------- | ------------------------------------------------ |
| Pedro Pathing           | `ftc pedro`, MCP `pedro_*`                       |
| Registry (all metadata) | `ftc integrations list`, MCP `integrations_list` |

## Related

- [ftc-software-ecosystem.md](./ftc-software-ecosystem.md)
- [repository-inventory.md](./repository-inventory.md)
