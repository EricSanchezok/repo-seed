# Optimize tests for risk-adjusted evidence

## Status

Accepted
Class: testing

## Context and Problem Statement

repo-seed tells agents to test real entry paths, verify observable state, and mock only unstable boundaries, but its Core policy does not explicitly define test value, non-duplication, maintenance cost, or where each test tier belongs. An agent can satisfy “tests exist” by adding redundant assertions, mirroring implementation details, or chasing coverage without materially reducing repository risk. A cross-tool seed also cannot impose one directory tree on JavaScript, Python, Go, Rust, Java, and existing repositories without fighting their ecosystems.

## Decision Drivers

- Detect meaningful regressions with trustworthy evidence.
- Prefer the smallest test set that covers the repository's important contracts and failure modes.
- Keep tests stable under implementation-preserving refactors.
- Make ownership and placement discoverable while respecting stack conventions and adopted layouts.
- Avoid subjective or gameable deterministic gates.
- Keep advanced, costly test techniques proportional to actual risk.

## Considered Options

- Make risk-adjusted, minimum-sufficient evidence the Core testing strategy and instantiate project topology.
- Keep only the generic unit/integration/end-to-end tier descriptions.
- Enforce universal test counts or coverage thresholds.
- Seed every advanced testing technique into Core.

## Decision Outcome

Chosen option: make risk-adjusted, minimum-sufficient evidence the Core strategy. `docs/testing.md` owns the repository's test mission, risk-to-layer selection, actual test topology, test-double boundary, evidence rules, and maintenance policy. Root instructions keep only a compact standing order and link to that policy. Review evaluates whether each test protects an observable contract at the lowest sufficiently real boundary and whether another test already owns the same evidence. Coverage remains a diagnostic input, not a default target or gate. Stack conventions determine paths: colocated unit tests are valid where idiomatic, while cross-module and system tests live in named repository-level roots. Advanced techniques are adopted only when repository risk justifies their ongoing cost.

## Pros and Cons of the Options

Risk-adjusted Core guidance improves signal per test, makes Agent choices reviewable, and remains cross-stack; it requires project-specific instantiation and semantic review that no deterministic gate can fully prove. Keeping generic tiers is simple but leaves the central “which test and why” question unanswered. Universal counts or coverage thresholds are easy to measure but reward gaming and cannot distinguish valuable behavior evidence from incidental execution. Seeding every advanced technique provides defense in depth but imposes tooling, runtime, and maintenance costs on repositories that do not need them.

## Links

- [Risk-driven testing policy Spec](../specs/0001-risk-driven-testing-policy.md)
- [Testing policy](../testing.md)
- [Testing policy template](../../references/templates/docs/testing.md.tpl)
