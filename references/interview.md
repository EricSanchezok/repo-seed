# Interview question bank

The generator asks the minimum necessary questions before scaffolding. Every question has a default; answering nothing produces a valid, generic seed. Detect what you can from the repository first; ask only what detection cannot answer and what materially changes the output.

## Questions

### Q1. Project one-liner
- **Ask when**: always (it fills `__PROJECT_ONE_LINER__` in AGENTS.md).
- **Default**: "A software project." (generic but valid)

### Q2. License
- **Ask when**: no LICENSE file exists.
- **Options**: MIT (default) / Apache-2.0 / BSD-3-Clause / CC0 / None (no LICENSE generated).

### Q3. Branch convention
- **Ask when**: repository has no default branch set and no existing CONTRIBUTING.
- **Default**: `main` with short-lived feature branches.

### Q4. Test command
- **Ask when**: not detectable from the repository (no package.json `test` script, no pytest.ini/pyproject `[tool.pytest]`, no go test convention, no Cargo.toml).
- **Default**: `__TEST_COMMAND__` stays as a fill-in for the model to resolve; if the model cannot resolve it, use `npm test`-style generic and say so.

### Q5. Lint command
- **Ask when**: not detectable.
- **Default**: `__LINT_COMMAND__` resolved by the model; if unresolvable, omit the Lint line rather than invent a command.

### Q6. Existing governance files conflict
- **Ask when**: any seeded path already exists (AGENTS.md, docs/, .agents/skills/repo-review, .agents/skills/repo-decisions, CONTRIBUTING.md, LICENSE, .github/, .repo-seed/).
- **Options**: preserve-and-merge (default) / overwrite-with-backup / skip-that-file.

### Q7. Monorepo
- **Ask when**: repository has multiple package manifests at top level.
- **Options**: root-only seed (default) / also generate a subtree AGENTS.md per package.

## Interview protocol

1. Detect: stack manifests, existing files, git state, repo size (sample if large; do not enumerate the whole tree).
2. Ask only the questions above whose answer is not detectable and that the user did not already answer.
3. Record answers; pass them to the scaffold step. Never block on a question whose default is acceptable.
4. Never read `.env` files or other secrets during detection.
