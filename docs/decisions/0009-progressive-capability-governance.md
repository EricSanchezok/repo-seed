# Govern repository capabilities through progressive state

## Status
Accepted
Class: architecture

## Context and Problem Statement
Static extension packs answer what a repository wants at first seed but not what it needs after months of growth. Re-running with an omitted flag can no longer distinguish “not requested this time” from “disable this control,” and an agent has no durable way to remember that a capability was declined because an equivalent system already exists. Unmanaged repositories add another constraint: existing AGENTS, ADR/RFC, CI, hook, and external requirements systems must be adopted without manufacturing duplicate authorities.

## Decision Drivers
- Governance cost must grow with observed complexity and risk rather than project age or a maximal profile.
- Agents need enough resident policy to notice new governance signals during ordinary development.
- Read-only discovery should be autonomous; repository and external-system mutation requires user authority.
- Declined or deferred advice must not repeat against unchanged facts.
- Existing systems and non-standard paths must remain valid sources of truth.
- v0.4 manifests and extension flags must upgrade additively.

## Considered Options
- Keep file-only extension packs and require users to remember which flags to repeat.
- Automatically enable capabilities when repository signals match.
- Use a stateful capability catalog with assessment hashes, authority boundaries, and adoption configuration — the chosen route.

## Decision Outcome
`scripts/capabilities.mjs` is the single `CapabilityDefinition` catalog. Each definition declares its Core or optional tier, files, prerequisites, applicability and equivalent-system signals, benefit, ongoing cost, blocking/advisory urgency, AGENTS/review/gate contributions, and enable/upgrade/re-evaluation conditions. `extensionPacks()` and `--extensions` remain compatibility projections. Spec is Core, so legacy `--extensions spec` is an accepted no-op.

The manifest records `enabled`, `external`, `deferred`, or `declined` state. Deferred and declined states retain a hash over normalized relevant facts and assessment model version; advice remains suppressed until that hash changes. Enabled capabilities remain managed when later invocations omit legacy flags.

The resident `repo-governance` skill authorizes agents to run audits, compare state, and create dry-runs. Blocking recommendations are raised before affected work; advisory maturity suggestions appear at handoff. Enabling capabilities, installing hooks, changing policy/source-of-truth, connecting an external system, or changing remote permissions requires user authority.

Unmanaged adoption detects compatible repository paths and external systems, registers them in `governance.paths` and `governance.externalSources`, and adds only missing Core surfaces after a dry-run and user confirmation. Existing compatible content is user-owned or external. Generic links support issue and requirements systems without connector access.

### Consequences
- Good: governance can grow midstream without a second initialization event or repeated prompts.
- Good: existing systems satisfy capability needs without forced migration.
- Good: the manifest becomes durable memory for both capability presence and user intent.
- Trade-off: the catalog and assessment rules become a compatibility surface that needs tests.
- Trade-off: unmanaged repositories still depend on the global repo-seed skill being installed and discoverable.

## Pros and Cons of the Options
### File-only extension flags
- Good: minimal implementation and familiar CLI behavior.
- Bad: no applicability model, no remembered rationale, and omitted flags are ambiguous.

### Automatic signal-driven enablement
- Good: repositories acquire controls without maintainer effort.
- Bad: it mutates policy, workflows, and local/external state without the accountable human decision required at governance gates.

### Stateful capability catalog
- Good: combines autonomous discovery, deliberate authority, equivalent-system reuse, and safe upgrades.
- Bad: requires normalized facts, migrations, and lifecycle tests.

## Links
- [Supersedes ADR 0004](0004-optional-extensions-core-minimal.md) — replaces static optional packs as the primary model while retaining its CLI compatibility surface.
- [Anthropic, “The AI-Native SDLC playbook”](https://claude.com/blog/the-ai-native-sdlc-playbook) — modular adoption, skills as institutional knowledge, and explicit legacy-system source-of-truth choices informed the catalog and adoption model; accessed 2026-08-26.
- [Capability catalog](../../scripts/capabilities.mjs) — executable definitions and assessment hashes.
- [Resident governance skill](../../.agents/skills/repo-governance/SKILL.md) — timing and authorization procedure.
- [Update strategy](../../references/update-strategy.md) — ownership and state preservation.
