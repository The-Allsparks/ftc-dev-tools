# Project Principles

## Built from real team needs

Features should solve problems experienced by FTC students, coaches, mentors, and teams.

The Allsparks use FTC Dev Tools as an active development tool, so the project should remain practical rather than becoming a collection of speculative features.

## Useful beyond one team

The project originates from The Allsparks, but reusable features must not assume a particular team number, robot design, package name, operating system, hardware configuration, or programming style.

Team-specific behavior belongs in optional configuration or separate team repositories.

## Friendly to students

Errors, setup instructions, and workflows should be understandable to students who may be new to Java, Android development, Gradle, ADB, or command-line tools.

Technical details should remain available without being the only explanation presented.

## Compatible with the FTC ecosystem

FTC Dev Tools should work with official FTC SDK projects and established community tools rather than unnecessarily replacing them.

The project should integrate with existing Java, Gradle, testing, pathing, telemetry, and vision tools where practical.

## Safe by default

The project must avoid silent or destructive actions involving robot applications, Control Hubs, Driver Hubs, network settings, firmware, operating-system updates, or team source code.

Hardware-affecting actions must be explicit, reviewable, and appropriately tested.

## Community collaboration

Contributions from other teams and community members are welcome.

Decisions should consider the needs of the wider FTC community while preserving a maintainable and coherent project direction.

## Honest maturity

Mock-tested features, desktop-tested features, and physically validated robot features must be distinguished clearly.

The project must not claim Control Hub, Driver Hub, or competition-environment reliability until those workflows have been tested.

## Separation of public tooling and private team work

FTC Dev Tools contains reusable development tooling.

The Allsparks’ private robot code, strategy, credentials, network information, competition planning, and unreleased team-specific work belong in separate repositories and systems.
