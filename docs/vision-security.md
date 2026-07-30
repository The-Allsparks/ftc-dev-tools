# Vision security and privacy

Vision Lab touches cameras, network endpoints, and diagnostic payloads. Follow these rules in class, at home, and at events.

## Configuration secrets

**Never store in `.ftc-dev.json` or commit to git:**

- Wi‑Fi passwords
- Limelight admin passwords
- API tokens or team credentials
- Student personal data

Allowed: team number, hostnames, pipeline directory paths, provider ids.

## Redaction before sharing

When posting diagnostics for mentors or GitHub issues:

```bash
ftc vision diagnostics --json --redact
ftc vision devices --json --redact
```

MCP agents: pass `redact: true` on vision read tools.

Redaction strips likely serial numbers and IPv4 addresses from JSON strings. **Review output manually** before posting publicly.

## Recording and session files

Live session **capture is not shipped** (schema validation only). When recording ships:

- Treat files like match video — get consent before sharing identifiable footage
- Store session bundles on team-controlled storage
- Do not upload raw sessions with student faces to public issue trackers

Sample schema-only files: [samples/vision-session](./samples/vision-session/README.md)

## Network exposure

- Limelight and FTC Dashboard HTTP endpoints are intended for the **robot local network**
- Do not port-forward Limelight to the public internet without understanding the risk
- Competition fields may restrict extra Wi‑Fi clients — ask your lead mentor

## Mutating actions

These change TeamCode or camera state and require explicit confirmation:

| Action                     | CLI                                                          |
| -------------------------- | ------------------------------------------------------------ |
| Bridge scaffold            | `ftc vision bridge scaffold --yes`                           |
| Java codegen               | `ftc vision codegen scaffold <kind> --class Name --yes`      |
| Pipeline upload (deferred) | Not available — do not use unofficial scripts without review |

## Agent / MCP safety

- Mutating MCP tools refuse without `yes: true` or supported `dryRun`
- Camera mutations require an explicit `endpointId` from `vision_list_devices`
- See [MCP server](./mcp.md)
