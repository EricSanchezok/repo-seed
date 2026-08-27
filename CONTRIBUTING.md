# Contributing

Thank you for considering contributing to this project. This repository is agent-native: it expects both human and AI contributors to follow the same governance loop.

## Governance loop

1. Read [AGENTS.md](AGENTS.md) and [docs/AGENTS.md](docs/AGENTS.md) before making changes.
2. Write a decision record only when the change selects among meaningful alternatives; risk-boundary changes use an Approved spec in [docs/specs/](docs/specs/).
3. Run the gates before committing; an authorized pre-commit hook enforces the same runner:
   ```sh
   node scripts/run-gates.mjs
   ```
4. Name the regression risk and add or update the smallest test set that proves the affected contract; a fix without reproducible evidence is a rumor.
5. If the change closes a subtle or systemic escaped failure, add a postmortem in [docs/postmortems/](./docs/postmortems/) linked to the permanent guardrail.

## Decision records

Durable architecture and process decisions use MADR in `docs/decisions/`. Follow the `repo-decisions` skill and [.repo-seed/update-strategy.md](.repo-seed/update-strategy.md) for the format. A superseded record is never rewritten; a new record supersedes it.

## Pull requests

Use the pull request template. Ensure the verification checklist is complete. Reviewers: use the `repo-review` skill.

## Code of conduct

Be respectful and constructive. Assume good faith.
