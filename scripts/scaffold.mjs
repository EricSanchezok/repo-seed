#!/usr/bin/env node
// scaffold.mjs — repo-seed deterministic scaffold.
// Creates the governance baseline in a target repository:
//   - directory skeleton
//   - seeded files from templates (or built-in defaults), gate scripts copied
//     from this repository so the seeded repo runs the same verifier code
//   - .repo-seed/manifest.json recording sha256 of every seeded file
//   - pre-commit hook installation (via install-hooks.mjs)
// Modes:
//   --templates <dir>    source template directory (default: ../references/templates)
//   --dry-run            print what would happen, change nothing
//   --no-interview       non-interactive: use defaults, preserve user-modified files
//   --record-only        do not write files; recompute hashes of existing seeded
//                        files and rewrite the manifest (used after the model
//                        refines generated content)
//   --values k=v         repeatable; instantiate __K__ tokens with v
//   --user-owned <path>  mark the seeded file at <path> user-owned (instantiated
//                        at seed time); re-runs never refresh it
//   --repo-seed-version <v>  version recorded in the manifest
// Zero dependencies; Node >= 18. Exits non-zero on error.
import { mkdir, writeFile, readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SELF_DIR = path.dirname(fileURLToPath(import.meta.url));

export const SEEDED_CATEGORY = {
  instruction: 'instruction',
  docs: 'docs',
  skill: 'skill',
  gate: 'gate',
  github: 'github',
  meta: 'meta',
};

export const MANIFEST_VERSION = 1;

export function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

export function defaultManifest({ repoSeedVersion = '0.4.0' } = {}) {
  return {
    version: MANIFEST_VERSION,
    repoSeedVersion,
    lastSyncCommit: null,
    config: { license: 'MIT', branchConvention: 'main', monorepo: false },
    files: [],
  };
}

// The six optional extension packs. Each pack is opt-in: nothing is enabled by
// default, and a non-interactive run seeds only the core files. The registry is
// the single source of truth for what an enabled pack adds.
export const EXTENSION_PACKS = {
  ci: {
    id: 'ci',
    title: 'CI workflow',
    files: [['.github/workflows/ci.yml', SEEDED_CATEGORY.github]],
    agentsLine: '- CI runs the gates on every push/PR: [.github/workflows/ci.yml](.github/workflows/ci.yml).',
  },
  release: {
    id: 'release',
    title: 'Release policy',
    files: [
      ['docs/release-policy.md', SEEDED_CATEGORY.docs],
      ['scripts/verify-commit-msg.mjs', SEEDED_CATEGORY.gate],
    ],
    agentsLine: '- Commit messages follow conventional commits; see [docs/release-policy.md](docs/release-policy.md).',
  },
  community: {
    id: 'community',
    title: 'Community health files',
    files: [
      ['SECURITY.md', SEEDED_CATEGORY.meta],
      ['CODE_OF_CONDUCT.md', SEEDED_CATEGORY.meta],
    ],
    agentsLine: '- Security vulnerabilities are reported per [SECURITY.md](SECURITY.md).',
  },
  codeowners: {
    id: 'codeowners',
    title: 'CODEOWNERS',
    files: [['CODEOWNERS', SEEDED_CATEGORY.meta]],
    agentsLine: '- Path-level owners live in [CODEOWNERS](CODEOWNERS); branch protection should require owner review.',
  },
  spec: {
    id: 'spec',
    title: 'Spec contract layer',
    files: [['docs/specs/README.md', SEEDED_CATEGORY.docs]],
    agentsLine: '- Non-trivial features start with a spec in [docs/specs/](docs/specs/README.md).',
  },
  'ai-disclosure': {
    id: 'ai-disclosure',
    title: 'AI disclosure policy',
    files: [['docs/ai-disclosure.md', SEEDED_CATEGORY.docs]],
    agentsLine: '- AI-assisted commits/PRs disclose participation per [docs/ai-disclosure.md](docs/ai-disclosure.md).',
  },
};

export function extensionPacks() {
  return Object.values(EXTENSION_PACKS);
}

// Resolve a comma/space-separated extension list into validated pack ids.
export function resolveExtensions(input = []) {
  const ids = new Set();
  for (const item of input) {
    for (const part of String(item).split(/[, ]+/)) {
      if (part === '') continue;
      if (!EXTENSION_PACKS[part]) {
        throw new Error(`unknown extension pack: ${part}`);
      }
      ids.add(part);
    }
  }
  return [...ids];
}

// The seeded file set: relative path -> category. This is the single source of
// truth for what repo-seed owns in a target repository. Pass the enabled
// extension pack ids to include their files; the default is core only.
export function seededFiles(extensions = []) {
  const files = [
    ['AGENTS.md', SEEDED_CATEGORY.instruction],
    ['CLAUDE.md', SEEDED_CATEGORY.instruction],
    ['docs/AGENTS.md', SEEDED_CATEGORY.docs],
    ['docs/architecture.md', SEEDED_CATEGORY.docs],
    ['docs/development.md', SEEDED_CATEGORY.docs],
    ['docs/testing.md', SEEDED_CATEGORY.docs],
    ['docs/decisions/README.md', SEEDED_CATEGORY.docs],
    ['docs/decisions/0000-use-markdown-architectural-decision-records.md', SEEDED_CATEGORY.docs],
    ['docs/decisions/0001-repo-seed-is-a-skill-not-a-template.md', SEEDED_CATEGORY.docs],
    ['docs/decisions/0002-self-governing-repository-design.md', SEEDED_CATEGORY.docs],
    ['docs/decisions/0003-repo-review-instantiated-per-project.md', SEEDED_CATEGORY.docs],
    ['docs/postmortems/README.md', SEEDED_CATEGORY.docs],
    ['.agents/skills/repo-review/SKILL.md', SEEDED_CATEGORY.skill],
    ['.agents/skills/repo-decisions/SKILL.md', SEEDED_CATEGORY.skill],
    ['scripts/verify-decisions.mjs', SEEDED_CATEGORY.gate],
    ['scripts/verify-doc-links.mjs', SEEDED_CATEGORY.gate],
    ['scripts/verify-placeholders.mjs', SEEDED_CATEGORY.gate],
    ['scripts/verify-manifest.mjs', SEEDED_CATEGORY.gate],
    ['scripts/install-hooks.mjs', SEEDED_CATEGORY.gate],
    ['CONTRIBUTING.md', SEEDED_CATEGORY.meta],
    ['LICENSE', SEEDED_CATEGORY.meta],
    ['.editorconfig', SEEDED_CATEGORY.meta],
    ['.gitattributes', SEEDED_CATEGORY.meta],
    ['.repo-seed/update-strategy.md', SEEDED_CATEGORY.meta],
    ['.github/pull_request_template.md', SEEDED_CATEGORY.github],
    ['.github/ISSUE_TEMPLATE/bug.md', SEEDED_CATEGORY.github],
    ['.github/ISSUE_TEMPLATE/feature.md', SEEDED_CATEGORY.github],
  ];
  for (const id of extensions) {
    const pack = EXTENSION_PACKS[id];
    if (!pack) throw new Error(`unknown extension pack: ${id}`);
    for (const [rel, category] of pack.files) files.push([rel, category]);
  }
  return files;
}

// Built-in defaults for files that are generated even without a template set.
// These keep the scaffold deterministic and self-contained for tests.
export function builtinDefault(rel) {
  switch (rel) {
    case '.editorconfig':
      return 'root = true\n\n[*]\nend_of_line = lf\ninsert_final_newline = true\ncharset = utf-8\n';
    case '.gitattributes':
      return '* text=auto eol=lf\n*.md text eol=lf\n*.mjs text eol=lf\n*.json text eol=lf\n';
    case '.github/pull_request_template.md':
      return [
        '## What changed',
        '',
        '## Why',
        '',
        '## Verification',
        '- [ ] Gates green (`node scripts/verify-decisions.mjs && node scripts/verify-doc-links.mjs && node scripts/verify-placeholders.mjs && node scripts/verify-manifest.mjs`)',
        '- [ ] Tests pass',
        '- [ ] Docs and decision records updated if non-trivial',
        '- [ ] External sources are cited at the owning code or decision record, when applicable',
      ].join('\n') + '\n';
    case '.github/ISSUE_TEMPLATE/bug.md':
      return [
        '---',
        'name: Bug',
        'about: Report a defect',
        'title: ""',
        'labels: bug',
        'assignees: ""',
        '---',
        '',
        '## Expected behavior',
        '',
        '## Actual behavior',
        '',
        '## Reproduction steps',
        '',
        '## Environment',
        '',
      ].join('\n');
    case '.github/ISSUE_TEMPLATE/feature.md':
      return [
        '---',
        'name: Feature request',
        'about: Suggest a capability',
        'title: ""',
        'labels: enhancement',
        'assignees: ""',
        '---',
        '',
        '## Problem',
        '',
        '## Proposed capability',
        '',
        '## Alternatives considered',
        '',
      ].join('\n');
    default:
      return null;
  }
}

export function defaultContent(rel) {
  // Fallback content for core instruction/docs files when no template set is
  // provided. Real seeds pass --templates; this keeps non-template runs usable.
  switch (rel) {
    case 'AGENTS.md':
      return '# AGENTS.md\n\nA software project.\n\nSee docs/architecture.md.\n';
    case 'CLAUDE.md':
      return '# CLAUDE.md\n\n@AGENTS.md\n';
    case 'CONTRIBUTING.md':
      return '# Contributing\n\nThank you for contributing. See docs/development.md for the daily workflow and the governance loop in AGENTS.md.\n';
    case 'LICENSE':
      return `MIT License\n\nCopyright (c) ${new Date().getFullYear()}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n`;
    default:
      return null;
  }
}

// Gate scripts are copied from this repository so the seeded repo runs the
// exact same verifier code that repo-seed ships and tests.
export async function gateScriptContent(rel) {
  const name = path.basename(rel);
  if (!name.endsWith('.mjs')) return null;
  try {
    return await readFile(path.join(SELF_DIR, name), 'utf8');
  } catch {
    return null;
  }
}

export async function collectTemplates(templatesRoot) {
  // Walk templatesRoot for *.tpl files, map to seeded rel paths.
  const map = new Map();
  async function walk(dir, prefix) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        await walk(full, path.join(prefix, e.name));
      } else if (e.name.endsWith('.tpl')) {
        const rel = path.join(prefix, e.name.slice(0, -'.tpl'.length)).split(path.sep).join('/');
        const content = await readFile(full, 'utf8');
        map.set(rel, content);
      }
    }
  }
  await walk(templatesRoot, '');
  return map;
}

