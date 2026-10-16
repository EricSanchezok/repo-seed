# Scope governance recommendations to observed ownership

Artifact-Version: 1
Status: Approved

## Intent

Prevent optional ownership tooling and vendored packages from blocking unrelated work. The user authorized this correction and downstream upgrades on 2026-10-16.

## Contract

Package count is the number of owned directories with manifests, not the number of manifest files. Conventional dependency, fixture, build and hidden directories are excluded. A multi-package observation recommends CODEOWNERS as advisory; a concrete safety dependency, not this heuristic, determines whether an action must wait. Declared test commands take precedence over language guesses. Document anchors preserve Unicode letters so valid non-English links do not become false blockers. Governance instructions reuse existing authority and continue independent work when an external dependency is unavailable.

Specs, decisions and postmortems require unique immutable numeric IDs; gaps from parallel reservations do not block delivery. Broken links and missing superseding targets remain errors.

## Plan

Correct the upstream audit, capability classification and governance skill template. Release 0.6.5 and upgrade consumers through scaffold, preserving user-owned content and optional capability state.

## Verification

Exercise the real audit on root manifests, third-party dependencies, fixtures and an owned second package. Check command detection and advisory classification. Run the complete Node test suite, scaffold dry-runs and repository gates.

## Evidence

- [Audit regression](../../scripts/governance.test.mjs)
- [Owning assessment](../../scripts/audit-governance.mjs)
