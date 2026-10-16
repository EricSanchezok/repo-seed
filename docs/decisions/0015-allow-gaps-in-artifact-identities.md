# Allow gaps in artifact identities

## Status

Accepted
Class: simplification

## Context and Problem Statement

Parallel work can reserve adjacent spec numbers while only one record is present on each branch. Requiring every number to be present forces unrelated work to wait or renumber a stable reference.

## Decision Drivers

Keep identities stable, detect collisions and permit independent delivery.

## Considered Options

- Require contiguous numbering from zero on every branch.
- Remove numeric identities.
- Keep unique numeric identities and permit gaps.

## Decision Outcome

Choose unique immutable numbers with gaps allowed for specs, decisions and postmortems. Allocate the next unused number, normally max plus one, accounting for known parallel reservations. Duplicate IDs, broken links and missing superseding targets remain errors.

## Pros and Cons of the Options

Contiguous numbering is easy to count but serializes independent changes. Removing numbers breaks established references. Permitting gaps preserves those references and concurrency at the cost of losing a cosmetic sequence guarantee.

## Links

- [Governance contract](../specs/0004-scope-governance-recommendations.md)
- [Decision regression](../../scripts/verify-decisions.test.mjs)
- [Artifact regressions](../../scripts/governance.test.mjs)