// Instantiate a template: replace __TOKEN__ fill-ins with provided values.
// Unknown fill-ins remain as-is (the model resolves them later; verify-placeholders
// flags any that ship).
export function instantiate(content, values = {}) {
  let out = content;
  for (const [k, v] of Object.entries(values)) {
    out = out.split(`__${k}__`).join(v);
  }
  return out;
}

// Deterministic default fill-in values. Keeps a token-less run functional:
// the AGENTS.md extension section defaults to empty (no residue), and
// CODEOWNER_HANDLE defaults to TODO-OWNER so ext-codeowners always ships a
// valid CODEOWNERS (the model asks the user for the real handle; see
// references/interview.md Q9-Q10).
export function baseValues() {
  return {
    AGENTS_EXTENSION_SECTION: '',
    CODEOWNER_HANDLE: 'TODO-OWNER',
  };
}

async function fileSha256(abs) {
  const buf = await readFile(abs);
  return sha256(buf.toString('utf8'));
}

// Plan a seed/update run. Returns { actions, manifest }.
export async function planRun({ targetDir, templatesRoot, manifest, values, noInterview, userOwned = [], extensions = [] }) {
  const actions = [];
  const files = seededFiles(extensions);
  const extOf = new Map();
  for (const id of extensions) {
    for (const [rel] of EXTENSION_PACKS[id].files) extOf.set(rel, id);
  }
  const existing = new Map();
  for (const [rel] of files) {
    const abs = path.join(targetDir, rel);
    try {
      const st = await stat(abs);
      existing.set(rel, { exists: true, isFile: st.isFile() });
    } catch {
      existing.set(rel, { exists: false });
    }
  }
  const templateMap = templatesRoot ? await collectTemplates(templatesRoot) : new Map();

  for (const [rel, category] of files) {
    const extension = extOf.get(rel);
    let content = templateMap.get(rel) ?? null;
    if (content === null) content = builtinDefault(rel);
    if (content === null) content = await gateScriptContent(rel);
    if (content === null) content = defaultContent(rel);
    if (content === null) {
      actions.push({ rel, action: 'skip', category, reason: 'no template and no default content' });
      continue;
    }
    content = instantiate(content, values);
    const hash = sha256(content);
    const ex = existing.get(rel);
    if (!ex.exists) {
      actions.push({ rel, action: 'create', category, content, hash, extension });
      continue;
    }
    const currentHash = await fileSha256(path.join(targetDir, rel));
    if (currentHash === hash) {
      actions.push({ rel, action: 'keep', category, content, hash, currentHash, extension });
      continue;
    }
    // Refuse to regress instantiated content with unresolved placeholders.
    // A re-run that omits --values a previous run supplied would overwrite
    // the shipped, instantiated file with raw fill-in tokens. When the file
    // on disk is the recorded seeded version (unmodified) and the template
    const hasUnresolvedTokens = /__[A-Z][A-Z0-9_]*__/.test(content);
    if (hasUnresolvedTokens) {
      const recorded = manifest?.files?.find((f) => f.path === rel);
      if (recorded && recorded.sha256 === currentHash && !recorded.userModified) {
        actions.push({
          rel,
          action: 'skip',
          category,
          content,
          hash,
          currentHash,
          reason: 'template has unresolved placeholders; refusing to regress instantiated content',
          extension,
        });
        continue;
      }
    }
    // User-owned (instantiated at seed time, e.g. the project's repo-review):
    // the template is structure-only guidance; the on-disk content is the
    // policy the user owns. Never refresh it from the template, and mark the
    // manifest entry so verify-manifest checks existence only.
    if (userOwned.includes(rel)) {
      actions.push({
        rel,
        action: 'skip',
        category,
        content,
        hash,
        currentHash,
        reason: 'user-owned: instantiated at seed time; never refreshed from the template',
        userOwned: true,
        extension,
      });
      continue;
    }
    // Content differs from what we would write.
    const recorded = manifest?.files?.find((f) => f.path === rel);
    if (!recorded) {
      // Not in manifest: user file or previous non-manifest seed. Preserve.
      actions.push({
        rel,
        action: 'skip',
        category,
        content,
        hash,
        currentHash,
        reason: 'existing file not in manifest (user file)',
        extension,
      });
      continue;
    }
    if (recorded.sha256 === currentHash) {
      // Untouched since seed: refresh. Exception: a user-modified (user-owned)
      // file stays untouched even when the recorded hash matches — the user
      // took it over; only existence is verified for it.
      if (recorded.userModified) {
        actions.push({
          rel,
          action: 'skip',
          category,
          content,
          hash,
          currentHash,
          reason: 'user-modified since seed',
          userModified: true,
          extension,
        });
      } else {
        actions.push({ rel, action: 'update', category, content, hash, currentHash, extension });
      }
    } else {
      // User-modified since seed: preserve by default and mark the manifest
      // entry so verify-manifest checks existence only, never the hash.
      actions.push({
        rel,
        action: 'skip',
        category,
        content,
        hash,
        currentHash,
        reason: 'user-modified since seed',
        userModified: true,
        extension,
      });
    }
  }
  // Preservation semantics for previously-seeded extension files whose pack is
  // not enabled in this run: keep them on disk and in the manifest untouched.
  // Never auto-delete an extension file the user already has.
  const enabledRels = new Set(files.map(([rel]) => rel));
  for (const entry of manifest?.files ?? []) {
    if (entry.extension && !enabledRels.has(entry.path)) {
      const abs = path.join(targetDir, entry.path);
      try {
        const st = await stat(abs);
        if (st.isFile()) {
          actions.push({
            rel: entry.path,
            action: 'skip',
            category: entry.category,
            reason: 'extension not enabled; preserved',
            extension: entry.extension,
          });
        }
      } catch {
        // file absent; nothing to preserve
      }
    }
  }
  return { actions, manifest };
}

