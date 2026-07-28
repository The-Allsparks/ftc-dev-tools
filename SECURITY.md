# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |

## Reporting a vulnerability

Please do **not** open a public issue for security problems that could put robots, students, or machines at risk.

Prefer:

1. GitHub Security Advisories for this repository (when available), or
2. A private email contact published by the maintainers

Include:

- A description of the issue
- Steps to reproduce
- Impact assessment (for example: arbitrary command execution, unexpected device mutation)

## Safety expectations for this project

FTC Dev Tools intentionally avoids:

- Automatic application uninstall
- Firmware modification
- Android system setting changes
- Wi-Fi configuration changes
- Executing arbitrary commands from `.ftc-dev.json`

If you discover a path that bypasses these safeguards, treat it as a security issue.

## Secrets

Never store passwords, Wi-Fi credentials, API keys, or tokens in `.ftc-dev.json`, issues, or logs.

Prefer environment variables for sensitive values at runtime (for example Wi-Fi passwords used by the CLI).

### GitHub secret scanning

This repository uses GitHub **secret scanning** to detect known credential patterns in commits and issues.

Maintainers should confirm **push protection** is enabled so blocked secrets cannot be pushed:

1. Open [repository security settings](https://github.com/The-Allsparks/ftc-dev-tools/settings/security_analysis).
2. Under **Secret scanning**, enable **Push protection** if it is not already on.
3. For organization defaults, see [The-Allsparks security settings](https://github.com/organizations/The-Allsparks/settings/security_analysis).

Push protection applies to future pushes; it does not replace careful review of logs, release artifacts, or diagnostic bundles.
