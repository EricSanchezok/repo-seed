---
name: repo-seed
description: "Seed, audit, adopt, and progressively evolve an agent-native repository with risk-triggered specs, durable decisions, resident governance skills, capability state, deterministic gates, and safe upgrades. Use when initializing or upgrading a repository, when an unmanaged repository grows complex, or when delivery, ownership, security, release, or incident signals suggest a governance capability is missing."
license: MIT
compatibility: Node >= 18; works in any repository regardless of language or framework
metadata:
  generator: true
  category: scaffolding
  version: 0.6.2
allowed-tools: Read Write Edit Bash
---

# repo-seed: seed an agent-native, self-governing repository

repo-seed turns a traditional repository — empty or existing, any technology stack — into an agent-native repository whose governance grows with its actual risk: resident instructions, risk-triggered Specs, durable MADR decisions, incident feedback, three in-repo skills, deterministic gates, and a capability manifest that preserves user ownership and external sources of truth.

**repo-seed is a progressive governance system, not a static template.** It may autonomously inspect, audit, and produce a dry-run. Writing the baseline, enabling a capability, installing a hook, changing policy/source-of-truth, or connecting an external system requires user authority. Re-running repo-seed is the only upgrade channel: untouched seeded files refresh, user-modified files are preserved, and user-created files are never deleted.

In a managed repository, the resident AGENTS router is authoritative. Ordinary implementation consumes its standing rules and linked project documents directly; review, durable decisions, and governance evolution use the resident `repo-review`, `repo-decisions`, and `repo-governance` skills. Invoke the global repo-seed skill only for seeding, adoption, governance-layer upgrades, or upstream repair.

## Workflow

Run the five steps in order. Analysis, interview, and instantiation require model judgment; scaffold, record, audit, and verification mechanics are deterministic scripts.

### 1. Analyze

Inspect the target repository (read-only):

- Stack manifests: `package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`, `requirements.txt`, `Gemfile`, etc. Detect test/lint commands plus actual unit, integration, end-to-end, fixture, and naming conventions when derivable.
- Representative implementation: when code exists, sample two or three real entry points, modules, and public interfaces. Identify the repository's canonical domain nouns, state-transition verbs, naming idioms, and abstraction/placement conventions from repeated evidence; do not promote one outlier into policy.
- Existing files at seeded paths (see the file list in step 4). List every conflict: a file already exists where repo-seed wants to write.
- Existing governance equivalents: AGENTS/CLAUDE instructions, architecture/testing docs, ADR/RFC systems, postmortems, CI, release/deploy markers, hooks, CODEOWNERS, and external requirement links.
- Git state: is it a git repository? Is the working tree clean? What is the default branch?
- Repository size: for large repositories, sample (directory-depth limit and file-count cap); never enumerate the whole tree.
- Never read `.env` files or other secrets.

When the repository already contains `scripts/audit-governance.mjs`, run it with `--json`. In an unmanaged repository, use the global skill's read-only detection and offer adoption only when the current task or repository facts show meaningful complexity. An audit never authorizes writes.

### 2. Interview

Ask only the questions whose answers are not detectable and that materially change the output. The question bank lives in [references/interview.md](references/interview.md). Every question has a default; never block on a question whose default is acceptable. Minimal set:

1. Project one-liner (always; fills the AGENTS.md opening line).
2. License — default MIT; skip if a LICENSE exists.
3. Branch convention — default `main` with short-lived feature branches.
4. Test command, topology, and lint command — ask only for material facts that repository evidence cannot resolve; never invent a tier or directory.
5. Existing-file conflict resolution — preserve-and-merge (default) / overwrite-with-backup / skip.
6. Monorepo — root-only seed (default) or also subtree AGENTS.md per package.
7. Review policy input — known pitfalls, review red lines, and invariants this project must not regress (default: none; only the universal repo-review core).
8. Capability choices — show only applicable recommendations with benefit, ongoing cost, urgency, and detected equivalent systems. Do not ask again when a declined/deferred assessment hash still matches.
9. Hook authorization — default `skip`; installing or replacing local Git state is never implied by seeding.

### 3. Scaffold (deterministic)

