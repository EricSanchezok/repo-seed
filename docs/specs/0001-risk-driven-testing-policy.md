# Risk-driven testing policy

Artifact-Version: 1
Status: Implemented

## Intent

Make every seeded repository tell agents how to choose the smallest trustworthy test set for its real risks, rather than rewarding test count or coverage percentage. The Core testing policy must define purpose, layer selection, observable evidence, maintenance cost, and project-specific test locations. Advanced techniques such as fuzzing, visual regression, mutation testing, load testing, and coverage thresholds remain risk-triggered extensions of a project's policy rather than universal defaults.

## Contract

A fresh seed's testing policy defines a test as executable evidence against a meaningful regression; maps unit, integration, and end-to-end tests to the lowest sufficiently real observation boundary; requires one primary evidence home per behavior unless risk justifies defense in depth; prefers externally observable outcomes over implementation details; limits mocks to expensive or non-deterministic boundaries; treats coverage as a diagnostic map rather than a target; and permits deletion of obsolete or redundant tests. The instantiated policy names the repository's actual test roots, naming conventions, fixtures, and runner ownership without forcing one cross-language directory layout or duplicating repository-wide command strings. Root instructions and review policy link to this contract and require reviewers to assess test value, not merely test presence.

## Plan

Revise the Core testing document and template, repo-seed instantiation guidance, resident AGENTS and review policy, contribution/review surfaces, documentation ownership rules, and interview detection guidance. Add a testing-class MADR for the durable strategy and regression coverage that exercises a fresh seed. Release the policy as repo-seed 0.6.1 without adding a semantic test-quality gate.

## Verification

Run `node --test scripts/*.test.mjs`, seed a fresh temporary repository through the real scaffold CLI, assert that its instantiated testing policy contains the risk/value/topology contract with no unresolved tokens, then run `node scripts/run-gates.mjs` and `git diff --check`.

## Evidence

- [Fresh-seed policy and governance assertions](../../scripts/governance.test.mjs)
- [Testing-topology upgrade regression](../../scripts/scaffold.test.mjs)
- [Instantiated testing policy](../testing.md)
- [Canonical testing policy template](../../references/templates/docs/testing.md.tpl)
