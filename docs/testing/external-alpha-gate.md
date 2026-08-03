# External alpha release gate

Criteria for inviting **outside teams** to try FTC Dev Tools on the golden path. Do not claim external validation until teams have actually completed runs and reports exist.

---

## Minimum gate (required before external alpha)

All items must be true:

| #   | Requirement                                                                  | Evidence                                                                                                         |
| --- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | Documented successful physical Control Hub **build → deploy → log** workflow | Dated [hardware test report](hardware-test-report-template.md) + [validation matrix](validation-matrix.md) row   |
| 2   | Repeatable install procedure                                                 | [Golden-path protocol](golden-path.md) §Installation; [Getting started](../getting-started.md)                   |
| 3   | Clear version reporting                                                      | `ftc validation env`, `ftc --version`, extension version in env snapshot                                         |
| 4   | Redacted failure-report process                                              | `ftc validation bundle collect --redact` documented and tested                                                   |
| 5   | No silent multi-device selection                                             | `any-multi-device-selection` checklist pass                                                                      |
| 6   | Actionable failure messages for common setup problems                        | Doctor + friendly errors; regression tests with fixtures                                                         |
| 7   | At least one **repeated-cycle** test without repository intervention         | Protocol §G.1 (incremental rebuild) pass report                                                                  |
| 8   | Alpha limitations clearly documented                                         | [Supported alpha configuration](supported-alpha-configuration.md), [feature-maturity.md](../feature-maturity.md) |
| 9   | Experimental features separated from golden path                             | Maturity table marks experimental/deferred surfaces                                                              |

**Current status:** Gate **not met** — no dated Control Hub hardware reports in repository.

---

## Recommended later target (not required for first alpha)

Track toward but do not block initial alpha on:

| Target                                         | Purpose                                       |
| ---------------------------------------------- | --------------------------------------------- |
| 3–5 external teams                             | Diversity of project layouts and skill levels |
| Multiple Windows computers                     | Install reproducibility                       |
| Multiple Control Hubs                          | USB/ADB variance                              |
| ≥ 100 cumulative build/deploy/log cycles       | Reliability signal                            |
| Final attempts without maintainer intervention | Student-ready tooling                         |

---

## How to record external validation

1. Team completes [golden-path protocol](golden-path.md) using [supported alpha configuration](supported-alpha-configuration.md).
2. Team submits [hardware test report](hardware-test-report-template.md) (no PII) via issue or maintainer channel.
3. Maintainer updates [validation matrix](validation-matrix.md) and `checklists.ts` evidence dates.
4. Release notes state **external alpha** scope honestly — which teams, which dates, which limitations remain.

Do **not** label features `Multi-team field tested` or `Stable` without meeting [feature-maturity.md](../feature-maturity.md) criteria.

---

## Maintainer checklist before sending invites

- [ ] `ftc validation status` shows hardware checklists pending only where expected
- [ ] Known blockers filed as GitHub issues with regression tests
- [ ] Alpha VSIX/CLI build published with version lock guidance
- [ ] Teams have mentor contact for blocked runs
- [ ] Feedback template shared ([hardware test report](hardware-test-report-template.md))

---

## Related

- [Golden-path test protocol](golden-path.md)
- [Validation matrix](validation-matrix.md)
- [Product philosophy — golden path metrics](../architecture/product-philosophy.md)