Run the scaffold against the target directory. The scaffold creates the approved directory skeleton, writes seeded files from the template set, and records `.repo-seed/manifest.json` with ownership, capability, governance-path, external-source, and artifact-policy state.

```sh
node <path-to-repo-seed>/scripts/scaffold.mjs <target-dir> \
  --templates <path-to-repo-seed>/references/templates \
  --extensions ci,release \
  --hooks skip \
  --repo-seed-version 0.6.2
```

Flags: `--dry-run` (report only), `--no-interview` (non-interactive; preserve user-modified files), `--adopt` (reuse detected governance paths in an unmanaged repository), `--hooks install|skip` (default `skip`), `--values k=v` (repeatable), `--extensions <ids>` (legacy compatibility entry), `--capability-state id=enabled|external|deferred|declined` plus reason/assessment hash, `--governance-path kind=relative/path`, `--external-source kind=https://stable-link`, `--user-owned <path>` (repeatable), and `--record-only` (recompute manifest state without touching governed files).

Use `--dry-run` first and show the user the plan. Optional capabilities are never enabled implicitly. The legacy `--extensions spec` flag is accepted as a deprecated no-op because Spec is Core. An enabled capability remains enabled and upgradeable when a later run omits its legacy extension flag.

### 4. Instantiate (model)

For every seeded file that contains fill-in tokens (`__UPPERCASE__`), replace the tokens with content derived from the analysis and interview: project one-liner, real test/lint commands, stack description, architecture content for `docs/architecture.md`, and a risk-driven testing policy tailored to the detected stack in `docs/testing.md`. Resolve every token — the placeholder gate fails on any survivor. Do not invent commands, tiers, or directories: if a command cannot be resolved, omit that line rather than fabricate it.

Three files need composition, not string replacement:

- `docs/architecture.md` — write the target's real module map and seams; never ship the placeholder skeleton.
- `docs/testing.md` — preserve the Core mission and evidence rules, then state the project's actual risk-to-layer choices, test roots, colocated naming conventions, fixtures, commands, and absent tiers from repository evidence.
- `.agents/skills/repo-review/SKILL.md` — compose `__REVIEW_PROJECT_BLOCKING__` from AGENTS.md hard rules, interview Q8 red lines, and architecture seams, and `__REVIEW_PROJECT_CHECKS__` from the stack risk catalog plus repeated vocabulary and abstraction evidence in [references/review-standard.md](references/review-standard.md). Procedure skills (repo-decisions) ship static; review policy is instantiated per project. Keep the universal core verbatim, never invent a naming rule or glossary, and replace an empty token with "None beyond the universal requirements/checks."

Compose `__DECISION_INDEX__` and `__POSTMORTEM_INDEX__` from the records that actually exist after the run. Use one relative Markdown link per record, or `None yet.` for an empty postmortem index. These tokens keep user-created records discoverable across upgrades; never reset an existing index to the seed examples.

Compose `__TEST_TOPOLOGY__` as a short list of the repository's actual test homes. Name each existing tier's path or colocated filename convention, the root entry or runner configuration that selects it, and fixture location where present; link rather than duplicate a command already owned by AGENTS.md. If a tier does not exist, state that fact and the risk that would justify adding it; do not create a directory merely to satisfy the template. Follow the ecosystem's idiom: for example Go unit tests stay beside source as `*_test.go`, while Python commonly uses tiered roots under `tests/`.

When adoption registers a non-standard path, instantiate `__ARCHITECTURE_PATH__`, `__TESTING_PATH__`, `__DECISIONS_PATH__`, `__SPECS_PATH__`, and `__POSTMORTEMS_PATH__` from the manifest. Instantiate `__DECISIONS_RULE__` as the local MADR lifecycle for a repository-owned decision log or as a no-duplicate-authority rule for an external decision source. Do not copy facts from an external source of truth into a second authoritative document.

### 5. Record and verify

After refining, re-record the manifest so it matches the shipped state, then run the gates and report. Mark the instantiated repo-review policy user-owned in the same step so a later re-run never refreshes it from the structure-only template.

```sh
node <path-to-repo-seed>/scripts/scaffold.mjs <target-dir> --record-only \
  --user-owned .agents/skills/repo-review/SKILL.md
node scripts/run-gates.mjs
```

