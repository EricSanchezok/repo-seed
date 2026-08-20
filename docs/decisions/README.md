# Decision log

Every decision — architecture or process — lives in one place: this directory. This is the unified decision log: architecture decisions and process decisions share the same format, the same lifecycle, and the same verifier. There is no second system.

## Format

The format is **MADR (Markdown Any Decision Records)** with a documented `Class:` extension. Names and structure follow the industry standard so existing MADR tooling keeps working; the extension is ignored by tools that do not know it.

A decision record is a file named `NNNN-title.md` (4-digit zero-padded number, `-`, kebab-case title) directly inside this directory. Numbers are assigned sequentially; the number is the record's identity and never changes.

### Required sections

Every record contains exactly these `##` sections, in this order:

1. `## Status`
2. `## Context and Problem Statement`
3. `## Decision Drivers`
4. `## Considered Options`
5. `## Decision Outcome`
6. `## Pros and Cons of the Options`
7. `## Links`

`## Links` may be empty ("None.") but must exist. Additional `##` sections may follow `## Links` when a record needs them.

### Status line

The first non-empty line under `## Status` is the status value. Valid values:

- `Proposed` — the decision is being considered; not yet shipped.
- `Accepted` — the decision shipped; the record describes what is.
- `Rejected` — considered and declined; kept while its rationale prevents a tempting, meaningful mistake.
- `Deprecated` — no longer recommended; superseded by a linked record.
- `Superseded by [NNNN](NNNN-title.md)` — replaced by a newer record; the target must exist.

A record whose status is `Accepted`, `Deprecated`, or `Superseded by …` describes current or frozen reality. It is never rewritten into a different decision: to change a decision, add a new record and mark the old one `Superseded by NNNN`. Both records stay, cross-linked.

### Class line (extension)

The line immediately after the status value may be `Class: <value>`. It classifies the decision:

| Class | Covers |
|---|---|
| `architecture` | Structure of the shipped source: modules, boundaries, runtime vocabulary |
| `process` | Tooling, policy, workflow around the code: gates, package manager, conventions |
| `testing` | Test infrastructure and strategy |
| `feature` | A new user- or model-facing capability |
| `bug-fix` | Corrects a defect or closes a gap a postmortem surfaced |
| `simplification` | Removes code, behavior, or surface area without adding capability |

A missing `Class:` line is valid (it is an extension); an invalid value is a violation.

## Lifecycle

A decision starts `Proposed`. Once implemented, its status becomes `Accepted` and the record is kept current with what actually shipped (facts only — names, paths, structure — not the decision itself). A declined proposal is `Rejected`; delete a rejected record only when its rationale no longer prevents a plausible mistake. An obsolete accepted decision becomes `Superseded by NNNN` or `Deprecated`; never edit it into its opposite.

## Writing rules

- Every non-trivial change includes at least one new decision record or updates an existing one, in the same change. "Non-trivial" means it alters behavior, architecture, a contract shared across files, process or tooling, testing strategy, or a decision a maintainer may reasonably revisit.
- State the decision, what it beats, and what it gives up. `## Considered Options` lists genuine alternatives; `## Pros and Cons of the Options` records why the losers lost. A decision without its alternatives invites re-litigation.
- Cross-reference records with relative Markdown links (`[0001](0001-title.md)`), never bare numbers.
- Document current reality, not change history. Put change stories in commits; the decision record states the live contract.

## Verifier

`scripts/verify-decisions.mjs` enforces: file naming, unique sequential numbering, required sections, valid status values, valid `Class:` values when present, and `Superseded by NNNN` targets that exist. It exits non-zero on any violation. The verifier is installed as a pre-commit hook by `scripts/install-hooks.mjs` and can be run standalone.

## Index

- [0000 — Use Markdown Architectural Decision Records](0000-use-markdown-architectural-decision-records.md)
- [0001 — repo-seed is a skill that seeds a self-governing repository, not a static template](0001-repo-seed-is-a-skill-not-a-template.md)
- [0002 — Self-governing repository design](0002-self-governing-repository-design.md)
- [0003 — repo-review is instantiated per project, not shipped statically](0003-repo-review-instantiated-per-project.md)
- [0004 — Optional extension packs: core minimal by default, explicit opt-in](0004-optional-extensions-core-minimal.md)
- [0005 — README visuals use generated art and native diagrams](0005-readme-visual-system.md)
