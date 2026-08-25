# AGENTS.md

repo-seed: a cross-tool skill that seeds agent-native, self-governing repositories

## Repository layout

See [docs/architecture.md](docs/architecture.md) for the module map and seams. Directories named in that file are the canonical layout; anything else is user code.

## Commands

- Test: `node --test scripts/*.test.mjs`
- Lint: `npm run lint (if configured)`
- Gates: `node scripts/verify-decisions.mjs && node scripts/verify-doc-links.mjs && node scripts/verify-placeholders.mjs && node scripts/verify-manifest.mjs`

Run the relevant check for the surface you touched; do not default to the full suite. CI or the pre-commit hook owns the exhaustive matrix.

## Governance loop (hard rules)

1. Run the gates before every commit; the pre-commit hook enforces them.
2. Every non-trivial change adds or updates a decision record in `docs/decisions/` (see the `repo-decisions` skill and [docs/decisions/README.md](docs/decisions/README.md)).
3. A bug that reached a user, a merged PR, or a release earns a postmortem in [docs/postmortems/](docs/postmortems/README.md).
4. Implementation materially derived from an external source retains provenance at the closest stable repository location; follow [docs/development.md](docs/development.md#source-attribution).
5. The only upgrade channel for the seeded governance layer is re-running the repo-seed skill. Never hand-edit seeded files to "match upstream"; re-run the skill instead.

## Security rules

- Never `git commit` or `git push` unless the user explicitly asks.
- Never modify files outside the seeded paths (AGENTS.md, CLAUDE.md, docs/, scripts/, .agents/skills/repo-review, .agents/skills/repo-decisions, .github/, CONTRIBUTING.md, LICENSE, .editorconfig, .gitattributes, .repo-seed/) without asking.
- Never read `.env` files or other secrets.

## Documentation

Follow [docs/AGENTS.md](docs/AGENTS.md): one home per fact, tutorials vs references, hygiene checklist.

## Decisions

Every decision — architecture or process — is a MADR record in `docs/decisions/`. Status flows Proposed → Accepted → Superseded by NNNN. A superseded record is never rewritten into its opposite; a new record supersedes it.

## Testing

Follow [docs/testing.md](docs/testing.md). Test the real entry path; verify the world, not the self-report; mock only expensive or non-deterministic boundaries.

## Skills

- [`.agents/skills/repo-review`](.agents/skills/repo-review/SKILL.md) — semantic review policy (instantiated per project) before merging.
- [`.agents/skills/repo-decisions`](.agents/skills/repo-decisions/SKILL.md) — how to write and update decision records.

## Optional extensions

- CI runs the gates on every push/PR: [.github/workflows/ci.yml](.github/workflows/ci.yml).
- AI-assisted commits/PRs disclose participation per [docs/ai-disclosure.md](docs/ai-disclosure.md).
