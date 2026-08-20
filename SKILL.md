---
name: repo-seed
description: "Seed an agent-native, self-governing repository — initialize a new repo or upgrade an existing one with AGENTS.md, CLAUDE.md, documentation standards, a MADR decision log, in-repo skills, deterministic gates, and a pre-commit hook. Use when the user asks to initialize a repository, make a repo agent-native, set up docs and ADR for vibe coding, prepare a project for AI development, or refresh an existing seed. Keywords: initialize repo, seed repository, agent-native, vibe coding, AGENTS.md, ADR, decision log, governance, scaffold docs."
license: MIT
compatibility: Node >= 18; works in any repository regardless of language or framework
metadata:
  generator: true
  category: scaffolding
  version: 0.3.0
allowed-tools: Read Write Edit Bash
---

# repo-seed: seed an agent-native, self-governing repository

repo-seed turns a traditional repository — empty or existing, any technology stack — into an agent-native repository ready for vibe coding: resident agent instructions, a documentation standard, a unified MADR decision log, two in-repo skills, deterministic gates, a pre-commit hook, and an ownership manifest that makes the whole seed upgradeable without overwriting the user's work.

**repo-seed is a generator, not a template.** It writes a governance baseline into the target repository; the user reviews and commits it. Re-running repo-seed is the upgrade channel: untouched seeded files refresh to the latest templates, user-modified files are preserved by default, and user-created files are never deleted.

## Workflow

Run the five steps in order. Steps 1-3 are the model's job; steps 3-5 are deterministic scripts.

### 1. Analyze

Inspect the target repository (read-only):

- Stack manifests: `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `requirements.txt`, `Gemfile`, etc. Detect the test command and lint command when derivable.
- Existing files at seeded paths (see the file list in step 4). List every conflict: a file already exists where repo-seed wants to write.
- Git state: is it a git repository? Is the working tree clean? What is the default branch?
- Repository size: for large repositories, sample (directory-depth limit and file-count cap); never enumerate the whole tree.
- Never read `.env` files or other secrets.

### 2. Interview

Ask only the questions whose answers are not detectable and that materially change the output. The question bank lives in [references/interview.md](references/interview.md). Every question has a default; never block on a question whose default is acceptable. Minimal set:

1. Project one-liner (always; fills the AGENTS.md opening line).
2. License — default MIT; skip if a LICENSE exists.
3. Branch convention — default `main` with short-lived feature branches.
4. Test command / lint command — only when not detectable.
5. Existing-file conflict resolution — preserve-and-merge (default) / overwrite-with-backup / skip.
6. Monorepo — root-only seed (default) or also subtree AGENTS.md per package.
7. Review policy input — known pitfalls, review red lines, and invariants this project must not regress (default: none; only the universal repo-review core).
8. Optional extension packs — which outer-loop governance to add (default: none; see the Optional extensions section below).

### 3. Scaffold (deterministic)

Run the scaffold against the target directory. The scaffold creates the directory skeleton, writes seeded files from the template set, records `.repo-seed/manifest.json` with sha256 of every seeded file, and installs the pre-commit hook.

```sh
node <path-to-repo-seed>/scripts/scaffold.mjs <target-dir> \
  --templates <path-to-repo-seed>/references/templates \
  --extensions ci,release \
  --repo-seed-version 0.3.0
```

Flags: `--dry-run` (report only), `--no-interview` (non-interactive; preserve user-modified files), `--values k=v` (repeatable; pre-fill tokens), `--extensions <ids>` (comma/space-separated; opt-in extension packs), `--user-owned <path>` (repeatable; mark a seeded file instantiated at seed time so re-runs never refresh it), `--record-only` (recompute hashes after the model refines content, without touching files).

Use `--dry-run` first and show the user the plan. Extensions are never enabled implicitly: a non-interactive run seeds only the core files.

### 4. Instantiate (model)

For every seeded file that contains fill-in tokens (`__UPPERCASE__`), replace the tokens with content derived from the analysis and interview: project one-liner, real test/lint commands, stack description, architecture content for `docs/architecture.md`, and a testing policy tailored to the detected stack in `docs/testing.md`. Resolve every token — the placeholder gate fails on any survivor. Do not invent commands: if a command cannot be resolved, omit that line rather than fabricate it.

Three files need composition, not string replacement:

- `docs/architecture.md` — write the target's real module map and seams; never ship the placeholder skeleton.
- `docs/testing.md` — state the project's actual test tiers and entry paths from the analysis.
- `.agents/skills/repo-review/SKILL.md` — compose `__REVIEW_PROJECT_BLOCKING__` from AGENTS.md hard rules, interview Q7 red lines, and architecture seams, and `__REVIEW_PROJECT_CHECKS__` from the stack risk catalog in [references/review-standard.md](references/review-standard.md). Procedure skills (repo-decisions) ship static; review policy is instantiated per project. Keep the universal core verbatim; replace an empty token with "None beyond the universal requirements/checks."

### 5. Record and verify

After refining, re-record the manifest so it matches the shipped state, then run the gates and report. Mark the instantiated repo-review policy user-owned in the same step so a later re-run never refreshes it from the structure-only template.

```sh
node <path-to-repo-seed>/scripts/scaffold.mjs <target-dir> --record-only \
  --user-owned .agents/skills/repo-review/SKILL.md
