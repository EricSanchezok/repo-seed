# Route governance through resident instructions

## Status

Accepted
Class: process

## Context and Problem Statement

Managed repositories already seed governance rules and three resident skills, but their AGENTS template does not explicitly identify the governance layer as repo-seed-managed or define a complete task-to-skill routing contract. In an environment with a large global skill catalog, description matching may not select the local governance skill reliably. Invoking the global repo-seed skill for every implementation task would solve recall by adding unrelated ceremony and would blur the ownership boundary between governance files and product code.

## Decision Drivers

- Make local repository policy win over competition among globally installed skills.
- Keep governance behavior available across tools with and without automatic skill activation.
- Distinguish governance-layer ownership from product-code ownership.
- Route ordinary work to resident skills and lifecycle work to the global repo-seed skill.
- Keep root AGENTS concise and avoid duplicating complete skill procedures.
- Preserve explicit authority boundaries for governance writes and integrations.

## Considered Options

- Add a compact management identity and mandatory task-to-skill router to generated AGENTS.
- Rely only on global skill descriptions and automatic discovery.
- Copy the complete resident skill procedures into AGENTS.
- Require the global repo-seed skill for every repository task.

## Decision Outcome

Chosen option: generated AGENTS contains a compact Repository governance section near the top. It names `.repo-seed/manifest.json` as the machine-readable authority, distinguishes repo-seed-managed governance from repository-owned product code, and routes review, durable decisions, governance evolution, and seed/adopt/upgrade work to `repo-review`, `repo-decisions`, `repo-governance`, and global `repo-seed` respectively. The existing Skills section owns links to resident procedures. Ordinary implementation consumes the standing rules and project documents directly; it does not invoke repo-seed merely because the repository is managed.

## Pros and Cons of the Options

The compact router is always in repository context, works when global discovery is crowded, and keeps procedures in one home; it adds a small permanent block to AGENTS and must stay aligned with resident skill names. Discovery-only routing has no local maintenance cost but is probabilistic and tool-dependent. Copying full procedures is robust but bloats root context and creates duplicate authorities. Requiring repo-seed for every task maximizes brand recall but adds irrelevant work and encourages the generator to interfere with product-code ownership.

## Links

- [Resident governance skill routing Spec](../specs/0002-resident-governance-skill-routing.md)
- [AGENTS template](../../references/templates/AGENTS.md.tpl)
- [Progressive capability governance decision](0009-progressive-capability-governance.md)
