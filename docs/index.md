---
layout: home

hero:
  name: FTC Dev Tools
  text: Build, deploy, and diagnose FTC robots
  tagline: Community CLI, VS Code/Cursor extension, and MCP server — from The Allsparks for students, coaches, and mentors.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: Troubleshooting
      link: /troubleshooting
    - theme: alt
      text: The Allsparks
      link: https://www.theallsparks.org
      target: _blank

features:
  - title: ftc doctor
    details: Environment checklist with student-friendly output and optional JSON for mentors helping online.
    link: /doctor
  - title: Build & deploy
    details: Gradle Wrapper builds and explicit ADB deploy — never silently picks a device when several are connected.
    link: /getting-started
  - title: Safety first
    details: No arbitrary commands from config, no silent Wi‑Fi changes, and explicit confirmation for network helpers.
    link: https://github.com/The-Allsparks/ftc-dev-tools/blob/main/README.md#safety-guarantees
---

> **Disclaimer:** Community-developed and unofficial. Not affiliated with or endorsed by FIRST, REV Robotics, Microsoft, Anysphere, or other referenced vendors.

## Current status

**Version 0.1.0** — Integrated CLI, VS Code/Cursor extension, and MCP server. Physical REV Control Hub compatibility is **not** claimed as fully validated yet; CI uses mocked devices. See [Feature maturity](./feature-maturity.md) and [Physical device testing](./physical-device-testing.md).

## Start here

| Goal | Guide |
| ---- | ----- |
| First-time setup | [Getting started](./getting-started.md) |
| Install JDK + SDK without Android Studio | [Install without Android Studio](./install-without-android-studio.md) |
| Install the `ftc` CLI | [CLI install](./cli-install.md) |
| Windows-specific tips | [Windows setup](./windows-setup.md) |
| Something failed | [Troubleshooting](./troubleshooting.md) |
| Environment checklist | [`ftc doctor`](./doctor.md) |

## Community

- [Report bugs or request features](https://github.com/The-Allsparks/ftc-dev-tools/issues)
- [Contributing](https://github.com/The-Allsparks/ftc-dev-tools/blob/main/CONTRIBUTING.md)
- [Security policy](https://github.com/The-Allsparks/ftc-dev-tools/blob/main/SECURITY.md)

Built by [The Allsparks](https://www.theallsparks.org) for our team and the wider FTC community.
