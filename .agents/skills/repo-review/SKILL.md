---
name: repo-review
description: Use when reviewing a pull request or a change in this repository — orients the reviewer to this repository's standards (AGENTS.md conventions, decision log, gates) and the review-specific checks that code alone cannot show
---

# Reviewing a change in this repository

Read the diff, the owning docs, the decision log, and enough surrounding code to understand the design before judging it. **Blocking requirements** are hard: a violation blocks the change. **Manual checks** rank remaining risk by this project's real failure modes — apply the ones the change touches, not every one, to every change.

## Sources of truth

- [AGENTS.md](../../../AGENTS.md): standing repository rules.
- [docs/AGENTS.md](../../../docs/AGENTS.md): documentation placement and prose discipline.
- [docs/decisions/](../../../docs/decisions/README.md): design rationale. Disagreement with a decision record is a design discussion, not an automatic veto.
- [docs/testing.md](../../../docs/testing.md): required test tiers.
- [docs/architecture.md](../../../docs/architecture.md): the module map and seams.

## Blocking requirements

### Universal (applies to any repository)

1. **New prose receives semantic review.** Critically review every added or changed Markdown passage, JSDoc, comment, prompt, description, diagnostic, and visible string. Verify required coverage, accuracy, placement, and editorial quality against the owning code or behavior; automated checks do not establish those properties.
2. **Docs match the code.** Config, defaults, errors, wire fields, events, and public behavior update the owning docs and JSDoc in the same diff.
3. **Decisions are recorded.** A non-trivial change adds or updates a decision record in `docs/decisions/` (see the `repo-decisions` skill). Flag a missing record.
4. **Tests exist for the behavior.** A behavior change carries a test in the same change; a fix without a regression test is a rumor.
5. **External-source provenance is retained.** If implementation is materially derived from a paper, article, community post, benchmark, research report, or copied/adapted code, cite it at the closest stable code location or link that location to a decision record whose `## Links` cites the source. A pull request, issue, prompt, or chat-only citation does not count; copied or adapted material also preserves applicable license and NOTICE requirements.

### Project-specific (instantiated at seed time from repo-seed's own rules)

1. **Seeded surface stays bounded.** A change writes only the seeded paths; `references/templates/` remains the single source of truth for `seededFiles()`, and every seeded-file change updates templates, manifest, and tests in the same diff.
2. **Update semantics are preserved.** Changes to `scripts/scaffold.mjs` keep `references/update-strategy.md` and the seeded `.repo-seed/update-strategy.md` in sync; every preservation rule (never overwrite user-modified or instantiated content, never delete user files, never regress instantiated content to placeholders) has a test.
3. **Tokens ship with instantiation guidance.** Any new template token needs coverage in `SKILL.md` step 4 or `references/review-standard.md`, plus a refusal-path test.

## Manual checks

### Project-specific (instantiated at seed time from repo-seed's stack and known failure modes)

- **Plan/apply symmetry:** `planRun` decisions (create/update/skip/refusal) and `applyPlan` manifest writes stay consistent; dry-run never mutates disk or manifest.
- **Gate determinism:** verifier scopes never silently shrink; a verifier exits non-zero only on real violations.
- **Template ↔ dogfood parity (static files):** static seeded files in this repository match their templates; the instantiated repo-review and manifest hashes are exempt by design.
- **Refusal correctness:** a re-run that would regress instantiated content to unresolved placeholders is refused; `userModified` entries are never refreshed.
- **Model perspective:** repo-seed is agent-facing — review changes to `SKILL.md`, templates, and seeded prose as instructions a fresh agent will read: check the exact wording and that tokens, links, and paths resolve from a clean checkout.

### Universal fallbacks (apply where the project has no specific rule)

- **Intent and interface contracts:** trace both sides of every changed interface. Confirm the implementation matches the change and any decision record, including errors, cancellation, ownership, and disposal.
- **Lifecycle and concurrency:** for async setup, callbacks, processes, or teardown, check races before publication, cancellation during awaits, independent error reporting, and complete cleanup.
- **Scope and necessity:** map each abstraction, option, defensive copy, and compatibility path to its current contract and consumer. Challenge unrelated features and speculative generality.
- **Bounds cover the final operation:** probe tiny and exact limits, oversized chunks, and multibyte text for byte limits.
- **Real entry path:** tests exercise the shipped binary, module, or process where relevant; a hand-wired harness does not catch a broken entry point.
