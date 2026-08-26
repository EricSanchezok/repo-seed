# Separate change contracts from durable decisions

## Status
Accepted
Class: process

## Context and Problem Statement
repo-seed used MADR records for every non-trivial change while treating Specs as an optional extension. That made one artifact serve two incompatible jobs: a change contract must state the intended behavior and proof for current work, while a decision record must preserve why one durable alternative beat another. Requiring ADRs for all substantive changes creates ceremonial records with invented alternatives; leaving Specs optional loses intent across agent, session, module, migration, and security handoffs.

## Decision Drivers
- Risk-boundary work needs a human-approved, version-controlled artifact before implementation.
- Routine fixes and mechanical changes must remain cheap.
- Observable contract and completion evidence must survive longer than an agent session.
- Durable rationale must remain concise enough to be worth reading and revisiting.
- Existing unversioned artifacts need a gradual migration path.

## Considered Options
- Keep ADRs mandatory for every non-trivial change and leave Specs optional.
- Require a Spec for every repository change.
- Make risk-triggered Spec a Core change-contract tier and reserve ADRs for choices with meaningful alternatives — the chosen route.

## Decision Outcome
Spec is a Core repo-seed capability. A Spec is required before implementation when a change affects public or model-visible behavior, a cross-module contract, a data or security boundary, a migration, or a handoff across people, agents, or sessions. Routine documentation fixes, mechanical refactors, and local bugs already defined by a failing regression test are exempt.

Spec v1 uses `Draft → Approved → Implemented → Superseded` and contains Intent, Contract, Plan, Verification, and Evidence. An agent may draft it; a human approves it. Implemented Specs link permanent repository evidence.

MADR records are created only when a change selects among meaningful alternatives whose rationale may be revisited. Commits retain change history; postmortems retain failure history. `verify-specs.mjs` enforces new or materially changed v1 records while path-and-hash grandfathering preserves unchanged legacy artifacts.

### Consequences
- Good: a future agent can recover what was approved and how it was proven without reconstructing a chat.
- Good: decision records regain signal because they contain real alternatives rather than change-log entries.
- Good: routine work carries no new document tax.
- Trade-off: reviewers must exercise judgment at the risk-trigger boundary.
- Trade-off: external requirement systems require explicit source-of-truth configuration during adoption.

## Pros and Cons of the Options
### ADR for every non-trivial change
- Good: every substantive change produces a durable artifact.
- Bad: observable contracts, plans, and rationale blur together; artificial alternatives accumulate.

### Spec for every change
- Good: uniform workflow and maximum traceability.
- Bad: routine fixes become ceremony, encouraging stale or low-quality Specs.

### Risk-triggered Spec plus selective ADR
- Good: each artifact has one first-principles job and the documentation cost follows risk.
- Bad: risk classification is semantic and cannot be fully automated.

## Links
- [Anthropic, “The AI-Native SDLC playbook”](https://claude.com/blog/the-ai-native-sdlc-playbook) — version-controlled intent/spec/plan artifacts, human approval gates, and continuous evidence inspired the artifact chain; accessed 2026-08-26.
- [Spec standard](../specs/README.md) — lifecycle, trigger, and v1 shape.
- [Decision standard](README.md) — selective MADR trigger and lifecycle.
- [Progressive governance Spec](../specs/0000-progressive-ai-native-governance.md) — approved contract implemented by this decision.
