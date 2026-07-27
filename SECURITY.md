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