export async function applyPlan({ targetDir, actions, manifest, dryRun }) {
  const written = [];
  const skipped = [];
  for (const a of actions) {
    if (a.action === 'create' || a.action === 'update') {
      const abs = path.join(targetDir, a.rel);
      if (!dryRun) {
        await mkdir(path.dirname(abs), { recursive: true });
        await writeFile(abs, a.content, 'utf8');
      }
      written.push(a.rel);
      if (!dryRun) {
        const entry = manifest.files.find((f) => f.path === a.rel);
        if (entry) {
          entry.sha256 = a.hash;
          entry.category = a.category;
          if (a.extension) entry.extension = a.extension;
          delete entry.userModified; // instantiated content was replaced; clear the marker
        } else {
          const ne = { path: a.rel, sha256: a.hash, category: a.category };
          if (a.extension) ne.extension = a.extension;
          manifest.files.push(ne);
        }
      }
    } else if (a.action === 'skip' || a.action === 'conflict') {
      skipped.push({ rel: a.rel, reason: a.reason ?? a.action });
      if (!dryRun && (a.userModified || a.userOwned)) {
        const entry = manifest.files.find((f) => f.path === a.rel);
        if (entry) entry.userModified = true; // ownership marker; verify-manifest checks existence only
      }
    }
  }
  return { written, skipped };
}

