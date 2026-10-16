# Vendored manifests created an ownership gate

Artifact-Version: 1

## Executive summary

The audit counted external benchmark dependencies as owned packages and assigned blocking urgency to optional CODEOWNERS advice. The corrected audit counts owned directories and leaves ownership advice advisory.

## Summary

A research checkout with one owned Python package and vendored benchmark manifests was classified as a multi-package repository. Its optional ownership recommendation could stop otherwise authorized work.

## Timeline

- 2026-10-16: Storage workflow review reproduced the false recommendation in a research checkout.
- 2026-10-16: The user authorized removing excessive gates and upgrading the shared governance source.

## Root cause

File count substituted for ownership, and a heuristic maturity recommendation carried a safety-blocking label without a change-specific dependency.

## Guardrails

- [Audit regression](../../scripts/governance.test.mjs) covers vendored and same-directory manifests plus a real second owned package.
- [Decision](../decisions/0014-scope-optional-governance-advice.md) scopes blocking to concrete affected actions.
