# Release policy

This repository follows **Conventional Commits** for commit messages and a **decision-log / CHANGELOG / RFC** division for durable writing. This file is the policy reference; the commit-msg hook enforces the message format mechanically.

## Commit messages

The subject line follows Conventional Commits:

```
type(scope)!: subject
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. A `!` marks a breaking change; a `BREAKING CHANGE:` trailer in the body explains it. Merge commits are exempt.

The commit-msg hook (`scripts/verify-commit-msg.mjs`, installed with `install-hooks.mjs --with-commit-msg`) rejects non-conforming subjects.

## Decision log vs CHANGELOG vs RFC

- **Decision log** ([__DECISIONS_PATH__/](../__DECISIONS_PATH__/)) — for maintainers: *why* one meaningful alternative won. Use it for durable rationale, not as a change log. Append-only; supersede, never rewrite.
- **CHANGELOG** — for users: *what changed* between releases. Generated from conventional commits (e.g. semantic-release) or maintained by hand; do not duplicate decision rationale here.
- **Specs** ([__SPECS_PATH__/](../__SPECS_PATH__/)) — for risk-boundary work: intent, observable contract, implementation seams, verification, and evidence. A decision record captures durable alternatives; a spec captures the approved change contract.

## Release automation (optional)

semantic-release (or equivalent) can derive the next version and CHANGELOG from conventional commits on the default branch. If adopted:

- The default branch is protected; releases trigger on push to it.
- Commit messages are the release contract — keep them honest.
- Publish steps run in CI, never locally.

## Versioning

Semantic versioning: `MAJOR.MINOR.PATCH`. Breaking changes bump MAJOR; features bump MINOR; fixes bump PATCH. Pre-release tags (`-alpha`, `-rc.1`) are allowed for staged releases.
