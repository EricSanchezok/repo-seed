# Architecture

This document is the ordered map of the repository: composition, modules, seams, and extension points. Read it before changing structure. Per-module detail lives in the owning module's own documentation; decision rationale lives in [docs/decisions/](decisions/README.md).

__ARCHITECTURE_CONTENT__

## Conventions

- New behavior goes on documented extension points; changing a core flow requires a decision record.
- Explicit > implicit at boundaries: defaulting is an explicit step in the owning implementation, never a hidden fallback.
- Registrations are effects: every contribution goes through the owning registry and returns a disposer.
- Opaque cross-boundary identifiers are branded types, never bare strings.

## Change procedure

1. Trace the current owners of the flow you change.
2. Add or update a decision record in [docs/decisions/](decisions/README.md) (use the `repo-decisions` skill).
3. Update this document and the owning module docs in the same change.
4. Run the gates; add tests for the behavior, not just for the lines.
