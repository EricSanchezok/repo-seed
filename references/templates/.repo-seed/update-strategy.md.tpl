# Update strategy: ownership, conflicts, and preservation

This is the authoritative description of how repo-seed re-runs (the update mode) behave. The short version: **upstream evolves the structure, downstream keeps its knowledge; a re-run refreshes only what you did not touch and never deletes what you added.**

## Ownership model

repo-seed records every file it seeds in `.repo-seed/manifest.json` with:

- `path` — the seeded file's path.
- `sha256` — the file's content hash at seed time.
- `category` — one of `instruction` (AGENTS.md, CLAUDE.md), `docs` (docs/**), `skill` (.agents/skills/repo-review, .agents/skills/repo-decisions), `gate` (scripts/**), `github` (.github/**), `meta` (CONTRIBUTING.md, LICENSE, .editorconfig, .gitattributes, .repo-seed/**).

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
  "repoSeedVersion": "0.4.0",
  "lastSyncCommit": "<git hash or null>",
  "config": { "license": "MIT", "branchConvention": "main", "monorepo": false },
  "files": [
    { "path": "AGENTS.md", "sha256": "<hex>", "category": "instruction" }
  ]
}
```

`version` is the manifest schema version; a future breaking schema change prompts a re-seed instead of a silent migration. `repoSeedVersion` tracks the skill version that produced the seed; it is informational for now.
