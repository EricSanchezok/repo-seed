# AGENTS.md

__PROJECT_ONE_LINER__

## Repository layout

See [__ARCHITECTURE_PATH__](__ARCHITECTURE_PATH__) for the module map and seams. Directories named there are the canonical layout; anything else is user code.

## Commands

- Test: `__TEST_COMMAND__`
- Lint: `__LINT_COMMAND__`
- Gates: `node scripts/run-gates.mjs`

Run relevant tests while working and the shared gate runner before every commit. CI or an installed pre-commit hook may repeat the exhaustive matrix.

## Governance loop (hard rules)

1. Run the gates before every commit; install the optional pre-commit capability only with user authorization.
2. Record a decision in [__DECISIONS_PATH__/](__DECISIONS_PATH__/) when a change chooses among meaningful alternatives whose rationale may be revisited; decisions are not a change log.
3. Risk-boundary changes start from an Approved spec in [__SPECS_PATH__/](__SPECS_PATH__/); routine changes are exempt.
4. A subtle, systemic, or costly escaped failure earns a postmortem in [__POSTMORTEMS_PATH__/](__POSTMORTEMS_PATH__/) linked to a permanent guardrail.
5. Implementation materially derived from an external source retains provenance at the closest stable repository location; follow [docs/development.md](docs/development.md#source-attribution).
6. The only upgrade channel for the seeded governance layer is re-running the repo-seed skill. Never hand-edit seeded files to "match upstream"; re-run the skill instead.

## Security rules

- Never `git commit` or `git push` unless the user explicitly asks.
- Never modify files outside the seeded paths (AGENTS.md, CLAUDE.md, docs/, scripts/, .agents/skills/, .github/, CONTRIBUTING.md, LICENSE, .editorconfig, .gitattributes, .repo-seed/) without asking.
- Never read `.env` files or other secrets.

## Documentation

Follow [docs/AGENTS.md](docs/AGENTS.md): one home per fact, tutorials vs references, hygiene checklist.

## Decisions

__DECISIONS_RULE__

## Governance evolution

Use the `repo-governance` skill when complexity, delivery, ownership, security, release, or incident signals change. Read-only audits and dry-runs are autonomous. Ask before enabling a capability, installing a hook, changing policy/source-of-truth, or connecting an external system. Raise blocking recommendations before implementation and advisory recommendations in the handoff; do not repeat a declined recommendation until its assessment hash changes.

## Testing

Follow [__TESTING_PATH__](__TESTING_PATH__). Test the real entry path; verify the world, not the self-report; mock only expensive or non-deterministic boundaries.

## Skills

- [`.agents/skills/repo-review`](.agents/skills/repo-review/SKILL.md) — semantic review policy (instantiated per project) before merging.
- [`.agents/skills/repo-decisions`](.agents/skills/repo-decisions/SKILL.md) — how to write and update decision records.
- [`.agents/skills/repo-governance`](.agents/skills/repo-governance/SKILL.md) — progressive capability assessment, authorization, and upgrades.

## Enabled optional capabilities

__AGENTS_EXTENSION_SECTION__
