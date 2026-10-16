# Scope optional governance advice

## Status

Accepted
Class: simplification

## Context and Problem Statement

A directory scan can count vendored projects and several dependency manifests as independent owned packages. Treating that heuristic as a blocking ownership requirement creates work unrelated to the user's change.

## Decision Drivers

- Keep observations discrete and recommendations proportional.
- Preserve real safety dependencies and existing user authority.
- Avoid duplicated approval or repository-wide stalls.

## Considered Options

- Block every multi-manifest checkout until CODEOWNERS is installed.
- Remove ownership advice entirely.
- Count owned package directories and issue advisory ownership recommendations.

## Decision Outcome

Choose owned-directory counting and advisory CODEOWNERS recommendations. Resident governance evaluates the affected action's safety dependency before blocking. Missing optional tooling or unavailable evidence does not stop independent authorized work.

## Pros and Cons of the Options

Automatic blocking is simple but turns a weak layout signal into a delivery dependency. Removing the advice loses a useful ownership cue. Advisory classification retains the cue at the cost of requiring contextual judgment; actual protected-path or security requirements remain enforceable through repository policy.

## Links

- [Contract](../specs/0004-scope-governance-recommendations.md)
- [Assessment regression](../../scripts/governance.test.mjs)
