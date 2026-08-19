# Specs

Lightweight spec contract layer. A spec answers "what will be built" before implementation; the decision log records "what was decided". Write a spec for any non-trivial feature, then reference it from the implementing change.

## Lifecycle

- **Draft** — proposed; under discussion. File name: `draft-<title>.md`.
- **Approved** — reviewed and accepted; implementation may start. Rename to `<NNNN>-<title>.md` (sequential).
- **Implemented** — shipped; the spec describes what exists. Mark with `Status: Implemented` and link the decision record.
- **Superseded** — replaced by a newer spec; keep the old file and link the new one. Never rewrite a superseded spec into its opposite.

## Template

```markdown
# <Title>

Status: Draft

## Background
Why this feature exists; the problem it solves.

## Goals
The concrete outcomes. Non-goals: what this explicitly does not do.

## Interface contract
Exact behavior, inputs, outputs, error cases, and side effects a caller can
rely on. This is the verification contract — tests must exercise it.

## Verification
How to prove the spec is met: test commands, acceptance checks, edge cases.
```

## Rules

- One spec per feature; keep it under ~200 lines (a spec that needs more is two features).
- The implementing PR updates the spec status and links the decision record.
- A spec is a contract, not a design essay: state behavior, not implementation narrative.
