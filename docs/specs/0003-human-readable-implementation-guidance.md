# Human-readable implementation guidance

Artifact-Version: 1
Status: Implemented

## Intent

Make generated repositories give agents a compact, durable standard for human-readable code. The standard prioritizes a visible logic mainline, abstractions that repay their indirection cost, semantically accurate names, repository-wide vocabulary consistency, and change locality. It must strengthen ordinary implementation and review without adding a new capability, document tier, resident skill, or deterministic readability gate.

## Contract

A fresh seed places one standing readability order in AGENTS: write for human readers, keep the primary logic path visible, require abstractions to hide more complexity than their indirection adds, use names that reveal domain meaning, effects, and cost, use one repository term per concept, and keep changes within the owning boundary. The global repo-seed skill examines representative entry points, modules, and public interfaces for existing vocabulary and local abstraction conventions before it instantiates policy. The resident repo-review skill evaluates changed code from its entry point downward, challenges forwarding-only wrappers, mixed abstraction levels, misleading or generic names, unnecessary synonyms, and scattered ownership, and treats numeric size or complexity measures as signals rather than verdicts. Review blocks behavior that cannot be reliably understood, misleading names, hidden effects or cost, and violations of established vocabulary or boundaries; subjective polish remains advisory. Project-specific naming guidance is derived only from repository evidence and is never invented.

## Plan

Update the AGENTS template and dogfood copy, the global skill analysis and instantiation instructions, the repo-review template and dogfood copy, the review-policy derivation standard, and the baseline capability summary. Add fresh-seed and template assertions, then release the change as repo-seed 0.6.2.

## Verification

Run `node --test scripts/*.test.mjs`, assert a real fresh seed contains the standing order and the instantiated review policy contains the human-readability check and severity boundary, run `node scripts/run-gates.mjs`, and run `git diff --check`.

## Evidence

- [Fresh-seed readability assertions](../../scripts/governance.test.mjs)
- [Repeated-evidence derivation assertions](../../scripts/scaffold.test.mjs)
- [Canonical AGENTS standing-order template](../../references/templates/AGENTS.md.tpl)
- [Canonical repo-review policy template](../../references/templates/.agents/skills/repo-review/SKILL.md.tpl)
