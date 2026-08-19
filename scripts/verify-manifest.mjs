#!/usr/bin/env node
// verify-manifest.mjs — manifest gate.
// Checks that every file recorded in .repo-seed/manifest.json still exists and
// matches its recorded sha256, and that seeded files are recorded.
// Files marked userModified in the manifest are checked for existence only:
// the user took them over, so the recorded hash is informational.
// Zero dependencies; Node >= 18. Exits non-zero on any violation.
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export const MANIFEST_PATH = '.repo-seed/manifest.json';

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

export async function loadManifest(repoRoot) {
  const abs = path.join(repoRoot, MANIFEST_PATH);
  try {
    const raw = await readFile(abs, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function verifyManifest(repoRoot) {
  const errors = [];
  const manifest = await loadManifest(repoRoot);
  if (!manifest) {
    return { errors: ['no manifest found at .repo-seed/manifest.json — run the repo-seed skill first'], files: [] };
  }
  if (manifest.version !== 1) {
    errors.push(`unsupported manifest version ${manifest.version} (expected 1)`);
  }
  const files = manifest.files ?? [];
  const seen = new Set();
  for (const entry of files) {
    if (!entry.path || !entry.sha256) {
      errors.push(`manifest entry missing path or sha256: ${JSON.stringify(entry)}`);
      continue;
    }
    if (seen.has(entry.path)) {
      errors.push(`duplicate manifest entry: ${entry.path}`);
    }
    seen.add(entry.path);
    const abs = path.join(repoRoot, entry.path);
    let st;
    try {
      st = await stat(abs);
    } catch {
      errors.push(`seeded file missing: ${entry.path}`);
      continue;
    }
    if (st.isDirectory()) {
      errors.push(`seeded path is a directory, expected file: ${entry.path}`);
      continue;
    }
    if (entry.userModified) {
      // User took over this seeded file; existence is the only invariant.
      continue;
    }
    const content = await readFile(abs, 'utf8');
    const hash = sha256(content);
    if (hash !== entry.sha256) {
      errors.push(`seeded file modified since seed (hash mismatch): ${entry.path}`);
    }
  }
  return { errors, files };
}

async function main() {
  const repoRoot = path.resolve(process.argv[2] ?? '.');
  const { errors, files } = await verifyManifest(repoRoot);
  if (errors.length) {
    for (const e of errors) console.error(`verify-manifest: ${e}`);
    process.exit(1);
  }
  console.log(`verify-manifest: OK (${files.length} entries)`);
}

const isMain =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  main().catch((e) => {
    console.error('verify-manifest: fatal', e);
    process.exit(2);
  });
}
