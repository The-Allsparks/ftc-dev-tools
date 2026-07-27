# Contributing to FTC Dev Tools

Thanks for helping students build and deploy FTC robot code from VS Code, Cursor, and the terminal.

## Who can contribute

Contributors do not need to be members of The Allsparks.

We welcome contributions from FTC students, coaches, mentors, alumni, software developers, educators, and community members.

## Ways to contribute

- Fix bugs and improve student-friendly error messages
- Improve documentation for Windows, macOS, and Linux
- Add tests (especially mocked device scenarios)
- Report unsupported FTC project layouts
- Test on physical devices when you have access

## Student contributions

Student contributors are encouraged. Clear, well-tested changes from students are valuable, and students should receive proper attribution through Git history, pull requests, and — when they consent — [AUTHORS.md](AUTHORS.md).

Mentors and coaches may help students prepare contributions, but the contributor who authors the change should be credited.

## Team-specific versus reusable changes

Contributions should:

- avoid hard-coded team numbers
- avoid hard-coded package names
- avoid assumptions about one robot design
- avoid credentials and private data
- provide configuration where teams may differ
- document hardware assumptions
- distinguish mock tests from physical validation
- preserve safe defaults

See [docs/project-principles.md](docs/project-principles.md) and [docs/team-use.md](docs/team-use.md).

## Development setup

```bash
npm install
npm run build
npm test
npm run lint
npm run typecheck
npm run check:identity
```

Run the CLI locally:

```bash
node packages/cli/dist/bin.js doctor
```

Package the extension:

```bash
npm run package:extension
```

## Reporting an unsupported FTC project layout

Open a bug report and include:

1. Top-level directory listing of the project
2. Whether `settings.gradle` / `gradlew` exist
3. Where APKs are produced after a successful Android Studio build
4. Redacted `ftc doctor --json` output

## Adding a friendly error rule

1. Add a deterministic rule in `packages/shared/src/errors/interpret.ts`
2. Include `code`, student-friendly `title`/`summary`, and concrete `suggestedActions`
3. Add a unit test in `packages/shared/tests/errors.test.ts`
4. Do **not** use AI classification

## Adding operating-system support

1. Extend path helpers in `packages/shared/src/paths/os-paths.ts`
2. Cover the OS in unit tests
3. Document setup under `docs/`
4. Ensure CI still passes on Windows, macOS, and Linux

## Testing on a physical Control Hub

Follow `docs/physical-device-testing.md`. Never claim Control Hub compatibility in docs or release notes unless it was actually tested.

## Contributing without a robot

You can still help a lot:

- Improve docs and troubleshooting guides
- Expand mocked provider tests
- Improve error wording with screenshots/logs from teammates
- Review PRs for clarity and safety invariants

## Safety rules

Contributions must not:

- Automatically uninstall apps
- Change firmware, Android system settings, or Wi-Fi configuration
- Silently choose among multiple devices
- Execute arbitrary commands from `.ftc-dev.json`
- Delete user project files

## Licensing of contributions

By contributing, you agree that your contribution may be distributed under the project’s Apache License 2.0. You retain copyright in your contribution.

Do not submit content you do not have the right to license under Apache-2.0.

## Financial contributions

Financial contributions help support The Allsparks and the continued development of FTC Dev Tools.

They do not affect:

- pull request review
- issue priority
- feature acceptance
- maintainer decisions
- project governance

All technical contributions are evaluated using the same project standards.

Optional donation details: [SUPPORT.md](SUPPORT.md).

## Pull requests

Use the PR template. Keep changes focused. Prefer clear commits over large mixed patches.

## Community

Use GitHub Issues for bugs/features and GitHub Discussions (once enabled) for questions and design talk.

Project stewardship and decision-making: [GOVERNANCE.md](GOVERNANCE.md).
