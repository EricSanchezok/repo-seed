# Documentation Standard (master)

This is the master specification for the `docs/AGENTS.md` that repo-seed writes into a seeded repository. It defines document structure, tiers, tutorial/reference classification, writing rules, and the hygiene checklist. The seeded `docs/AGENTS.md` is this content instantiated for the target repository; keep both in sync when this master changes.

## Document structure

Every human-facing document in the repository belongs to a tier. A document's subject and tree position fix its scope: describe its own subject at appropriate detail, direct children only by purpose and responsibility, and link to the owning descendant for lower-level detail. Testing mechanisms belong at the lowest owning level.

### The tier taxonomy: one home per fact

Each fact has one home; everywhere else, link there.

| Tier | Job | Does NOT belong there |
|---|---|---|
| Root `AGENTS.md` | Standing orders: rules an agent needs in context in every session, one to three lines each, linking its home | Stories, worked examples, restated rules |
| `docs/AGENTS.md` | The documentation standard for this repository | Repo-wide rules the root file already carries |
| `docs/architecture.md` | Ordered map: composition, modules, seams, extension points | Per-module detail (→ module docs), decision rationale (→ decision log) |
| `docs/development.md` | Contributor setup, daily workflow, commands | Runtime rationale (→ decision log) |
| `docs/testing.md` | Testing policy: tiers, verify-the-world, real entry path | Check-by-check lists that drift from actual commands |
| `docs/decisions/` | The unified decision log: why, what was given up, required verification (MADR + Class extension) | Migration plans and acceptance checklists once a decision has shipped |
| `docs/postmortems/` | Incident write-ups: the only tier where war-story narrative belongs | — |
| In-repo skills (`.agents/skills/`) | Reusable workflows and specialized decision procedures | Product and runtime contracts (→ docs) |

Placement: rationale → decisions; procedures → skills or development; incident stories → postmortems; standing orders → root `AGENTS.md` with a link.

## Tutorial or reference

Classify every in-scope document as a tutorial or a reference. A tutorial follows an ordered path to an outcome and introduces only what each step needs. A reference defines a lookup scope and current behavior without a teaching sequence. Separate substantial mixed forms; label a small secondary form clearly.

## Writing rules

- Document current state, not change history. Avoid "previously/now/no longer", PRs, commits, and stack positions in durable prose; name the live mechanism. Change stories live in commits, decisions, and postmortems.
- One physical line per paragraph. Code blocks, tables, and list structure keep their formatting.
- State complete contracts, not reasoning transcripts. Preserve behavior, failure, timing, ownership, and non-obvious orientation; delete narration and review analysis.
- Cross-reference with machine-checkable relative Markdown links, never bare filenames or numbers. Links must resolve to real files and real anchors.
- No fill-in tokens (capitalized double-underscore tokens) may remain in any doc that ships.
- Comments and JSDoc state contracts; do not restate code.

## Hygiene checklist

Hunt these in any doc:

- The same rule stated in more than one home. Keep one home and link the rest.
- Narrated history or war stories ("previously", "now", "renamed", PRs).
- Implementation-status annotations ("implemented!", "future: …"). Status rots.
- Hand-restated catalogs or inventories when source or a generator is authoritative.
- Reasoning transcripts: step-by-step implementation narration, test walkthroughs, rejected local alternatives.
- Rationale repeated beside sibling methods instead of once at the owning place.
- Paragraph walls: one paragraph carrying several rules. Split or demote.
- Emphasis inflation: bold, CAPS, "critically" everywhere. Reserve emphasis for the clause that changes behavior.
- Spec-speak in shipped decisions ("should", migration plans, acceptance checklists). A shipped decision describes what is.

## Budget

Root `AGENTS.md` has a soft budget of 100 lines. When it grows past that, relocate content to its tier home and leave a one-line link.