The gates run from the target directory. If and only if the user authorized hooks, pass `--hooks install` to the scaffold/apply invocation in step 3 and verify the managed hook calls `run-gates.mjs --staged`; `--record-only` does not install hooks. Preserve any custom hook. Then tell the user to review and commit. **Never commit or push unless the user explicitly asks.**

## What gets seeded

The capability catalog is the single source of truth for the file contributions returned by `seededFiles()`. Core includes:

- `AGENTS.md` (management identity, resident skill router, governance loop, and security rules), `CLAUDE.md` (`@AGENTS.md` import — no symlink, Windows-safe).
- `docs/AGENTS.md` (documentation standard), architecture/development docs, a risk-driven testing policy with instantiated topology, `docs/specs/README.md`, and `docs/postmortems/README.md`.
- `docs/decisions/` — the unified MADR decision log with four seed records and an index.
- `.agents/skills/repo-review`, `.agents/skills/repo-decisions`, and `.agents/skills/repo-governance` — resident review, rationale, and capability-evolution procedures.
- `scripts/` — capability/audit/configuration modules, the manifest-driven runner, deterministic verifiers, and the separately authorized hook installer.
- `CONTRIBUTING.md`, `LICENSE`, `.editorconfig`, `.gitattributes`, `.github/` (PR + issue templates), `.repo-seed/update-strategy.md`.

## Security and ownership rules

- Write only the seeded paths. Never touch anything outside them without asking.
- Never `git commit` or `git push` unless the user explicitly asks.
- Never read `.env` files or secrets.
- Never delete a file repo-seed did not create.
- Never overwrite a user-modified seeded file without asking (default: preserve).
- Never enable CI/CD, modify a remote platform, install a hook, or replace an external source of truth without explicit authority.
- The authority for update semantics is [references/update-strategy.md](references/update-strategy.md).

## Progressive capabilities

The canonical catalog is `CAPABILITIES` in `scripts/capabilities.mjs`. Each `CapabilityDefinition` includes tier, files, prerequisites, applicability signals, equivalent-system signals, benefit, ongoing cost, urgency, AGENTS/review/gate contributions, and enable/upgrade/re-evaluation conditions. `extensionPacks()` and `--extensions` remain compatibility projections over the catalog.

Core includes resident instructions, architecture/testing docs, risk-triggered Spec, durable decisions, review/governance skills, deterministic gates, postmortems, manifest state, and the upgrade channel. Optional capabilities include `ci`, `release`, `community`, `codeowners`, `ai-disclosure`, monorepo subtree instructions, and local hooks.

Assessment timing follows urgency. Security, release, migration, or ownership boundaries that affect the current task are raised before implementation. Ordinary CI/community/maturity advice is raised at handoff. Record `enabled`, `external`, `deferred`, or `declined`; store the normalized assessment hash for deferred/declined advice so unchanged facts do not trigger another prompt.

Use the legacy `--extensions` flag for file-backed compatibility capabilities, or explicit `--capability-state` assignments for the catalog state. Omission never disables an enabled capability; removal is a separate, explicitly authorized operation.

**CODEOWNERS handle**: when the `codeowners` pack is enabled, ask the user for the GitHub handle or team to own the seeded paths (see interview Q10). Never invent a handle. If the user provides none, the scaffold generates `@TODO-OWNER` (the `CODEOWNER_HANDLE` default) and you must tell the user to replace it before enabling branch protection that requires owner review.

## Unmanaged repository adoption

When the manifest is absent, the skill may perform a read-only audit and show a dry-run. Do not write until the user approves adoption. `--adopt` discovers existing AGENTS, architecture/testing docs, ADR/RFC, postmortems, CI, and hook systems; compatible non-standard paths are recorded in `governance.paths`, while external sources of truth are recorded in `governance.externalSources` and capability state. Existing files are user-owned. Fill only missing Core surfaces and never manufacture a second authoritative copy.

Jira, Notion, GitHub Issues, and other requirement systems use generic stable links first; connector setup is a separate future capability and always requires authorization. The adoption order is read-only audit → dry-run → user confirmation → incremental write → `run-gates` verification.

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
