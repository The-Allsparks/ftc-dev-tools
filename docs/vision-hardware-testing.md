# Vision hardware testing

Automated CI tests prove **mock behavior** only. Physical validation requires maintainer field checklists on real Control Hubs, Limelight units, and webcams.

Full matrix: [architecture/vision-hardware-validation.md](./architecture/vision-hardware-validation.md)

## Check status

```bash
ftc vision validation status
ftc vision validation status --json
```

MCP: `vision_validation_status`

## Maturity levels (reminder)

| Level                      | Meaning                              |
| -------------------------- | ------------------------------------ |
| Mock-tested                | CI unit/integration tests with mocks |
| Desktop integration tested | Maintainer desktop + real JDK/adb    |
| REV Control Hub tested     | Physical hub validated               |
| Stable                     | Docs + hardware validation complete  |

Vision Lab features are **Mock-tested** until checklist rows flip to `pass`.

## Running field checklists (maintainers)

1. Pick a checklist id from `ftc vision validation status --json`
2. Execute steps on Windows/macOS/Linux × USB/Wi‑Fi as labeled
3. Record results using the template in [Feature maturity](./feature-maturity.md) (no personal names in public repos)
4. Update checklist status in source when passes are confirmed (future automation may ingest reports)

## What teams should do today

- Follow provider guides: [Limelight](./limelight.md), [VisionPortal](./visionportal.md)
- Use `ftc vision diagnostics` before events
- Do **not** assume green CI means your Limelight firmware build is certified

## Sample validation artifacts

- [Sample workspace](./samples/vision-workspace/README.md)
- [Sample session schema](./samples/vision-session/README.md)
