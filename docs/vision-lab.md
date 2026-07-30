# Vision Lab

Vision Lab helps FTC teams configure, inspect, and troubleshoot vision from VS Code, Cursor, or the `ftc` CLI — without replacing Limelight, VisionPortal, EasyOpenCV, or FTC Dashboard on the robot.

**Maturity:** Vision Lab features are **Mock-tested** in CI until physical hardware checklists pass. See [Feature maturity](./feature-maturity.md) and [Vision hardware testing](./vision-hardware-testing.md).

## Quick start — pick one path

### Path A: Limelight Vision (coprocessor on robot network)

1. Connect your laptop to the robot network (USB debugging or field Wi‑Fi).
2. Add Limelight host to `.ftc-dev.json` (see [Vision configuration](./vision-configuration.md)):

```json
{
  "vision": {
    "limelight": { "host": "10.9.16.11" }
  }
}
```

Team number `916` often maps to `10.9.16.11`; confirm with your Limelight web UI or mentor.

3. Verify from the project root:

```bash
ftc vision limelight status
ftc vision limelight results --json
```

4. Open the Limelight web UI: `ftc vision open --provider vision:limelight`

Full guide: [Limelight](./limelight.md)

### Path B: Webcam + VisionPortal (on Control Hub)

1. Configure the webcam in **Robot Configuration** (Driver Hub or OnBot Java config tool).
2. Scan TeamCode:

```bash
ftc vision discover --json
ftc vision visionportal status --json
```

3. Optional: scaffold Java stubs with `ftc vision codegen visionportal --class MyVision --yes`

Full guide: [VisionPortal](./visionportal.md)

## VS Code / Cursor

- Command Palette: **FTC: Open Vision Lab**
- Activity bar: **Vision** sidebar (read-only status, inspector, deferred replay section)
- Doctor includes an optional **Vision setup** section (`ftc doctor`)

Screenshots are tracked in [docs/images/README.md](./images/README.md) — placeholders until maintainer captures land.

## CLI catalog

```bash
ftc vision catalog
ftc vision validation status --json
```

Every mutating command requires explicit confirmation (`--yes` or `--dry-run` preview). See [Vision CLI architecture](./architecture/vision-cli.md).

## MCP (Cursor agents)

59 read-only and gated mutation tools including `vision_get_diagnostics`, `vision_validation_status`, and agent-friendly aliases. See [MCP server](./mcp.md).

## Troubleshooting decision tree

```text
Vision problem?
├─ Not an FTC project / wrong folder
│  └─ Open repo root (settings.gradle), run ftc doctor
├─ Multiple robots or cameras detected
│  └─ Pass --host, --device, or --endpoint explicitly — never auto-pick
├─ Limelight unreachable
│  ├─ ftc vision limelight status --json
│  ├─ Check robot radio / USB / dual-NIC (docs/wifi.md)
│  └─ See limelight.md → Troubleshooting
├─ Webcam not found
│  ├─ ftc config show (robot config XML)
│  └─ See visionportal.md → Troubleshooting
├─ FTC Dashboard won't open
│  └─ ftc vision dashboard status --json → ftc-dashboard.md
├─ Pipeline JSON errors
│  └─ ftc vision limelight pipelines validate --json
└─ Still stuck
   └─ ftc vision diagnostics --json → paste redacted output for mentors
```

## Competition use warning

During **official FTC match play**, network and device rules apply. Do not rely on this tooling to change robot configuration, upload pipelines, or open browser dashboards unless your event rules and alliance strategy allow it. Prefer pre-match setup on the practice field. FTC Dashboard and Limelight web UI may consume robot radio bandwidth — coordinate with drive team and mentors.

## Privacy and recording

- Session **recording is not shipped** yet; schema validation only.
- When live capture ships, treat recordings like match video: redact student names, home addresses, and serial numbers before sharing.
- Use `--redact` on CLI JSON and MCP `redact: true` before pasting diagnostics in public channels.
- Never commit Wi‑Fi passwords, Limelight credentials, or `.ftc-dev.json` with real device serials to public repos.

See [Vision security](./vision-security.md).

## Sample workspace

Minimal example files (not a full SDK project): [samples/vision-workspace](./samples/vision-workspace/README.md)

Sample session header (replay schema): [samples/vision-session](./samples/vision-session/README.md)

## Related guides

| Topic                 | Guide                                                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Configuration         | [vision-configuration.md](./vision-configuration.md)                                                                               |
| Architecture overview | [vision-architecture.md](./vision-architecture.md)                                                                                 |
| Diagnostics codes     | [vision-diagnostics.md](./vision-diagnostics.md)                                                                                   |
| Sessions / replay     | [vision-sessions.md](./vision-sessions.md)                                                                                         |
| Security & privacy    | [vision-security.md](./vision-security.md)                                                                                         |
| Hardware validation   | [vision-hardware-testing.md](./vision-hardware-testing.md)                                                                         |
| Provider deep dives   | [limelight](./limelight.md), [visionportal](./visionportal.md), [ftc-dashboard](./ftc-dashboard.md), [easyopencv](./easyopencv.md) |
