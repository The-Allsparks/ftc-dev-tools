# Project Governance

## Project stewardship

FTC Dev Tools was founded by **The Allsparks** and is maintained as an open-source project for both The Allsparks team and the wider FIRST Tech Challenge community.

The Allsparks serve as the project’s founding stewards and are responsible for:

- maintaining the project’s overall direction
- reviewing and merging contributions
- managing releases
- protecting project safety and compatibility
- maintaining project infrastructure
- coordinating physical testing on FTC hardware
- ensuring that team-specific needs do not unnecessarily limit community use

## Community participation

Students, coaches, mentors, alumni, software developers, and FTC community members may participate through:

- bug reports
- feature requests
- documentation improvements
- code contributions
- platform testing
- Control Hub and Driver Hub validation
- accessibility feedback
- translations
- design discussions

Contributors do not need to be members of The Allsparks.

## Decision making

Routine technical decisions may be made through pull-request review and normal maintainer discussion.

Larger decisions should be documented when they affect:

- public APIs
- project architecture
- hardware safety
- supported FTC SDK versions
- package names
- licensing
- data collection
- network behavior
- firmware or operating-system management
- compatibility with existing FTC community tools

Maintainers should seek community input for substantial changes, but final responsibility for project direction remains with the project maintainers.

GitHub **issue labels** (priority, surface, vision sub-areas) are documented in [docs/issue-labels.md](docs/issue-labels.md) and enforced in CI via `scripts/issue-label-catalog.json`.

## Maintainer expectations

Maintainers are expected to:

- act respectfully and constructively
- explain major decisions
- disclose relevant conflicts of interest
- avoid using community contributions solely for private team advantage
- preserve attribution
- prioritize student and robot safety
- avoid unsupported claims about hardware compatibility
- maintain clear separation between community tooling and private team robot code

## Becoming a maintainer

Regular contributors may be invited to become maintainers based on sustained, constructive participation and demonstrated understanding of the project’s technical and safety requirements.

Maintainer status is based on contribution and trust, not team membership alone.

## Team-specific development

The Allsparks may use unreleased or experimental functionality internally.

Team-specific robot code, strategy, credentials, device settings, network passwords, and private operational information must remain outside this public repository.

Features intended for inclusion in FTC Dev Tools must be generalized, documented, reviewed, and safe for use by other teams.

## Financial independence

The project’s technical direction is determined through the project’s governance process.

Financial contributions do not purchase influence over:

- architecture
- roadmap
- releases
- maintainership
- issue priority
- pull request acceptance

Optional support for The Allsparks is documented in [SUPPORT.md](SUPPORT.md) and does not change these rules.

## Independence and trademarks

FTC Dev Tools is a community-developed project. It is not officially affiliated with or endorsed by FIRST, REV Robotics, Microsoft, Anysphere, or other referenced organizations.

FIRST®, FIRST Tech Challenge®, FTC®, REV Robotics®, Visual Studio Code®, and Cursor® may be trademarks of their respective owners. Their names are used only to describe compatibility and intended use.
