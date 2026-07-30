# Vision Lab IDE panel (VISION-10)

The VS Code extension exposes a read-only Vision Lab panel for workspace inspection, provider status, and source navigation. Opening the panel does **not** connect cameras or mutate robot hardware.

## Open Vision Lab

- Command Palette: **FTC: Open Vision Lab** (`ftc.openVisionLab`)
- FTC activity bar → **Vision** sidebar (compact summary)
- Sidebar title actions: **Refresh**, **Open Vision Lab**

## Panel sections

| Section              | Content                                                                     |
| -------------------- | --------------------------------------------------------------------------- |
| Connection           | Offline / ready / selection-required indicator (text + icon)                |
| Provider catalog     | Registered providers from `listVisionProviders()`                           |
| Endpoints            | Results from `discoverVisionDevices()` with reachability                    |
| Workspace discovery  | `getVisionStatus()` signals and config                                      |
| Provider status      | Limelight, Dashboard, bridge, VisionPortal, EasyOpenCV (isolated errors)    |
| Pipeline artifacts   | Workspace pipeline directories                                              |
| Diagnostics          | Bridge and discovery warnings                                               |
| Source navigation    | Open TeamCode pipeline/webcam files (`ftc.visionOpenSource`)                |
| Result inspector     | Structured Limelight results, normalized overlay preview, metrics, raw JSON |
| Live camera & replay | Placeholder — deferred                                                      |

## Safety

- Data loads only when the sidebar or panel is opened/refreshed — not on extension startup.
- Sidebar uses `probeNetwork: false` and `loadResults: false`; full panel probes endpoints and loads inspector results on refresh.
- Webviews use strict CSP, no scripts, VS Code theme tokens, and ARIA labels.
- Closing the editor panel disposes webview state (no background timers).

## Related

- [Vision result inspector](./vision-result-inspector.md)
- [Vision providers](./vision-providers.md)
- [VISION-10 issue](https://github.com/The-Allsparks/ftc-dev-tools/issues/58)
- [VISION-11 issue](https://github.com/The-Allsparks/ftc-dev-tools/issues/59)
