# Optional extension packs: core minimal by default, explicit opt-in

## Status
Accepted
Class: architecture

## Context and Problem Statement
repo-seed's value is a self-governing repository: resident agent instructions, a unified MADR decision log, documentation standards, in-repo skills, deterministic gates, and an upgrade channel. Research across 13 top open-source repositories and community critique (2026-08) showed two competing pressures:

- Top projects all ship outer-loop governance: CI workflows (with `permissions: {}` and SHA pinning), SECURITY.md / CODE_OF_CONDUCT (OpenSSF Scorecard checks), release policy (conventional commits + semantic-release), CODEOWNERS, and AI disclosure policies.
- Community consensus strongly rejects "specification bloat": ETH Zurich's evaluation found context files do not improve success rates and add ~20% inference cost; "maps, not manuals" (~200-line AGENTS.md) is the accepted shape; template-heavy governance is seen as AI-slop.

repo-seed must be professional and complete without forcing every seeded repository to carry every mechanism. The question: how to make the outer-loop capabilities available without making them mandatory?

## Decision Drivers
- Default behavior must not add complexity: a seeded repository with no explicit choice is identical to today's core 27-file baseline.
- Professional capabilities (CI, release policy, security files, CODEOWNERS, specs, AI disclosure) must exist and be first-class, not vaporware.
- Zero-dependency and cross-tool constraints stay untouched.
- Manifest schema must stay backward compatible (additive fields only).

## Considered Options
- Static profiles (minimal/full template sets): duplicates the core templates, splits the update channel, doubles maintenance.
- Default-all extensions: every seeded repo becomes heavy; contradicts the community consensus and the "no over-engineering" goal.
- Extension pack registry with explicit opt-in — the chosen route.

## Decision Outcome
repo-seed ships six **optional extension packs**; none are enabled by default. A non-interactive run or a skipped extension question seeds only the core 27 files.

- `ext-ci` — GitHub Actions workflow (stack-agnostic, runs the four gates + tests, minimal permissions + SHA pinning comments).
- `ext-release` — release policy doc (conventional commits, decision-log/CHANGELOG/RFC division) + zero-dependency commit-msg verifier + `install-hooks --with-commit-msg`.
- `ext-community` — SECURITY.md + CODE_OF_CONDUCT.md (public-repo recommended).
- `ext-codeowners` — CODEOWNERS with per-path owners.
- `ext-spec` — lightweight spec lifecycle under `docs/specs/` (Draft → Approved → Implemented → Superseded), no spec-kit dependency.
- `ext-ai-disclosure` — AI participation disclosure policy (`Assisted-by:` trailer), borrowing spec-kit/nacos practice.

The scaffold registry (`extensionPacks()` in `scripts/scaffold.mjs`) is the single source of truth; `seededFiles(extensions)` is core + enabled packs. Manifest entries carry an additive `extension` field; re-running without a previously enabled pack preserves those files (never auto-deletes). AGENTS.md gains an extension-section fill-in token (defaults to empty so a core-only seed leaves no residue).

### Consequences
- Good: capability is complete without forced weight; each repository grows governance only where it is wanted.
- Good: extension files reuse the proven token/manifest/preserve machinery — no new architecture.
- Good: the upgrade channel still works for core and extensions.
- Trade-off: six packs is more surface to maintain; the registry keeps it declarative and testable.
- Trade-off: extensions are opt-in, so a user who never asks never gets CI/SECURITY; interview Q9 surfaces them once per seed.

## Pros and Cons of the Options
### Static profiles
- Good: simple mental model.
- Bad: duplicated core templates, split update channel, double maintenance.

### Default-all extensions
- Good: maximum out-of-box rigor.
- Bad: every repo is heavy; community consensus is against it; non-interactive runs would silently grow repos.

### Registry with explicit opt-in
- Good: complete capability, minimal default, single source of truth, backward-compatible manifest.
- Bad: more implementation surface; requires the extension question in the interview.

## Links
- [ADR 0000](0000-use-markdown-architectural-decision-records.md) — the decision log standard.
- [ADR 0002](0002-self-governing-repository-design.md) — five-layer governance this extends.
- [references/update-strategy.md](../../references/update-strategy.md) — extension preservation semantics.