node scripts/verify-decisions.mjs
node scripts/verify-doc-links.mjs
node scripts/verify-placeholders.mjs
node scripts/verify-manifest.mjs
git diff --cached --check
```

The gates run from the target directory. Verify the hook is installed (`.git/hooks/pre-commit`). Then tell the user to review and commit. **Never commit or push unless the user explicitly asks.**

## What gets seeded

The seeded file set is the single source of truth in `scripts/scaffold.mjs` (`seededFiles()`). It includes:

- `AGENTS.md` (resident agent instructions with the governance loop and security rules), `CLAUDE.md` (`@AGENTS.md` import — no symlink, Windows-safe).
- `docs/AGENTS.md` (documentation standard), `docs/architecture.md`, `docs/development.md`, `docs/testing.md`, `docs/postmortems/README.md`.
- `docs/decisions/` — the unified MADR decision log with four seed records and an index.
- `.agents/skills/repo-review` and `.agents/skills/repo-decisions` — the two in-repo skills.
- `scripts/` — the four verifier gates plus `install-hooks.mjs` (copied verbatim from repo-seed so the seeded repo runs the same code).
- `CONTRIBUTING.md`, `LICENSE`, `.editorconfig`, `.gitattributes`, `.github/` (PR + issue templates), `.repo-seed/update-strategy.md`.

## Security and ownership rules

- Write only the seeded paths. Never touch anything outside them without asking.
- Never `git commit` or `git push` unless the user explicitly asks.
- Never read `.env` files or secrets.
- Never delete a file repo-seed did not create.
- Never overwrite a user-modified seeded file without asking (default: preserve).
- The authority for update semantics is [references/update-strategy.md](references/update-strategy.md).

## Optional extensions

Six optional packs extend the core seed; **none are enabled by default**. A non-interactive run or a skipped extension question seeds only the core files. Each pack is a small, self-contained addition; the scaffold registry (`extensionPacks()` in `scripts/scaffold.mjs`) is the single source of truth for their file sets.

| Pack | Adds | When to choose |
|---|---|---|
| `ci` | `.github/workflows/ci.yml` running the four gates + tests (minimal permissions + SHA pinning notes) | Any repository on GitHub |
| `release` | `docs/release-policy.md` (conventional commits, decision-log/CHANGELOG/RFC division) + `scripts/verify-commit-msg.mjs` + commit-msg hook (`install-hooks.mjs --with-commit-msg`) | Repositories that release versions |
| `community` | `SECURITY.md` + `CODE_OF_CONDUCT.md` | Public repositories |
| `codeowners` | `CODEOWNERS` per-path owners | Multi-owner repositories |
| `spec` | `docs/specs/README.md` lightweight spec lifecycle (Draft → Approved → Implemented → Superseded) | Feature-heavy projects |
| `ai-disclosure` | `docs/ai-disclosure.md` AI participation policy (`Assisted-by:` trailer) | Repositories accepting AI-assisted contributions |

Enable packs with the `--extensions` flag (comma/space-separated), e.g. `--extensions ci,release`. When enabled, the model fills the AGENTS.md "Optional extensions" section (the `__AGENTS_EXTENSION_SECTION__` fill-in) with one link line per pack; a core-only seed leaves that section empty.

**Add and remove semantics**: extensions can be added anytime by re-running with new `--extensions`. Previously-seeded extension files are never auto-deleted when a pack is later omitted — re-running without a pack preserves its files and manifest entries; removing a pack's files is an explicit user action.

**CODEOWNERS handle**: when the `codeowners` pack is enabled, ask the user for the GitHub handle or team to own the seeded paths (see interview Q10). Never invent a handle. If the user provides none, the scaffold generates `@TODO-OWNER` (the `CODEOWNER_HANDLE` default) and you must tell the user to replace it before enabling branch protection that requires owner review.

## Authoring rules

These rules govern repo-seed's own instruction files (SKILL.md, templates, in-repo skill templates) and keep the skill portable across agent tools:

- Use tool-agnostic wording for actions: "ask the user", "read the repository", "write files", "run a command" — never name a specific tool or function (e.g. no "use the question tool", "call read_file").
- Describe intent and outcome, not the mechanism; each agent maps the wording to its own tools.
- Keep commands that are genuinely cross-tool (shell snippets, node scripts) as literal code blocks; they are tool-independent.
- The `allowed-tools` frontmatter field is a declarative permission list per the agentskills.io spec, not an instruction; keep it minimal.

## References

- [references/interview.md](references/interview.md) — question bank.
- [references/update-strategy.md](references/update-strategy.md) — ownership, conflicts, preservation, manifest schema.
- [references/decision-standard.md](references/decision-standard.md) — the MADR + Class extension standard.
- [references/review-standard.md](references/review-standard.md) — how to derive the project-specific repo-review policy.
- [references/doc-standard.md](references/doc-standard.md) — the documentation standard the seed writes.
