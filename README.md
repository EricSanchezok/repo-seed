# repo-seed

Seed an agent-native, self-governing repository. repo-seed turns a traditional repository — empty or existing, any technology stack — into a repository ready for vibe coding: resident agent instructions, a documentation standard, a unified MADR decision log, two in-repo skills, deterministic gates, a pre-commit hook, and an ownership manifest that makes the whole seed upgradeable without overwriting your work.

**repo-seed is a generator, not a template.** It writes a governance baseline into your repository; you review and commit it. Re-running repo-seed is the upgrade channel: untouched seeded files refresh to the latest templates, files you modified are preserved by default, and files you created are never deleted.

## What you get (five governance layers + an upgrade channel)

```
L0  Resident instructions   AGENTS.md (<= 100 lines) + CLAUDE.md (@AGENTS.md import)
L1  Deterministic gates     verify-decisions · verify-doc-links · verify-placeholders
                            verify-manifest · git diff --cached --check, enforced by a
                            pre-commit hook installed into .git/hooks (never global)
L2  Unified decision log    MADR records + Class extension in docs/decisions/,
                            enforced by verify-decisions (Proposed → Accepted →
                            Superseded by NNNN; a superseded record is never rewritten)
L3  In-repo skills          .agents/skills/repo-review (instantiated per project:
                            blocking + checks derived from this project's rules)
                            .agents/skills/repo-decisions (decision-log authoring)
L4  Process memory          docs/testing.md policy · docs/postmortems/ · PR template
Upgrade channel             .repo-seed/manifest.json records seeded-file hashes;
                            re-run repo-seed to refresh untouched files, keep yours
```

## Install

The skill is a directory. Clone or copy this repository, then point your agent at it:

- **Claude Code / Codex / Cursor / opencode / Gemini CLI / Copilot**: place the repository (or a symlink) under one of the discovered skill paths — `.agents/skills/repo-seed`, `.claude/skills/repo-seed`, `~/.codex/skills/repo-seed`, `.cursor/skills/repo-seed`, or the equivalent for your tool — so `SKILL.md` is found.
- **`npx skills add` (Vercel) / `gh skill install`**: works against the GitHub URL once this repository is published.
- **Manual**: copy `SKILL.md`, `references/`, and `scripts/` into any skill directory; the skill reads `scripts/` and `references/` relative to itself.

The skill targets any repository with Node >= 18 available (its own scripts are zero-dependency Node; the seeded repository only needs Node for the gates).

## Use

Invoke explicitly: *"initialize this repository with repo-seed"* or *"make this repo agent-native"*.

The skill runs five steps:

1. **Analyze** — detect stack manifests, existing files at seeded paths, git state (read-only; never reads `.env`).
2. **Interview** — ask only what detection cannot answer (project one-liner, license, branch convention, test/lint commands, conflicts, monorepo, review policy input).
3. **Scaffold** — `node <repo-seed>/scripts/scaffold.mjs <target> --templates <repo-seed>/references/templates` (deterministic: skeleton, seeded files, manifest, hook). Use `--dry-run` first.
4. **Instantiate** — the model composes architecture, testing, and the repo-review policy from the analysis and interview, then resolves every `__TOKEN__` fill-in.

## Update mode

Re-run the same skill on an already-seeded repository:

- Untouched seeded files refresh to the latest templates (upstream evolution).
- Files you modified are preserved by default; the manifest marks them `userModified` so the gates check existence only.
- Instantiated policy (repo-review) is marked user-owned at seed time and is never refreshed; the template stays structure-only guidance.
- Files you created are never deleted.
- Previously-seeded extension files are never auto-deleted when a pack is later omitted; removal is an explicit user action.

## Optional extension packs

repo-seed ships six optional packs that grow outer-loop governance **only when you choose them**. The default seed is the core 27-file baseline; a non-interactive run or a skipped extension question adds nothing. Ask during the interview, or enable at any time by re-running with `--extensions`:

| Pack | Adds | When to choose |
|---|---|---|
| `ci` | `.github/workflows/ci.yml` running the four gates + tests | Any GitHub repository |
| `release` | `docs/release-policy.md` + `verify-commit-msg.mjs` + commit-msg hook | Repositories that release |
| `community` | `SECURITY.md` + `CODE_OF_CONDUCT.md` | Public repositories |
| `codeowners` | `CODEOWNERS` per-path owners | Multi-owner repositories |
| `spec` | `docs/specs/` lightweight spec lifecycle | Feature-heavy projects |
| `ai-disclosure` | `docs/ai-disclosure.md` AI participation policy | AI-assisted repositories |

```
node <repo-seed>/scripts/scaffold.mjs <target> --templates <repo-seed>/references/templates \
  --extensions ci,release
```

The scaffold registry (`extensionPacks()` in `scripts/scaffold.mjs`) is the single source of truth; each enabled pack's files carry an `extension` manifest field and are upgraded by re-running with the pack enabled.

The authoritative semantics live in `references/update-strategy.md`.

## Repository layout

```
SKILL.md                          skill entry (agentskills.io spec, six standard fields)
references/                       templates/ (full seeded file set) · interview.md ·
                                  update-strategy.md · decision-standard.md · doc-standard.md
scripts/                          scaffold.mjs · four verifiers · install-hooks.mjs · tests
AGENTS.md  CLAUDE.md              this repository's own resident instructions (dogfood)
docs/                             architecture · development · testing · decisions · postmortems
.agents/skills/                   repo-review · repo-decisions (dogfood copies)
.repo-seed/                       this repository's own manifest + update strategy (dogfood)
```

The repository dogfoods its own standard: its `AGENTS.md`, `docs/`, decision log, gates, and hooks were generated by repo-seed itself and pass their own verifiers.

## License

MIT. The generated `LICENSE` is also MIT by default; the interview can select other options.
