## Summary

Briefly describe what this PR changes and why.

## Product alignment

Answer briefly (link issues or docs where helpful):

1. **Student/mentor problem:** Which goal does this serve (build, deploy, diagnose, configure, vision, autonomous, …)?
2. **Friction reduction:** How does it reduce time on toolchain vs robotics?
3. **Wrap vs rewrite:** Should an existing authoritative tool own this instead?
4. **Upstream ownership:** What external system owns the underlying behavior?
5. **Validation evidence:** Mock / desktop / Control Hub / real users — what was tested?
6. **New assumptions:** Any new platform, language, framework, vendor, or tool lock-in?
7. **Mutation/safety risks:** Deploy, network, source, firmware, or config changes?
8. **Safe failure:** How do unsupported or ambiguous cases fail without silent damage?

See [docs/architecture/product-philosophy.md](../docs/architecture/product-philosophy.md).

## Type of change

- [ ] Bug fix
- [ ] New feature
- [ ] Documentation
- [ ] Tests only
- [ ] Chore / tooling

## Checklist

- [ ] I ran `npm run lint`
- [ ] I ran `npm run typecheck`
- [ ] I ran `npm test`
- [ ] I ran `npm run check:identity` (when docs/metadata changed)
- [ ] I updated docs if behavior changed
- [ ] No team credentials or private data are included
- [ ] No team number or package name is unnecessarily hard-coded
- [ ] Safety implications are documented
- [ ] Tests were added or updated where appropriate
- [ ] Physical validation status is stated honestly (mock / desktop / Control Hub / Driver Hub)
- [ ] Attribution and licensing are preserved (Apache-2.0; no CLA / copyright assignment required)
- [ ] I did not introduce automatic uninstall, silent firmware flash, or silent Wi-Fi mutation behavior

## Test plan

- [ ]
