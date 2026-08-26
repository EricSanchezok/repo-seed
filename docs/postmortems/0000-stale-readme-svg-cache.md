# Stale README SVG cache

Artifact-Version: 1

## Executive summary
The redesigned governance and workflow SVGs were committed and present on the remote `main` branch, but GitHub continued to display their previous bytes because both replacements reused their published asset paths. Local rendering and repository gates verified source correctness, not the public cache boundary. Published image replacements now use new semantic paths so a redesign changes the requested URL.

## Summary
The README visual redesign replaced the contents of `assets/governance.svg` and `assets/workflow.svg` in place. The generated hero changed from SVG to WebP and appeared immediately because its path changed, while the two same-path SVGs remained stale in the public README. A user screenshot exposed the mismatch after the redesign was merged to `main`.

## Timeline
- 2026-08-20: Commit `cae68ed` published the README visual redesign; local SVG rendering and repository gates passed.
- 2026-08-20: The public GitHub README displayed the new hero and the previous governance and workflow diagrams.
- 2026-08-20: Remote source inspection confirmed that `origin/main` contained the redesigned SVG markup, isolating the failure to the published image-cache boundary.
- 2026-08-20: The diagrams moved to new semantic asset paths and the README references migrated with them.

## Root cause
The delivery check treated committed file content as equivalent to rendered public content. That assumption does not hold for README images served through browser and GitHub proxy caches keyed by URL. Because the two SVG URLs stayed stable, every source-level check passed while readers could continue receiving cached bytes. The hero unintentionally demonstrated the missing guardrail: its new `.webp` path forced a fresh request.

## Guardrails
- [Decision 0006](../decisions/0006-readme-image-cache-safe-paths.md) requires a new semantic path for a meaningfully changed published README image.
- Published visual QA verifies the remote README after push when image bytes or references change; source inspection remains useful but is not considered delivery verification.
- The README owns the canonical asset references, and obsolete visual paths are removed after migration so reviewers cannot select the wrong version.