// Record-only: recompute hashes from the existing manifest entries (core and
// extension files alike) and rewrite the manifest without touching any file.
// Entries whose file no longer exists are dropped; userModified and extension
// markers are preserved. Used after the model refines generated content so the
// manifest matches the shipped state.
export async function recordOnly({ targetDir, manifest, userOwned = [] }) {
  const out = [];
  for (const entry of manifest?.files ?? []) {
    const abs = path.join(targetDir, entry.path);
    try {
      const st = await stat(abs);
      if (!st.isFile()) continue;
      const hash = await fileSha256(abs);
      const ne = { path: entry.path, sha256: hash, category: entry.category };
      if (entry.extension) ne.extension = entry.extension;
      if (userOwned.includes(entry.path) || entry.userModified) ne.userModified = true; // user-owned content: hash is informational
      out.push(ne);
    } catch {
      // file absent: leave it out of the manifest
    }
  }
  manifest.files = out;
  return manifest;
}


function parseValues(flags) {
  const values = {};
  const entries = flags.get('values');
  if (entries === undefined) return values;
  const list = Array.isArray(entries) ? entries : [entries];
  for (const item of list) {
    const eq = item.indexOf('=');
    if (eq > 0) values[item.slice(0, eq)] = item.slice(eq + 1);
  }
  return values;
}
function parseListFlag(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

// Parse flags supporting both `--key value` and `--key=value` forms.
// Repeatable flags (--values) accumulate into arrays.
function parseFlags(args) {
  const flags = new Map();
  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    if (eq !== -1) {
      const key = a.slice(2, eq);
      const val = a.slice(eq + 1);
      if (flags.has(key)) {
        const existing = flags.get(key);
        flags.set(key, Array.isArray(existing) ? [...existing, val] : [existing, val]);
      } else {
        flags.set(key, val);
      }
      continue;
    }
    const key = a.slice(2);
    const next = args[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      if (flags.has(key)) {
        const existing = flags.get(key);
        flags.set(key, Array.isArray(existing) ? [...existing, next] : [existing, next]);
      } else {
        flags.set(key, next);
      }
      i++;
    } else {
      flags.set(key, '');
    }
  }
  return flags;
}

