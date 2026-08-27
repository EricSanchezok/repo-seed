# Architecture

repo-seed has one deterministic engine and two instruction layers. The global [skill entry](../SKILL.md) drives analysis, authorization, instantiation, and verification; `scripts/` owns repository state transitions; `references/templates/` owns seeded prose. A target repository receives copies of the relevant scripts and instantiated templates, then tracks them in its manifest.

## Module map

- [`SKILL.md`](../SKILL.md) — cross-tool orchestration contract. It decides when read-only discovery is autonomous and when user authorization is required.
- [`scripts/scaffold.mjs`](../scripts/scaffold.mjs) — plan/apply/record engine, backward-compatible extension CLI, capability-state transitions, adoption path discovery, and optional hook installation.
- [`scripts/capabilities.mjs`](../scripts/capabilities.mjs) — the `CapabilityDefinition` catalog, stable assessment hashes, equivalent-system detection, and recommendation suppression.
- [`scripts/audit-governance.mjs`](../scripts/audit-governance.mjs) — read-only fact collection and capability assessment. It never connects to a network or writes repository state.
- [`scripts/governance-config.mjs`](../scripts/governance-config.mjs) — manifest-driven paths and grandfathering hashes for progressively enforced artifact formats.
- [`scripts/run-gates.mjs`](../scripts/run-gates.mjs) — single execution path for installed governance gates. CI, contribution guidance, and managed hooks call this runner.
- `scripts/verify-*.mjs` — deterministic format, link, manifest, Spec, postmortem, and commit-message gates. `verify-commit-msg` remains a commit-msg-stage gate and is not part of the general runner.
- [`scripts/install-hooks.mjs`](../scripts/install-hooks.mjs) — authorized local Git mutation. Managed hooks are refreshable; custom hooks are preserved; runtime root discovery keeps worktrees correct.
- [`references/templates/AGENTS.md.tpl`](../references/templates/AGENTS.md.tpl) — representative canonical generated content. `seededFiles()` is the canonical target-path inventory; the template tree provides content for those paths.
- [`references/update-strategy.md`](../references/update-strategy.md) — part of the interview, decision, documentation, review, and update contracts read by the global skill.
- [`.agents/skills/repo-governance/SKILL.md`](../.agents/skills/repo-governance/SKILL.md) — one of the repository-resident review, decision, and governance procedures used after adoption.
- [`docs/specs/`](specs/README.md), [`docs/decisions/`](decisions/README.md), and [`docs/postmortems/`](postmortems/README.md) — change contract, durable rationale, and incident feedback tiers.
- [`.repo-seed/manifest.json`](../.repo-seed/manifest.json) — downstream ownership, capability state, configurable governance paths, external source-of-truth links, and gradual artifact policy.

## Seams and invariants

The capability catalog is the only place that defines applicability signals, equivalent systems, benefit/cost, urgency, file contributions, review contributions, and gate contributions. `extensionPacks()` is a compatibility projection; new behavior must not create a second extension registry.

Planning is read-only. `planRun()` may inspect files and return create/update/keep/skip actions, but only `applyPlan()` writes governed files. A dry-run never calls the hook installer or writes a manifest.

The manifest mediates upgrades. An untouched managed file may refresh automatically; a user-modified or user-owned file is preserved. Omitting an enabled capability from a later CLI invocation does not disable it. Capability enabling, hook installation, policy/source-of-truth changes, and external connections require explicit user authority.

Root AGENTS is the resident governance router. It identifies the manifest-backed management boundary and routes ordinary review, decisions, and governance evolution to local procedures; the global repo-seed skill owns only seeding, adoption, upgrades, and upstream repair.

Adoption has one source of truth per artifact. Existing compatible AGENTS, architecture, test, ADR/RFC, incident, CI, or hook systems are detected and registered as external or user-owned; the scaffold fills missing Core surfaces without cloning their facts into a canonical path.

Artifact enforcement is progressive. Existing unversioned Specs and postmortems are accepted only at their recorded path and hash. New or materially changed records use Artifact-Version 1.

## Change procedure

1. Trace the relevant seam and its downstream copies in the seeded repository.
2. For a risk-boundary change, update an Approved [Spec](specs/README.md). Add a [decision record](decisions/README.md) only when the change selects among durable alternatives.
3. Update source scripts, templates, dogfood copies, manifest metadata, and the smallest sufficient behavior evidence together.
4. Run the affected tests and [`node scripts/run-gates.mjs`](../scripts/run-gates.mjs).
