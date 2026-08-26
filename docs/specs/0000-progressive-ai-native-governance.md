# Progressive AI-native governance

Artifact-Version: 1
Status: Implemented

## Intent

Turn repo-seed from a one-time scaffold into a governance system that keeps intent, controls, evidence, and capability choices current as a repository grows, without enabling new process or external integrations without user authority.

## Contract

Every seeded repository receives risk-triggered specs, durable decision and incident memory, a manifest-driven gate runner, and a read-only governance audit. Optional capabilities retain explicit states and stable assessment hashes so declined advice is not repeated against unchanged facts. Managed repositories carry a resident governance skill; unmanaged repositories may be audited and adopted only through a dry-run and explicit authorization. Existing governance paths and external sources of truth are preserved rather than duplicated.

## Plan

Introduce a capability catalog and manifest migration, add artifact gates and a governance audit, make hook installation explicit and conflict-safe, then add adoption discovery and configurable governance paths. Keep legacy extension flags and v0.4 manifests compatible.

## Verification

Run `node --test scripts/*.test.mjs`, `node scripts/run-gates.mjs`, and CLI integration tests covering fresh seeds, midstream capability enablement, hook conflicts, legacy artifacts, and unmanaged adoption.

## Evidence

- [Governance behavior tests](../../scripts/governance.test.mjs)
- [Scaffold integration tests](../../scripts/scaffold.test.mjs)
- [Spec and decision separation](../decisions/0008-separate-change-contracts-from-durable-decisions.md)
- [Progressive capability governance](../decisions/0009-progressive-capability-governance.md)
- [Unified gates and hook authorization](../decisions/0010-unified-gates-and-authorized-hooks.md)
