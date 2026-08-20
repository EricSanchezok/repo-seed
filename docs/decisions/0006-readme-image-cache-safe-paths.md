# Published README image replacements use cache-safe paths

## Status
Accepted
Class: bug-fix

## Context and Problem Statement
GitHub and intermediary image proxies may cache an embedded README image by URL after the repository bytes at that path change. Replacing an SVG in place can therefore leave the repository source correct while the public README continues to display the previous design.

## Decision Drivers
- A pushed README update must display deterministically without relying on a reader's cache controls.
- Image references must remain relative so forks and local renderers work.
- Asset names should describe their role rather than expose commit hashes or temporary revision numbers.
- Obsolete visual assets should not remain as ambiguous alternatives.

## Considered Options
- Replace image bytes at the existing path and wait for caches to expire.
- Add a revision query string to the existing image URL.
- Publish a meaningfully changed image at a new semantic path and update the README in the same change — the chosen option.

## Decision Outcome
A meaningfully changed published README image uses a new semantic asset path. The README reference and repository layout are updated in the same change, and the obsolete path is removed after all references migrate. The governance and workflow diagrams are published as `assets/governance-map.svg` and `assets/seed-workflow.svg`.

### Consequences
- Good: GitHub and browser caches see a new URL and request the shipped bytes immediately.
- Good: relative references continue to work in forks and local Markdown renderers.
- Good: semantic names remain readable without permanent cache-busting parameters.
- Trade-off: a future full visual replacement may require another deliberate rename.
- Trade-off: renames create larger source-control diffs than an in-place byte update.

## Pros and Cons of the Options
### Replace bytes at the existing path
- Good: smallest source diff and stable links.
- Bad: public rendering can remain stale after a successful push.

### Add a revision query string
- Good: changes the requested URL without renaming the file.
- Bad: revision bookkeeping leaks into README prose and support varies among renderers and link verifiers.

### Publish at a new semantic path
- Good: deterministic cache invalidation with portable relative links.
- Bad: requires coordinated path migration and removal of the obsolete asset.

## Links
- [0005](0005-readme-visual-system.md) — the visual system whose published paths follow this contract.
- [Postmortem 0000](../postmortems/0000-stale-readme-svg-cache.md) — the incident that exposed the missing path rule.
