# Review policy standard: derive repo-review per project

repo-seed ships *procedure* skills statically (repo-decisions, bound to the MADR standard) but *policy* skills are instantiated per project. repo-review is policy: its blocking requirements and manual checks must name the target project's real rules and failure modes. The template carries the universal core; the model composes the project-specific parts at seed time using this standard. After instantiation the file is user-owned (manifest `userModified: true`) and is never refreshed by a re-run; upstream evolves its structure only.

## Inputs (all available at seed time)

1. AGENTS.md hard rules — the governance loop and any "never/always" rules.
2. docs/architecture.md — module map and seams.
3. docs/testing.md — regression risks, layer-selection policy, actual test topology, evidence rules, and maintenance budget.
4. Interview answers, especially Q8 (known pitfalls, review red lines, invariants).
5. Stack manifests detected in the analysis (language, framework, storage, build).

## Derivation procedure

### Project blocking requirements (`__REVIEW_PROJECT_BLOCKING__`)

Blocking requirements are hard gates a reviewer enforces. Derive them from:

- Hard rules stated in AGENTS.md: a rule phrased as "never/always" is a blocking requirement.
- Q8 red lines: deployment order, forbidden tools, schema obligations — restated as review gates.
- Machine-unprovable invariants from architecture.md: ownership, sync obligations, migration discipline.

Rules:

- Include only what a reviewer can verify in a diff.
- Never restate what CI already proves; a green gate is not a review finding.
- Keep the count small (at most five); each item must be checkable against a change.
- Treat the repository-governance skill router as one aggregate requirement; do not consume the five-item budget by restating each route separately.
- If nothing project-specific applies, replace the token with: "None beyond the universal requirements."

### Project manual checks (`__REVIEW_PROJECT_CHECKS__`)

Manual checks rank remaining risk by the project's real failure modes. Derive one check per meaningful risk surface from the stack catalog:

| Stack family | Typical risk surfaces |
|---|---|
| Go service (e.g. gin + PostgreSQL) | context/goroutine lifecycle, transaction boundaries and outbox consistency, migration safety (idempotent, rollback path), rate-limit boundaries, schema → OpenAPI/SDK mirror drift |
| TypeScript/React application | provider/context boundaries, event-sync races, schema changes that require regenerating SDK/OpenAPI mirrors, browser-rendered provider behavior, memoization/derived-state correctness |
| Python service | import side effects, async task lifecycle, migration/ETL idempotency |
| Agent platform or agent-facing product | exact prompts, tool schemas, results, and diagnostics a model receives; hidden internal agents; session reuse decisions |
| Any project | security boundaries, performance hot paths, public contract drift |

For each selected surface, name the failure mode and where to look; do not write "check concurrency" — write what to trace (races before publication, cancellation during awaits, cleanup on error). If nothing applies, replace the token with: "None beyond the universal checks below."

For a selected risk surface, derive test guidance from the project's testing policy rather than demanding more tests generically. Name the observable contract, its primary test location, and the lowest sufficiently real boundary. Ask for defense in depth only when the impact justifies duplicate evidence, and never turn coverage percentage or test count into a semantic review proxy.

### Composition rules

- Never invent commands or file paths; take them from the analysis or omit.
- Never copy checks from another repository; the value is project specificity.
- Keep the universal blocking requirements verbatim; add project items under their own heading.
- Imperative, present tense; one requirement per numbered item; link the owning doc where one exists.

## Worked example (Go forum service)

Blocking:

1. **Deployment order:** code changes land via PR and merge before any server-side change (user red line).
2. **Migration safety:** every migration is idempotent with a rollback path, exercised in dev before cutover.
3. **Search index consistency:** the database stays the source of truth; the search index rebuilds as a projection, never the reverse.

Checks:

- **Transaction/outbox:** enqueue and commit stay in one transaction; the worker reloads from the database, not from memory events.
- **Rate-limit boundaries:** new write paths share the existing rate-limit singleton; no path bypasses the auth lookup.
- **Schema mirrors:** a new API field lands in OpenAPI, the TS/Dart mirrors, fixtures, and route tests in the same diff.

## Worked example (agent platform)

Blocking:

1. **Schema changes regenerate SDK/OpenAPI mirrors** in the same diff.
2. **No forbidden subagents** (user red line).
3. **Red-green:** a fix demonstrates the escaped behavior failing before the change and passing afterward, or links the existing deterministic reproduction that already owns it.

Checks:

- **Model perspective:** inspect the exact prompts, schemas, and diagnostics a model receives across modes; verify stable text verbatim.
- **Provider boundaries:** the affected route renders in a real browser against an isolated instance, not just a unit mount.
- **Event sync:** state projections update on every mutation path, including eviction and refresh.
