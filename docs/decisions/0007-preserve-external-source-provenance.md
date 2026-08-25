# Preserve external-source provenance beside implementation

## Status
Accepted
Class: process

## Context and Problem Statement
Implementation choices can be materially derived from papers, articles, community posts, benchmarks, research reports, or copied and adapted code. When that origin exists only in a prompt, issue, pull request, or chat transcript, it becomes detached from the implementation and future maintainers cannot recover the evidence, constraints, or licensing context that shaped the code.

repo-seed needs a portable rule that keeps provenance durable without requiring citations for routine language idioms or pretending that a deterministic gate can infer whether an uncited implementation came from an external source.

## Decision Drivers
- A maintainer must be able to recover an implementation's material external source from the repository checkout.
- The marker must live close enough to the affected code that refactors and reviews preserve it.
- Cross-cutting research must have one durable home instead of duplicating long citations across files.
- Citation and license compliance must remain distinct obligations.
- Enforcement must not claim semantic certainty that a script cannot provide.

## Considered Options
- Require citations only in pull requests or issues.
- Add a deterministic citation verifier.
- Combine a resident hard rule, a development procedure, decision-record links, review enforcement, and pull-request self-checks — the chosen route.

## Decision Outcome
Implementation materially derived from an external source retains provenance at the closest stable repository location. A local algorithm, formula, constant, workaround, or behavior carries a nearby source comment. A cross-cutting implementation entry point may instead link to its owning decision record, whose `## Links` section contains descriptive, stable source links. Copied, adapted, generated, and vendored material also preserves applicable copyright, license, and NOTICE obligations.

The root `AGENTS.md` carries the standing order and links to the procedure in `docs/development.md`. The universal `repo-review` policy blocks missing provenance, the decision standard rejects unlinked research or quantitative claims, and the pull-request template exposes an author self-check. No citation gate is added because a script can validate marker syntax only after a marker exists; it cannot reliably detect an omitted source.

Routine language idioms and standard-library use do not require citations. A pull request, issue, prompt, or chat transcript may supplement repository provenance but is never its only home.

### Consequences
- Good: the evidence and constraints behind externally derived implementation remain recoverable with the code.
- Good: local sources stay local while cross-cutting evidence has one decision-record home.
- Good: review enforces the semantic obligation without a false-positive-prone gate.
- Trade-off: authors and reviewers must exercise judgment about what is materially derived.
- Trade-off: mutable community sources may still disappear; stable permalinks, versions, and access dates reduce but do not eliminate that risk.

## Pros and Cons of the Options
### Pull-request or issue citations only
- Good: minimal repository prose.
- Bad: provenance becomes detached when hosting history is unavailable, links are reorganized, or code moves without its discussion.

### Deterministic citation verifier
- Good: marker formatting could be checked mechanically.
- Bad: the verifier cannot infer that an uncited implementation used an external source, so a green result would overstate the guarantee.

### Layered repository provenance
- Good: combines constant visibility, a precise procedure, durable evidence, and semantic review.
- Bad: touches several governance surfaces that must stay synchronized.

## Links
- [Development source-attribution procedure](../development.md#source-attribution) — citation placement and content.
- [Review policy](../../.agents/skills/repo-review/SKILL.md) — semantic blocking requirement.
- [Decision log standard](README.md#writing-rules) — external evidence in `## Links`.
