# Testing policy

How this repository tests, tier by tier, and the rules that keep a green suite meaningful. Commands live in the root [AGENTS.md](../AGENTS.md).

## Tiers

- **Unit** (`node --test scripts/*.test.mjs`): fast tests that stay with the code area they exercise. Prefer edge cases, error paths, event ordering, and concurrency races.
- **Integration**: tests that exercise real composition (real modules wired together, external services mocked only at the expensive or non-deterministic boundary).
- **End-to-end** (`n/a`): tests that boot the real entry point and verify the world — re-run the command or re-read the file externally, never the program's own claim.

## Rules

- **Verify the world, not the self-report.** An e2e assertion re-runs the command or re-reads the file externally; a keyword probe on the program's own output lets a broken build pass.
- **Test the real entry path.** Prefer booting the real binary/module over hand-wired harnesses; a hand-built fixture proves the bridge moves bytes, not that the shipping artifact behaves.
- **Mock only the boundary.** Mock the expensive or non-deterministic edge (network, clock, external API); keep everything downstream real.
- **Tests describe behavior, not correctness.** Change obsolete behavior with its tests; explain why in the change.
- **Assert untouched files are byte-identical** when a change should not touch them.
- **Recovery tests separate pre/post failure by step** and prove failed chunks derive no side effect.

## When a test is required

Every non-trivial behavior change adds or updates a test in the same change. A fix without a regression test is a rumor.
