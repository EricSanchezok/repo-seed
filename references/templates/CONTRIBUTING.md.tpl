# Contributing

Thank you for considering contributing to this project. This repository is agent-native: it expects both human and AI contributors to follow the same governance loop.

## Governance loop

1. Read [AGENTS.md](AGENTS.md) and [docs/AGENTS.md](docs/AGENTS.md) before making changes.
2. For any non-trivial change, add or update a decision record in [docs/decisions/](docs/decisions/README.md) (use the `repo-decisions` skill).
3. Run the gates before committing; the pre-commit hook enforces them:
   ```sh
   node scripts/verify-decisions.mjs
   node scripts/verify-doc-links.mjs
   node scripts/verify-placeholders.mjs
   node scripts/verify-manifest.mjs
   ```
4. Write or update tests in the same change; a fix without a regression test is a rumor.
5. If the change fixes a bug that reached users, add a postmortem in [docs/postmortems/](docs/postmortems/README.md).

## Decision records

Every decision — architecture or process — is a MADR record in `docs/decisions/`. Follow the `repo-decisions` skill and [.repo-seed/update-strategy.md](.repo-seed/update-strategy.md) for the format. A superseded record is never rewritten; a new record supersedes it.

## Pull requests

Use the pull request template. Ensure the verification checklist is complete. Reviewers: use the `repo-review` skill.

## Code of conduct

Be respectful and constructive. Assume good faith.