async function main() {
  const args = process.argv.slice(2);
  const targetDir = args[0];
  if (!targetDir) {
    console.error('usage: scaffold.mjs <target-dir> [--templates <dir>] [--dry-run] [--no-interview] [--record-only] [--values k=v] [--extensions ci,release] [--user-owned <path>] [--repo-seed-version <v>]');
    process.exit(2);
  }
  const flags = parseFlags(args);
  const templatesRoot = flags.get('templates');
  const dryRun = flags.has('dry-run');
  const noInterview = flags.has('no-interview');
  const record = flags.has('record-only');
  const userOwned = parseListFlag(flags.get('user-owned'));
  const extensions = resolveExtensions(parseListFlag(flags.get('extensions')));
  const repoSeedVersion = flags.get('repo-seed-version') ?? '0.4.0';

  let manifest = defaultManifest({ repoSeedVersion });
  try {
    const raw = await readFile(path.join(targetDir, '.repo-seed', 'manifest.json'), 'utf8');
    manifest = JSON.parse(raw);
  } catch {
    // no existing manifest
  }

  if (record) {
    const updated = await recordOnly({ targetDir, manifest, userOwned });
    if (flags.has('repo-seed-version')) updated.repoSeedVersion = repoSeedVersion;
    if (!dryRun) {
      await mkdir(path.join(targetDir, '.repo-seed'), { recursive: true });
      await writeFile(path.join(targetDir, '.repo-seed', 'manifest.json'), JSON.stringify(updated, null, 2) + '\n', 'utf8');
    }
    console.log(`scaffold: record-only ${dryRun ? '[dry-run] ' : ''}complete (${updated.files.length} entries)`);
    return;
  }

  // Defaults keep a token-less run deterministic: the AGENTS.md extension
  // section defaults to empty (no residue), and CODEOWNER_HANDLE defaults to
  // the TODO-OWNER placeholder so ext-codeowners always ships a valid
  // CODEOWNERS (the model asks the user for the real handle; see
  // references/interview.md Q9).
  const values = { ...baseValues(), ...parseValues(flags) };
  const { actions, manifest: m } = await planRun({
    targetDir,
    templatesRoot,
    manifest,
    values,
    noInterview,
    userOwned,
    extensions,
  });
  const { written, skipped } = await applyPlan({ targetDir, actions, manifest: m, dryRun });

  if (!dryRun) {
    await mkdir(path.join(targetDir, '.repo-seed'), { recursive: true });
    await writeFile(path.join(targetDir, '.repo-seed', 'manifest.json'), JSON.stringify(m, null, 2) + '\n', 'utf8');
  }

  for (const w of written) console.log(`scaffold: ${dryRun ? '[dry-run] would write' : 'wrote'} ${w}`);
  for (const s of skipped) console.log(`scaffold: skipped ${s.rel} (${s.reason})`);
  console.log(`scaffold: ${dryRun ? 'dry-run complete' : 'complete'} (${written.length} written, ${skipped.length} skipped)`);
}

const isMain =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  main().catch((e) => {
    console.error('scaffold: fatal', e);
    process.exit(2);
  });
}
