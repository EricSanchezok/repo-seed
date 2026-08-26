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
- **Default**: resolve `__TEST_COMMAND__` from repository evidence; if it cannot be resolved, ask or omit the command rather than inventing one.

### Q5. Lint command
- **Ask when**: not detectable.
- **Default**: `__LINT_COMMAND__` resolved by the model; if unresolvable, omit the Lint line rather than invent a command.

### Q6. Existing governance files conflict
- **Ask when**: any seeded path already exists (AGENTS.md, docs/, .agents/skills/repo-review, .agents/skills/repo-decisions, CONTRIBUTING.md, LICENSE, .github/, .repo-seed/).
- **Options**: preserve-and-merge (default) / overwrite-with-backup / skip-that-file.

### Q7. Monorepo
- **Ask when**: repository has multiple package manifests at top level.
- **Options**: root-only seed (default) / also generate a subtree AGENTS.md per package.

### Q8. Review policy input
- **Ask when**: always; it feeds the project-specific half of the repo-review skill.
- **Prompt**: "Known pitfalls, review red lines, or invariants this project must not regress — anything a reviewer must check that is not already in the detected stack or the repository docs? For example: deployment must follow PR review and merge before server changes; a forbidden tool; a schema that must keep its SDK mirrors in sync."
- **Default**: none — only the universal repo-review core ships; the two project tokens resolve to "None beyond the universal requirements/checks."
- **Use**: compose `__REVIEW_PROJECT_BLOCKING__` and `__REVIEW_PROJECT_CHECKS__` per [review-standard.md](review-standard.md).

## Interview protocol

1. Detect: stack manifests, existing files, git state, repo size (sample if large; do not enumerate the whole tree).
2. Ask only the questions above whose answer is not detectable and that the user did not already answer.
3. Record answers; pass them to the scaffold step. Never block on a question whose default is acceptable.
4. Never read `.env` files or other secrets during detection.

### Q9. Applicable capabilities
- **Ask when**: the audit recommends an optional capability and no enabled/external/unchanged declined or deferred state already resolves it.
- **Prompt**: name only the applicable capability, its observed signals, existing equivalent-system result, benefit, ongoing cost, added files/processes, and `blocking` or `advisory` urgency. Ask whether to enable it, register an external equivalent, defer it, or decline it.
- **Default**: deferred — no optional capability is enabled implicitly.
- **Use**: record the chosen state and normalized assessment hash. File-backed legacy capabilities may still pass through `--extensions`; Spec is Core and legacy `--extensions spec` is a no-op.

### Q10. CODEOWNERS owner handle
- **Ask when**: the user selected the `codeowners` extension pack in Q9.
- **Prompt**: "Which GitHub handle or team should own the seeded paths (docs/, scripts/, .agents/, .github/)? For example `@alice` or `@acme/platform`. If you do not provide one, the placeholder `@TODO-OWNER` is generated and you must replace it before enabling branch protection."
- **Default**: none — the scaffold generates `@TODO-OWNER`; the model tells the user to replace it.
- **Use**: pass the handle to the scaffold as `--values CODEOWNER_HANDLE=<handle>`; without it the scaffold falls back to `TODO-OWNER`.

### Q11. Local hooks
- **Ask when**: the target is a Git repository and the audit does not detect an existing pre-commit hook or hook manager.
- **Prompt**: "Install repo-seed's managed pre-commit hook? It runs the manifest-selected governance gates plus staged whitespace checks. Existing custom hooks are never overwritten."
- **Default**: skip.
- **Use**: pass `--hooks install` only after explicit approval; otherwise pass or retain `--hooks skip`.

### Q12. Adoption source of truth
- **Ask when**: adopting an unmanaged repository with non-standard governance paths or an external requirements/decision system.
- **Prompt**: confirm the authoritative home for each detected artifact and whether repo-seed should link it as external or manage the existing repository path.
- **Default**: preserve the existing system as external/user-owned and add only links plus missing Core.
- **Use**: populate `governance.paths`, `governance.externalSources`, and capability state. Never create a duplicate canonical document merely to fit repo-seed's default layout.
