# Architecture

This document is the ordered map of the repository: composition, modules, seams, and extension points. Read it before changing structure. Per-module detail lives in the owning module's own documentation; durable decision rationale lives in [__DECISIONS_PATH__/](../__DECISIONS_PATH__/).

__ARCHITECTURE_CONTENT__

## Conventions

- New behavior goes on documented extension points; a decision record is required when a core-flow change chooses among meaningful alternatives.
- Explicit > implicit at boundaries: defaulting is an explicit step in the owning implementation, never a hidden fallback.
- Registrations are effects: every contribution goes through the owning registry and returns a disposer.
- Opaque cross-boundary identifiers are branded types, never bare strings.

## Change procedure

1. Trace the current owners of the flow you change.
2. For a risk-boundary change, obtain an Approved spec in [__SPECS_PATH__/](../__SPECS_PATH__/).
3. Record durable design choices in [__DECISIONS_PATH__/](../__DECISIONS_PATH__/) when genuine alternatives exist.
4. Update this document and the owning module docs in the same change.
5. Run the gates; add the smallest sufficient evidence for the behavior and risk, not tests for line count.
