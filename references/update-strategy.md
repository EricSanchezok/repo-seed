# Update strategy: ownership, conflicts, and preservation

This is the authoritative description of how repo-seed re-runs (the update mode) behave. The short version: **upstream evolves the structure, downstream keeps its knowledge; a re-run refreshes only what you did not touch and never deletes what you added.**

## Ownership model

repo-seed records every file it seeds in `.repo-seed/manifest.json` with:

- `path` — the seeded file's path.
- `sha256` — the file's content hash at seed time.
- `category` — one of `instruction`, `docs`, `skill`, `gate`, `github`, or `meta`.
- `capability` — the Core or optional capability that contributes the file, when applicable. Legacy optional entries may also carry `extension`.

A file is *untouched* if its current sha256 equals the recorded one. A file is *user-modified* if it differs. A file is *user-owned* if the seed marked it instantiated at seed time (`--user-owned`, manifest `userModified: true`): its content is the project's policy and its recorded hash is informational. User-created files (anything not in the manifest) are always preserved.

## Re-run semantics (update mode)

For each manifest entry:

1. **Untouched file**: refresh it from the current template set (upstream evolution applies). After refresh, re-record its hash.
2. **User-modified file**: do not overwrite. Ask the user: keep mine (default) / merge (apply template changes into my version, preserving my edits) / overwrite (discard my edits, record the new hash). A non-interactive run defaults to *keep mine* and reports the file as skipped.
3. **Missing file**: the file was deleted by the user. Ask: restore from template (default in non-interactive: no) / leave deleted. Never silently restore a file the user deleted.
4. **New file in a seeded directory** (e.g., a new ADR, a new postmortem): never delete, never move. Leave it alone; it is user content.
5. After the run, re-record the manifest: new hashes for refreshed files, same hashes for preserved files, entries removed only for files the user deleted and chose not to restore.

## User-owned files (instantiated policy)

Some seeded files are instantiated at seed time from project-specific input, not written verbatim from a template — notably `.agents/skills/repo-review/SKILL.md`, whose blocking requirements and manual checks are composed per project. Once instantiated, the content is the project's policy:

- The seed marks such a file user-owned (`--user-owned <path>`, recorded as `userModified: true` in the manifest).
- A re-run never refreshes a user-owned file from the template; the template is structure-only guidance.
- `verify-manifest` checks existence only for user-owned files, never the hash.
- If the user later overwrites a user-owned file deliberately, the marker stays: the project owns that policy.

## What never happens

- repo-seed never deletes a file it did not create.
- repo-seed never overwrites a user-modified seeded file without asking.
- repo-seed never commits, pushes, or registers a remote.
- repo-seed never edits files outside the seeded paths.
- repo-seed never reads `.env` files or secrets.

## Conflicts with the seed itself

If a template's target path is a user-created file (not in the manifest), the seed treats it as a conflict at first seed: ask preserve-and-merge (default) / overwrite-with-backup / skip. The manifest is written only after conflicts are resolved.

## Manifest schema

```json
{
  "version": 1,
  "repoSeedVersion": "0.6.2",
  "lastSyncCommit": "<git hash or null>",
  "config": { "license": "MIT", "branchConvention": "main", "monorepo": false },
  "governance": {
    "paths": {
      "architecture": "docs/architecture.md",
      "testing": "docs/testing.md",
      "decisions": "docs/decisions",
      "specs": "docs/specs",
      "postmortems": "docs/postmortems"
    },
    "externalSources": {}
  },
  "capabilities": {
    "version": 1,
    "items": {
      "baseline": { "state": "enabled" },
      "spec": { "state": "enabled", "mode": "repo" },
      "ci": {
        "state": "declined",
        "assessmentHash": "<normalized-facts-hash>",
        "reason": "verification is managed externally"
      }
    }
  },
  "artifactPolicy": { "version": 1, "legacy": [] },
  "files": [
    { "path": "AGENTS.md", "sha256": "<hex>", "category": "instruction" }
  ]
}
```

`version` is the backward-compatible manifest schema version. `repoSeedVersion` tracks the skill version that produced the seed. Governance paths and external sources prevent a second authority during adoption. Capability states are `enabled`, `external`, `deferred`, or `declined`; a declined/deferred recommendation is raised again only when its normalized assessment hash or the assessment rules change. `artifactPolicy.legacy` grandfathers an existing unversioned Spec or postmortem at one path and hash; changing it requires migration to Artifact-Version 1.

Core capability state includes `baseline`, `spec`, `decisions`, and `postmortems`. Baseline remains enabled in every managed repository; artifact capabilities may be repository-owned (`enabled`) or point to an adopted source (`external`). Core is never deferred or declined.

## Capability lifecycle and preservation

The capability catalog in `scripts/capabilities.mjs` is authoritative. `extensionPacks()` and `--extensions` are compatibility projections. Rules:

- **Adding**: audit, show the benefit/cost and dry-run, record user authority, then enable only the approved capability. Legacy file-backed capabilities may use `--extensions <ids>`.
- **Omission**: re-running without a previously enabled legacy flag does not disable, stop upgrading, or delete that capability. Its state in the manifest is authoritative.
- **Removing**: disabling policy or deleting capability files is an explicit user operation. It is never inferred from an omitted argument.
- **Refreshing**: enabled, untouched managed files refresh normally. User-modified and user-owned files remain preserved.
- **Equivalent systems**: register an existing mechanism as `external` with its source; do not create a competing copy.
- The AGENTS.md extension section (the `__AGENTS_EXTENSION_SECTION__` fill-in) defaults to empty; the model fills it with one link line per enabled pack. A core-only run leaves it empty.
