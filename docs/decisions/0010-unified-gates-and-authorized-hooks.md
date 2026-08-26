# Execute governance gates through one runner and authorize hooks separately

## Status
Accepted
Class: architecture

## Context and Problem Statement
repo-seed listed gate commands separately in AGENTS, contributor guidance, CI, and generated hooks. Each new verifier created several synchronization points, so the visible checklist could drift from enforcement. The scaffold documentation also claimed to install a hook although its real entry path did not do so. A local Git hook is a mutation of developer-owned state and may collide with a custom hook manager; generating repository files does not imply authority to install it.

## Decision Drivers
- Every enforcement surface must execute the same installed gate set.
- A newly installed verifier must become runnable without hand-editing several command lists.
- Commit-msg validation belongs to its own Git stage.
- Dry-runs and non-interactive defaults must not mutate local Git state.
- Custom hooks must never be overwritten.
- Managed hooks must remain refreshable and work from linked worktrees.

## Considered Options
- Keep duplicated gate lists and automatically install hooks during scaffold.
- Remove hooks and rely only on contributors or CI to remember gate commands.
- Select gates from the manifest through one runner and install managed hooks only with explicit authorization — the chosen route.

## Decision Outcome
`scripts/run-gates.mjs` reads `.repo-seed/manifest.json` and runs every installed `scripts/verify-*.mjs` gate whose capability is enabled. `verify-commit-msg.mjs` is excluded because it requires the commit-msg argument. AGENTS, development/contribution guidance, CI, and the managed pre-commit hook call the shared runner; `--staged` additionally performs Git's staged whitespace check.

The scaffold exposes `--hooks install|skip` and defaults to `skip`, including non-interactive runs. Installation happens only after the apply phase and never during a dry-run. A file containing the repo-seed managed marker may refresh; any custom hook is preserved and registered as an external hook capability. Managed hook scripts resolve the active repository root at runtime, and the installer resolves a linked worktree's common Git directory.

Spec and postmortem verifiers join Core. Existing unversioned records are grandfathered only by manifest path and hash; new or materially changed records use Artifact-Version 1. CI and hooks receive new gates automatically through the runner after manifest upgrade.

### Consequences
- Good: one manifest-selected command prevents command-list drift across local, CI, and contributor surfaces.
- Good: repo-seed's CLI behavior matches its stated hook contract.
- Good: custom hooks and worktrees are handled without hard-coded repository paths.
- Trade-off: a damaged manifest can prevent the runner from discovering gates, so manifest verification and upgrade tests remain critical.
- Trade-off: repositories that skip both hook and CI rely on contributors to invoke the runner.

## Pros and Cons of the Options
### Duplicated lists plus automatic hooks
- Good: each surface is readable without indirection and local enforcement appears immediately.
- Bad: lists drift, scaffold authority is too broad, and custom developer tooling can be overwritten.

### No local hooks
- Good: no mutation of developer-owned Git state.
- Bad: repositories without CI lose an early deterministic boundary.

### Manifest runner plus authorized managed hooks
- Good: one gate set, explicit authority, safe refresh, and CI/hook parity.
- Bad: adds runner and hook lifecycle code that must be tested through the real CLI.

## Links
- [Supersedes ADR 0002](0002-self-governing-repository-design.md) — retains layered governance while replacing duplicated automatic-hook enforcement with capability state and explicit authority.
- [Anthropic, “The AI-Native SDLC playbook”](https://claude.com/blog/the-ai-native-sdlc-playbook) — governance-as-the-agent-acts, continuous evaluation, and human attention at approval gates informed the execution boundary; accessed 2026-08-26.
- [Gate runner](../../scripts/run-gates.mjs) — manifest-selected execution.
- [Hook installer](../../scripts/install-hooks.mjs) — managed/custom/worktree behavior.
- [Governance behavior tests](../../scripts/governance.test.mjs) — CLI, runner, lifecycle, and authorization coverage.
