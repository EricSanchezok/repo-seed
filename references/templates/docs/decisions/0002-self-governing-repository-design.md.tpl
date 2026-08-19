# Self-governing repository design

## Status
Accepted
Class: architecture

## Context and Problem Statement
A generated repository that is "documented" but ungoverned will drift: links rot, placeholder text survives, decisions get re-litigated, seeded files get edited silently, and process steps get skipped. Documentation alone does not prevent drift; a system of mechanical gates, hooks, and layered instruction does. Evidence from a production agent-harness repository (deepseek-harness) shows long-term governance is a system, not a single document: eleven in-repo skills, dozens of verifier scripts, git hooks, layered AGENTS.md files, a lifecycle decision log, and postmortems.

The open question: how much of that system should a seed repository get on day one, and in what shape, without coupling the seed to any one technology stack or any one vendor's tooling?

## Decision Drivers
- Anti-drift mechanisms must be mechanical: hooks and verifiers, not exhortation.
- The seed must be technology-stack agnostic: no generated build config, no generated CI.
- The seed must be cross-tool for agents: AGENTS.md and SKILL.md are the industry standards; no vendor-private extensions.
- Day-one scope must be a governance skeleton, not a full harness machine; the upgrade channel grows it.

## Considered Options
- Single-layer governance: one large AGENTS.md carrying everything, no gates.
- Harness-scale day one: port all 35+ gates, i18n pairing, coverage gates, vendoring policy.
- Five-layer governance skeleton plus an upgrade channel — the chosen route.

## Decision Outcome
The generated repository is governed by **five layers plus an upgrade channel**:

- **L0 — resident instructions**: root `AGENTS.md` (soft budget of 100 lines) plus `CLAUDE.md` that imports it via `@AGENTS.md`. Carries the governance loop hard rules and the security rules (never commit/push without explicit request).
- **L1 — deterministic gates and hook**: five zero-dependency verifiers (`verify-decisions`, `verify-doc-links`, `verify-placeholders`, `verify-manifest`, whitespace via `git diff --cached --check`) installed as a pre-commit hook by `scripts/install-hooks.mjs`.
- **L2 — unified decision log**: MADR records with the `Class:` extension (see [ADR 0000](0000-use-markdown-architectural-decision-records.md)), enforced by `verify-decisions`.
- **L3 — in-repo skills**: `repo-review` (per-project review policy: universal core plus blocking requirements and manual checks instantiated at seed time) and `repo-decisions` (decision-log authoring procedure), placed in `.agents/skills/`, discovered by all major agent tools.
- **L4 — process memory**: `docs/testing.md` policy, `docs/postmortems/` guidance and template, PR template checklist.
- **Upgrade channel**: `.repo-seed/manifest.json` records seeded-file hashes; re-running repo-seed refreshes untouched seeded files, preserves user edits, and never deletes user files.

### Consequences
- Good: drift and path-level hallucination are caught mechanically by hooks that run on every commit.
- Good: the seed is stack-agnostic and cross-tool; it adds no build configuration.
- Good: day-one scope is a skeleton, not a machine; heavier gates are added later through the upgrade channel as the repository matures.
- Trade-off: semantic correctness (does the prose say something true?) cannot be proven by gates; `repo-review` and the decision log's "what we gave up" discipline mitigate but cannot eliminate it. This is an industry-wide limit, not a repo-seed gap.

## Pros and Cons of the Options
### Single-layer governance
- Good: simplest possible seed.
- Bad: resident instructions have bounded capacity (context limits); no mechanical verification; process steps decay.

### Harness-scale day one
- Good: maximal rigor from the start.
- Bad: disproportionate for a new repository; couples the seed to a specific toolchain; violates the stack-agnostic constraint.

### Five-layer skeleton plus upgrade channel
- Good: mechanical anti-drift where it matters most; stack-agnostic; grows with the repository.
- Good: honest about the semantic-correctness limit.
- Bad: requires manifest/update machinery from day one.

## Links
- [ADR 0000](0000-use-markdown-architectural-decision-records.md) — the decision log standard.
- [ADR 0001](0001-repo-seed-is-a-skill-not-a-template.md) — why the generator shape is a skill.
- [.repo-seed/update-strategy.md](../../.repo-seed/update-strategy.md) — ownership and update semantics.
- [docs/AGENTS.md](../AGENTS.md) — the documentation standard (L0/L2 discipline).
