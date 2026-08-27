# Testing policy

Tests are executable evidence that a meaningful regression becomes visible before delivery. Optimize for risk-adjusted signal over the test's lifetime, not test count, line coverage, or assertion volume. Repository-wide entry commands live in the root [AGENTS.md](../AGENTS.md); this document owns test selection and topology.

## Test selection

Name the behavior or invariant at risk before writing a test. Choose the lowest boundary that can observe it with production-like composition: pure decisions belong in unit tests, module contracts and stateful boundaries in integration tests, and public entry points or cross-system flows in end-to-end tests. One behavior has one primary evidence home; add defense in depth only when a public contract, security boundary, migration, escaped incident, or similarly costly risk justifies the duplication.

| Risk shape | Primary evidence in this repository |
|---|---|
| Pure capability matching, hashing, path validation, lifecycle, or ordering | Focused unit cases in the owning `scripts/*.test.mjs` file |
| Scaffold planning/apply, manifests, filesystem preservation, hooks, worktrees, and verifier composition | Integration cases using real modules and temporary repositories |
| The installed seed, CLI entry point, or manifest-selected governance loop | End-to-end cases that run the real CLI and gates, then inspect repository state |
| Agent-facing instructions and generated policy | Semantic review plus targeted template/instantiation assertions and deterministic link, placeholder, and manifest gates |

## Test topology

- `scripts/*.test.mjs` stays beside the executable module it owns; the filename mirrors the module where practical.
- `scripts/governance.test.mjs` owns cross-module capability, adoption, authorization, and fresh-seed scenarios.
- Tests create isolated repositories under the operating system temporary directory and remove them after each case. A fixture stays beside its owning test unless multiple contracts genuinely share it.
- The root Test command runs the behavioral suite. The root Gates command runs repository governance verification and is not a substitute for behavior tests.

## Evidence rules

- Assert observable outcomes: return values, errors, persisted state, files, process exit status, or externally visible side effects. Internal call counts and private ordering are evidence only when they are themselves a contract.
- Test the real entry path where packaging, process setup, configuration, or wiring can fail. A hand-wired harness cannot prove the shipped entry point works.
- Mock only expensive or non-deterministic boundaries such as the network, clock, or an external API; keep owned composition downstream of that boundary real.
- Select representative equivalence classes, boundaries, invalid inputs, state transitions, and recovery points instead of enumerating incidental examples.
- A regression test fails for the escaped behavior before the fix and passes afterward. It proves the cause, not merely that some nearby output changed.
- When a change should preserve a file or state, assert it remains byte-identical or semantically identical as the contract requires.

## Maintenance budget

- Coverage reports locate unobserved code; they are not a target and do not establish test quality.
- Remove or merge tests when their behavior disappears, another test becomes the primary evidence, or they constrain implementation without protecting a contract.
- A flaky test is a broken signal. Fix its uncontrolled boundary or quarantine it with an owner and repair condition; never normalize blind retries.
- Keep the fast path focused enough for local use. Expensive techniques such as fuzzing, mutation, visual regression, load testing, and large environment matrices require a repository risk that pays for their continuing cost.

## When a test is required

Every behavior change adds or updates the smallest test set that proves its affected contract. Every bug fix carries a regression test unless the failure is already deterministically reproduced by an existing test; document that existing evidence when no new test is needed. Documentation-only and mechanical changes use the relevant semantic review and gates rather than manufacturing behavior tests.
