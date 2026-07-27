# Device connections

## What FTC Dev Tools talks to

Any Android device visible to `adb` can appear in `ftc devices`. That includes:

- REV Control Hubs
- Android Robot Controller phones
- Emulators
- Other developer phones

The tools **do not assume** every Android device is a Control Hub.

When properties look like a REV Control Hub, the UI may say **probable Control Hub**. That label is best-effort and **never guaranteed**.

## USB

1. Use a data-capable cable
2. Connect the device
3. Unlock the screen if needed
4. Accept USB debugging authorization
5. Run `ftc devices`

## Wi-Fi ADB and dual-NIC

For wireless deploy to a Control Hub:

1. Join the hub SSID on the **robot network adapter** (often a USB Wi-Fi dongle when ethernet carries internet).
2. Run `ftc wifi use-interface`, `ftc wifi route ensure --yes`, and `ftc wifi connect --yes`.
3. Deploy with `ftc deploy` as usual.

See [wifi.md](wifi.md) for the full dual-NIC stay-online guide. Serials often look like `192.168.43.1:5555`.

FTC Dev Tools can list interfaces, join the hub SSID, add hub-subnet routes, adjust interface metrics, connect wireless adb, manage hub Wi-Fi settings (best-effort), and open the Robot Controller Console. Firmware helpers are not automatic.

## Multiple devices

If more than one usable device is connected:

```bash
ftc deploy --device SERIAL
```

There is no silent default selection.

## Unauthorized / offline

- **unauthorized**: accept the debugging prompt; revoke authorizations if the prompt never appears
- **offline**: reconnect cable, restart adb (`adb kill-server` then `adb start-server`)
