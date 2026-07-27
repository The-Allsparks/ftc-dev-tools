# Robot Controller Console Wi-Fi manage API notes

FTC Dev Tools Phase 2 automates **read** and best-effort **apply** of Control Hub Wi-Fi settings via the Robot Controller Console (`http://192.168.43.1:8080`).

## Read (`ftc wifi manage get`)

1. GET `/` (connection info — often shows Network Name + Password)
2. GET `/manage` (Manage page form fields when present)
3. Parse HTML for SSID / password / band / channel labels and input values

Passwords are returned only in-memory to callers that need them; CLI `--json` emits `passwordSet: true|false` and **never** the secret.

## Apply (`ftc wifi manage set`)

Dry-run prints the planned fields. Real apply requires `--yes`.

POST candidates (form-urlencoded), tried in order:

1. `/network_settings`
2. `/manage/network_settings`
3. `/manage`
4. `/changeNetworkSettings`

Body field aliases include `deviceName` / `wifiName` / `name`, `password` / `passphrase`, `channel` / `apChannel`, `band` / `wifiBand`.

If no endpoint returns success (2xx/302/303), the tool reports `WIFI_MANAGE_API_UNSUPPORTED` and recommends `ftc wifi open-console`.

## Safety

- Explicit user confirmation (`--yes` / modal)
- No background AP mutation
- No passwords in `.ftc-dev.json`, logs, or manage get JSON
- Changing SSID/password **will disconnect** paired Driver Stations and programming laptops

## Versioning

RC web handlers evolve by season. When a new season breaks apply, update this file and the candidate list in [`packages/shared/src/wifi/manage-hub-wifi.ts`](../packages/shared/src/wifi/manage-hub-wifi.ts).
