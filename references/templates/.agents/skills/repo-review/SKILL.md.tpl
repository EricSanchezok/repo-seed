---
name: repo-review
description: Use when reviewing a pull request or a change in this repository — orients the reviewer to this repository's standards (AGENTS.md conventions, decision log, gates) and the review-specific checks that code alone cannot show
---

# Reviewing a change in this repository

Read the diff, the owning docs, the decision log, and enough surrounding code to understand the design before judging it. **Blocking requirements** are hard: a violation blocks the change. **Manual checks** rank remaining risk by this project's real failure modes — apply the ones the change touches, not every one, to every change.

## Sources of truth

- [AGENTS.md](../../../AGENTS.md): standing repository rules.
- [docs/AGENTS.md](../../../docs/AGENTS.md): documentation placement and prose discipline.
- [__DECISIONS_PATH__/](../../../__DECISIONS_PATH__/): durable design rationale. Disagreement with a decision record is a design discussion, not an automatic veto.
- [__SPECS_PATH__/](../../../__SPECS_PATH__/): risk-triggered change contracts.
- [__TESTING_PATH__](../../../__TESTING_PATH__): required test tiers.
- [__ARCHITECTURE_PATH__](../../../__ARCHITECTURE_PATH__): the module map and seams.

## Blocking requirements

### Universal (applies to any repository)

1. **New prose receives semantic review.** Critically review every added or changed Markdown passage, JSDoc, comment, prompt, description, diagnostic, and visible string. Verify required coverage, accuracy, placement, and editorial quality against the owning code or behavior; automated checks do not establish those properties.
2. **Docs match the code.** Config, defaults, errors, wire fields, events, and public behavior update the owning docs and JSDoc in the same diff.
3. **Contracts and decisions use the right artifact.** A risk-boundary change has an Approved spec; a durable choice with real alternatives has a decision record. Do not demand an ADR as a change log.
4. **Tests exist for the behavior.** A behavior change carries a test in the same change; a fix without a regression test is a rumor.
5. **External-source provenance is retained.** If implementation is materially derived from a paper, article, community post, benchmark, research report, or copied/adapted code, cite it at the closest stable code location or link that location to a decision record whose `## Links` cites the source. A pull request, issue, prompt, or chat-only citation does not count; copied or adapted material also preserves applicable license and NOTICE requirements.

### Project-specific (instantiated at seed time from this project's own rules)

__REVIEW_PROJECT_BLOCKING__

## Manual checks

### Project-specific (instantiated at seed time from this project's stack and known failure modes)

__REVIEW_PROJECT_CHECKS__

### Universal fallbacks (apply where the project has no specific rule)

- **Intent and interface contracts:** trace both sides of every changed interface. Confirm the implementation matches the change and any decision record, including errors, cancellation, ownership, and disposal.
- **Lifecycle and concurrency:** for async setup, callbacks, processes, or teardown, check races before publication, cancellation during awaits, independent error reporting, and complete cleanup.
- **Scope and necessity:** map each abstraction, option, defensive copy, and compatibility path to its current contract and consumer. Challenge unrelated features and speculative generality.
- **Bounds cover the final operation:** probe tiny and exact limits, oversized chunks, and multibyte text for byte limits.
- **Real entry path:** tests exercise the shipped binary, module, or process where relevant; a hand-wired harness does not catch a broken entry point.
