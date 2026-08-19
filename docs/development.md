# Development

English is the working language of this repository. This document covers contributor setup, daily workflow, and the commands that matter. Commands live in the root [AGENTS.md](../AGENTS.md); decision rationale lives in [docs/decisions/](decisions/README.md).

## Prerequisites

- Git
- Node >= 18

## Daily workflow

1. Pull, branch, or stack per the repository's branching convention (see [CONTRIBUTING.md](../CONTRIBUTING.md)).
2. Make the change; update docs, decisions, and tests in the same change.
3. Run the relevant gates:
   ```sh
   node scripts/verify-decisions.mjs
   node scripts/verify-doc-links.mjs
   node scripts/verify-placeholders.mjs
   node scripts/verify-manifest.mjs
   ```
   The pre-commit hook enforces them on commit; run them early to avoid surprises.
4. Run the test command: `node --test scripts/*.test.mjs`
5. Run the lint command: `npm run lint (if configured)`
6. Commit with a message that states the why; include a decision record reference when one changed.

## Working tree

Seeded governance files (AGENTS.md, CLAUDE.md, docs/, scripts/, .agents/skills/repo-review, .agents/skills/repo-decisions, .github/, CONTRIBUTING.md, LICENSE, .editorconfig, .gitattributes, .repo-seed/) are owned by the repo-seed skill's manifest. Hand-edit them only with intent; the manifest records their hash and the update mode preserves your edits.

## Editing docs

Follow [docs/AGENTS.md](AGENTS.md): one home per fact, tutorials vs references, hygiene checklist.
