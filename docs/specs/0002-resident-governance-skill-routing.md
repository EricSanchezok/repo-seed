# Resident governance skill routing

Artifact-Version: 1
Status: Implemented

## Intent

Make a managed repository identify repo-seed as the owner of its governance layer and route agents to the correct resident or global governance skill even when many unrelated skills are installed. The routing must strengthen governance recall without making the global repo-seed skill a dependency of ordinary implementation or claiming ownership of product code.

## Contract

A fresh seed places a compact Repository governance section immediately after the project description. It states that repo-seed manages the governance layer, product code remains repository-owned, and `.repo-seed/manifest.json` is authoritative for managed files, capability state, governance paths, external sources, and installed version. The section requires `repo-review` for change review, `repo-decisions` for durable choices with meaningful alternatives, `repo-governance` for complexity/delivery/ownership/security/release/incident signals, and the global `repo-seed` skill for seeding, adoption, governance upgrades, or upstream repair. Ordinary implementation follows AGENTS and linked project documents without invoking repo-seed. If the global skill is unavailable, an agent asks rather than hand-copying upstream governance. The existing Skills section remains the link index, and tools without automatic skill activation can read the linked resident files directly.

## Plan

Update the AGENTS template and dogfood copy, clarify the global repo-seed orchestration contract, add fresh-seed assertions for identity, manifest authority, and all routing branches, then release the combined testing and routing improvements as repo-seed 0.6.1.

## Verification

Run `node --test scripts/*.test.mjs`, assert the real scaffold produces a token-free AGENTS with the management identity and skill routes, run `node scripts/run-gates.mjs`, and run `git diff --check`.

## Evidence

- [Fresh-seed routing assertions](../../scripts/governance.test.mjs)
- [Canonical AGENTS router template](../../references/templates/AGENTS.md.tpl)
- [Dogfood resident router](../../AGENTS.md)
- [Global repo-seed routing contract](../../SKILL.md)
