# README visuals use generated art and native diagrams

## Status
Accepted
Class: process

## Context and Problem Statement
The README needs both an identifiable first impression and precise explanations of the governance model and seeding workflow. A single visual medium does not serve both jobs well: hand-authored SVG is exact but made the hero feel like a generic product interface, while generated artwork can establish a distinctive identity but is unreliable for dense labels and durable technical content.

## Decision Drivers
- The hero must communicate the seed-to-governed-repository idea before a reader starts the prose.
- Technical labels must remain exact, legible, accessible, and easy to update with the product.
- The three visuals must share one restrained developer-tool palette and editorial tone.
- README text, rather than pixels inside an image, must own the project name and primary tagline.
- Repository weight must stay reasonable for a documentation-only asset.

## Considered Options
- Keep every visual as a hand-authored SVG.
- Generate every visual as a raster image.
- Use generated raster art for the hero and native SVG for technical diagrams — the chosen option.

## Decision Outcome
The README uses `assets/hero.webp` as a text-free generated illustration of a seed becoming an ordered repository system. The visible project name and tagline remain semantic Markdown. `assets/governance-map.svg` and `assets/seed-workflow.svg` remain hand-authored, accessible SVGs because they contain exact product terminology and structured explanations. All three assets use a near-black ink field, warm paper tones, seed green, and restrained cyan accents. Generated source is compressed to WebP for the repository-facing asset. Published replacements follow the cache-safe path contract in [0006](0006-readme-image-cache-safe-paths.md).

### Consequences
- Good: the opening image has a recognizable visual idea instead of resembling a dashboard template.
- Good: exact labels and descriptions stay selectable in source, reviewable in diffs, and independent of image-generation text quality.
- Good: the README has a semantic level-one heading even when images do not load.
- Trade-off: the hero is not infinitely scalable and requires regeneration or art editing for major composition changes.
- Trade-off: maintaining a coherent set requires keeping the two SVGs aligned with the generated hero's palette.

## Pros and Cons of the Options
### All hand-authored SVG
- Good: small, scalable, and deterministic.
- Bad: weak fit for a distinctive atmospheric hero; encourages the same card-and-gradient vocabulary as the diagrams.

### All generated raster images
- Good: visually cohesive and fast to art-direct.
- Bad: unreliable technical text, poor diffability, and unnecessary rasterization of structured information.

### Generated hero plus native diagrams
- Good: assigns each medium to the job it handles best while keeping one visual system.
- Bad: requires two production methods and explicit palette discipline.

## Links
- [README](../../README.md) — consumer of the visual system.
- [0002](0002-self-governing-repository-design.md) — the five-layer model represented by the governance diagram.
- [0006](0006-readme-image-cache-safe-paths.md) — cache-safe paths for published image replacements.
