# Wi-Fi and dual-NIC setup

FTC Dev Tools helps you deploy to a Control Hub over **wireless adb** while keeping your IDE PC online on another network adapter (ethernet or a second Wi-Fi dongle).

## Typical dual-NIC workflow

1. Connect **ethernet** (or your main Wi-Fi) for internet / Cursor / Gradle downloads.
2. Select the adapter that will talk to the hub:

```bash
ftc wifi interfaces
ftc wifi use-interface "Wi-Fi 2"
```

3. Join the Control Hub SSID on that adapter (password via env — never `.ftc-dev.json`):

```bash
set FTC_WIFI_PASSWORD=your-hub-password
ftc wifi join --ssid FTC-XXXX --password-env FTC_WIFI_PASSWORD --yes
```

4. Add a **hub-subnet-only** route (may need an elevated terminal on Windows):

```bash
ftc wifi route ensure --yes
```

5. Connect wireless adb and deploy:

```bash
ftc wifi connect --yes
ftc devices
ftc deploy
```

## Commands

```bash
ftc wifi status [--json]
ftc wifi interfaces [--json]
ftc wifi use-interface <name|index>
ftc wifi join --ssid NAME --password-env FTC_WIFI_PASSWORD --yes
ftc wifi route ensure [--subnet 192.168.43.0/24] --yes
ftc wifi route remove --yes
ftc wifi connect [192.168.43.1:5555] [--yes] [--no-route]
ftc wifi disconnect [--all]
ftc wifi enable-tcpip --device SERIAL --yes
ftc wifi open-console [--url http://192.168.43.1:8080]
ftc wifi manage get [--json]
ftc wifi manage set --ssid NAME --password-env VAR [--band ...] [--channel ...] --dry-run
ftc wifi manage set --ssid NAME --password-env VAR --yes
ftc wifi prefer-internet <iface> [--robot <name>] [--dry-run|--yes]
ftc wifi prefer-robot [iface] [--no-route] [--dry-run|--yes]
ftc wifi adapter enable <name> [--dry-run|--yes]
ftc wifi adapter disable <name> [--force] [--dry-run|--yes]
```

## Stay online (metrics + adapters)

On dual-NIC setups, prefer a low metric on the internet adapter and a higher metric on the robot NIC so default traffic stays online while hub traffic uses the subnet route:

```bash
ftc wifi prefer-internet Ethernet --robot "Wi-Fi 2" --dry-run
ftc wifi prefer-internet Ethernet --robot "Wi-Fi 2" --yes
ftc wifi prefer-robot --yes
```

Defaults: internet metric **10**, robot metric **50**. Phase 3 does not remove default gateways (`--adjust-gateway` only notes that).

Enable/disable adapters explicitly (refuses disabling the last up non-loopback NIC unless `--force`):

```bash
ftc wifi adapter disable "Wi-Fi" --yes
ftc wifi adapter enable Ethernet --yes
```

## Hub Wi-Fi manage (Apply Wi-Fi Settings)

Read current settings from the Robot Controller Console (password never printed in JSON):

```bash
ftc wifi manage get --json
```

Preview / apply SSID, password, band, or channel. **Applying disconnects Driver Stations and laptops** from the hub AP:

```bash
ftc wifi manage set --ssid FTC-12345-RC --password-env FTC_WIFI_PASSWORD --dry-run
ftc wifi manage set --ssid FTC-12345-RC --password-env FTC_WIFI_PASSWORD --yes
```

If this Robot Controller build does not accept the known console POST endpoints, the command fails with `WIFI_MANAGE_API_UNSUPPORTED` and you should use `ftc wifi open-console` to Apply Wi-Fi Settings manually. Details: [wifi-manage-api.md](wifi-manage-api.md).

## Credentials

| Store                   | What                                                            |
| ----------------------- | --------------------------------------------------------------- |
| `.ftc-dev.json`         | **Never** passwords (schema rejects them)                       |
| `wifi.json` preference  | Robot NIC name, remembered **SSID only**                        |
| `wifi-secrets.enc`      | Machine-local AES-GCM encrypted passwords (hostname+user keyed) |
| Env `FTC_WIFI_PASSWORD` | Preferred one-shot password source                              |

## Defaults

| Item                     | Value                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------ |
| Wireless adb             | `192.168.43.1:5555`                                                                  |
| Robot Controller Console | `http://192.168.43.1:8080`                                                           |
| Hub subnet route         | `192.168.43.0/24`                                                                    |
| Preference file          | `%APPDATA%/ftc-dev-tools/wifi.json` (Windows) or `~/.config/ftc-dev-tools/wifi.json` |

## Extension

- **FTC: Prefer Internet Interface** / **Prefer Robot Interface**
- **FTC: Enable / Disable Network Adapter**
- **FTC: Join Robot Wi-Fi**
- **FTC: Get Hub Wi-Fi Settings**
- **FTC: Manage Hub Wi-Fi**
- Plus Phase 1: Wi-Fi Status, Select Robot NIC, Ensure Route, Connect/Disconnect ADB, Open Console

## Doctor

Optional checks (never fail overall readiness alone):

- Robot Controller Console reachable
- Robot network interface selected

## Troubleshooting

| Problem                      | Try                                                                    |
| ---------------------------- | ---------------------------------------------------------------------- |
| Join fails                   | Confirm SSID/password; correct robot NIC; elevated terminal on Windows |
| Manage set unsupported       | `ftc wifi open-console` and apply manually                             |
| Console unreachable          | Join hub SSID; `ftc wifi route ensure --yes`                           |
| Internet drops               | Dual NIC + `prefer-internet` / `prefer-robot` + route ensure           |
| Metric change denied         | Elevated terminal; `--yes`; check `ftc wifi interfaces`                |
| Last adapter disable refused | Enable another NIC first, or pass `--force`                            |
