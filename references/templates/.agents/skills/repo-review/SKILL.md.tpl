---
name: repo-review
description: Use when reviewing a pull request or a change in this repository — orients the reviewer to this repository's standards (AGENTS.md conventions, decision log, gates) and the review-specific checks that code alone cannot show
---

# Reviewing a change in this repository

**This skill is guidance, not a complete checklist.** Review the change against the repository's actual state: read the diff, the owning docs, the decision log, and enough surrounding code to understand the design. Prioritize correctness, lifecycle, security, and broken required behavior over style.

## Sources of truth

- [AGENTS.md](../../../AGENTS.md): standing repository rules.
- [docs/AGENTS.md](../../../docs/AGENTS.md): documentation placement and prose discipline.
- [docs/decisions/](../../../docs/decisions/README.md): design rationale. Disagreement with a decision record is a design discussion, not an automatic veto.
- [docs/testing.md](../../../docs/testing.md): required test tiers.
- [docs/architecture.md](../../../docs/architecture.md): the module map and seams.

## Blocking requirements

1. **New prose receives semantic review.** Critically review every added or changed Markdown passage, JSDoc, comment, prompt, description, diagnostic, and visible string. Verify required coverage, accuracy, placement, and editorial quality against the owning code or behavior; automated checks do not establish those properties.
2. **Docs match the code.** Config, defaults, errors, wire fields, events, and public behavior update the owning docs and JSDoc in the same diff.
3. **Decisions are recorded.** A non-trivial change adds or updates a decision record in `docs/decisions/` (see the `repo-decisions` skill). Flag a missing record.
4. **Tests exist for the behavior.** A behavior change carries a test in the same change; a fix without a regression test is a rumor.
5. **Gates are green.** The author ran the gates (`node scripts/verify-decisions.mjs && node scripts/verify-doc-links.mjs && node scripts/verify-placeholders.mjs && node scripts/verify-manifest.mjs`) and the relevant tests.

## Manual checks

- **Intent and interface contracts:** trace both sides of every changed interface. Confirm the implementation matches the change and any decision record, including errors, cancellation, ownership, and disposal.
- **Lifecycle and concurrency:** for async setup, callbacks, processes, or teardown, check races before publication, cancellation during awaits, independent error reporting, and complete cleanup.
- **Scope and necessity:** map each abstraction, option, defensive copy, and compatibility path to its current contract and consumer. Challenge unrelated features and speculative generality.
- **Model perspective (if the change is agent-facing):** inspect the exact prompts, tool schemas, results, and diagnostics a model receives across affected modes. Flag concepts outside the task, then verify stable text verbatim and dynamic behavior through tests.
- **Bounds cover the final operation:** probe tiny and exact limits, oversized chunks, and multibyte text for byte limits.
- **Real entry path:** tests exercise the shipped binary, module, or process where relevant; a hand-wired harness does not catch a broken entry point.
