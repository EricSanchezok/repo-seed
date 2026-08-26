#!/usr/bin/env node
// scaffold.mjs — repo-seed deterministic scaffold.
// Creates the governance baseline in a target repository:
//   - directory skeleton
//   - seeded files from templates (or built-in defaults), gate scripts copied
//     from this repository so the seeded repo runs the same verifier code
//   - .repo-seed/manifest.json recording sha256 of every seeded file
//   - optional, explicitly requested pre-commit hook installation
// Modes:
//   --templates <dir>    source template directory (default: ../references/templates)
//   --dry-run            print what would happen, change nothing
//   --no-interview       non-interactive: use defaults, preserve user-modified files
//   --record-only        do not write files; recompute hashes of existing seeded
//                        files and rewrite the manifest (used after the model
//                        refines generated content)
//   --adopt              reuse detected governance paths in an unmanaged repo
//   --hooks install|skip mutate local Git hooks only when explicitly requested
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
import {
  CAPABILITIES,
  CAPABILITY_STATES,
  assessCapabilities,
  capabilityForFile,
  capabilityCatalog,
  defaultCapabilityState,
  extensionCapabilities,
  normalizeCapabilities,
} from './capabilities.mjs';
import { collectGovernanceFacts } from './audit-governance.mjs';
import {
  DEFAULT_GOVERNANCE_PATHS,
  initializeArtifactPolicy,
  refreshArtifactPolicy,
  safeRepositoryRelativePath,
} from './governance-config.mjs';
import { installCommitMsgHook, installHook } from './install-hooks.mjs';

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

export function defaultManifest({ repoSeedVersion = '0.6.0' } = {}) {
  return {
    version: MANIFEST_VERSION,
    repoSeedVersion,
    lastSyncCommit: null,
    config: { license: 'MIT', branchConvention: 'main', monorepo: false },
    governance: { paths: { ...DEFAULT_GOVERNANCE_PATHS }, externalSources: {} },
    capabilities: defaultCapabilityState(),
    files: [],
  };
}

// Backward-compatible extension view over the capability catalog. `spec`
// remains accepted as a legacy extension id, but its files are now core.
export const EXTENSION_PACKS = Object.fromEntries(
  capabilityCatalog()
    .filter((capability) => capability.legacyExtension)
    .map((capability) => [capability.id, {
      id: capability.id,
      title: capability.title,
      files: capability.tier === 'core' ? [] : capability.files,
      agentsLine: capability.agentsLine ?? '- Risk-boundary changes use an Approved spec in [docs/specs/](docs/specs/README.md).',
      deprecated: capability.tier === 'core',
    }])
);

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
const CAPABILITY_SOURCE_KIND = Object.freeze({ decisions: 'decisions', spec: 'specs', postmortems: 'postmortems' });

function externalSupportFile(rel, capability, governancePaths, externalSources) {
  const kind = CAPABILITY_SOURCE_KIND[capability];
  if (!kind || !externalSources?.[kind]) return false;
  if (capability === 'decisions' && rel === '.agents/skills/repo-decisions/SKILL.md') return true;
  const configured = governancePaths[kind];
  return rel === `${configured}/README.md`;
}

export function seededFiles(extensions = [], {
  governancePaths = DEFAULT_GOVERNANCE_PATHS,
  externalCapabilities = [],
  externalSources = {},
} = {}) {
  const files = capabilityCatalog()
    .filter((capability) => capability.tier === 'core')
    .flatMap((capability) => capability.files.map(([rel, category]) => [rel, category, capability.id]));
  const external = new Set(externalCapabilities);
  const filtered = files.filter(([rel, , capability]) => {
    if (capability && external.has(capability) && !externalSupportFile(rel, capability, governancePaths, externalSources)) return false;
    if (governancePaths.architecture !== DEFAULT_GOVERNANCE_PATHS.architecture && rel === DEFAULT_GOVERNANCE_PATHS.architecture) return false;
    if (governancePaths.testing !== DEFAULT_GOVERNANCE_PATHS.testing && rel === DEFAULT_GOVERNANCE_PATHS.testing) return false;
    if (governancePaths.decisions !== DEFAULT_GOVERNANCE_PATHS.decisions && rel.startsWith(`${DEFAULT_GOVERNANCE_PATHS.decisions}/`)) return false;
    if (governancePaths.specs !== DEFAULT_GOVERNANCE_PATHS.specs && rel.startsWith(`${DEFAULT_GOVERNANCE_PATHS.specs}/`)) return false;
    if (governancePaths.postmortems !== DEFAULT_GOVERNANCE_PATHS.postmortems && rel.startsWith(`${DEFAULT_GOVERNANCE_PATHS.postmortems}/`)) return false;
    return true;
  });
  for (const id of extensions) {
    const pack = EXTENSION_PACKS[id];
    if (!pack) throw new Error(`unknown extension pack: ${id}`);
    for (const [rel, category] of pack.files) filtered.push([rel, category, id]);
  }
  return filtered;
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
        '- [ ] Gates green (`node scripts/run-gates.mjs`)',
        '- [ ] Tests pass',
        '- [ ] Approved spec linked for a risk-boundary change; durable decisions recorded only when genuine alternatives exist',
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
    ARCHITECTURE_PATH: DEFAULT_GOVERNANCE_PATHS.architecture,
    TESTING_PATH: DEFAULT_GOVERNANCE_PATHS.testing,
    DECISIONS_PATH: DEFAULT_GOVERNANCE_PATHS.decisions,
    SPECS_PATH: DEFAULT_GOVERNANCE_PATHS.specs,
    POSTMORTEMS_PATH: DEFAULT_GOVERNANCE_PATHS.postmortems,
    DECISIONS_RULE: 'Durable architecture and process decisions use MADR in `docs/decisions/`. Status flows Proposed → Accepted → Superseded by NNNN. A superseded record is never rewritten into its opposite.',
  };
}

function externalPointerContent(kind, source) {
  const labels = {
    architecture: 'Architecture source of truth',
    testing: 'Testing source of truth',
    decisions: 'Decision source of truth',
    specs: 'Spec source of truth',
    postmortems: 'Incident source of truth',
  };
  return `# ${labels[kind] ?? 'External governance source'}\n\nThe authoritative ${kind} record is [maintained externally](<${source.location}>). This repository file is a stable pointer for agents and reviewers; do not duplicate or rewrite the external record here.\n\nRecord repository-specific evidence as links back to the authoritative record and preserve its stable identifier in changes that implement it.\n`;
}

function externalDecisionSkillContent(source) {
  const destination = source.type === 'repository' ? `../../../${source.location}` : source.location;
  return `---\nname: repo-decisions\ndescription: Use when work creates, changes, reviews, or supersedes a durable decision governed by the repository's external decision source of truth\n---\n\n# Working with external decisions\n\nThe authoritative decision system is [external](<${destination}>). Do not create a parallel MADR record in this repository.\n\n1. Read the authoritative record and preserve its stable identifier in the implementing Spec, change, or review.\n2. Follow that system's status, approval, ownership, and supersession rules.\n3. Keep repository-specific proof as links from the authoritative record when possible.\n4. Ask before changing the configured source of truth or connecting an external system.\n`;
}

function externalContentFor(rel, manifest) {
  const paths = manifest.governance.paths;
  const sources = manifest.governance.externalSources ?? {};
  for (const kind of ['architecture', 'testing']) {
    if (sources[kind]?.type === 'link' && rel === paths[kind]) return externalPointerContent(kind, sources[kind]);
  }
  for (const kind of ['decisions', 'specs', 'postmortems']) {
    if (sources[kind]?.type === 'link' && rel === `${paths[kind]}/README.md`) return externalPointerContent(kind, sources[kind]);
  }
  if (sources.decisions && rel === '.agents/skills/repo-decisions/SKILL.md') return externalDecisionSkillContent(sources.decisions);
  return null;
}

async function fileSha256(abs) {
  const buf = await readFile(abs);
  return sha256(buf.toString('utf8'));
}

function backfillFileCapabilities(manifest) {
  for (const entry of manifest.files ?? []) {
    entry.capability ??= capabilityForFile(entry.path) ?? undefined;
  }
}

// Plan a seed/update run. Returns { actions, manifest }.
export async function planRun({ targetDir, templatesRoot, manifest, values, noInterview, userOwned = [], extensions = [], adopt = false }) {
  const actions = [];
  values = { ...baseValues(), ...values };
  normalizeCapabilities(manifest);
  backfillFileCapabilities(manifest);
  await initializeArtifactPolicy(targetDir, manifest);
  manifest.governance ??= { paths: { ...DEFAULT_GOVERNANCE_PATHS }, externalSources: {} };
  manifest.governance.paths = { ...DEFAULT_GOVERNANCE_PATHS, ...(manifest.governance.paths ?? {}) };
  for (const id of extensions) {
    if (CAPABILITIES[id]?.tier === 'optional') manifest.capabilities.items[id] = { state: 'enabled' };
  }
  const activeExtensions = extensionCapabilities()
    .filter((capability) => manifest.capabilities.items[capability.id]?.state === 'enabled')
    .map((capability) => capability.id);
  const externalCapabilities = Object.entries(manifest.capabilities.items)
    .filter(([, value]) => value?.state === 'external')
    .map(([id]) => id);
  const files = seededFiles(activeExtensions, {
    governancePaths: manifest.governance.paths,
    externalCapabilities,
    externalSources: manifest.governance.externalSources,
  });
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

  for (const [rel, category, capabilityKey] of files) {
    const capability = CAPABILITIES[capabilityKey] ? capabilityKey : undefined;
    const extension = capability && CAPABILITIES[capability]?.tier === 'optional' ? capability : undefined;
    let content = externalContentFor(rel, manifest) ?? templateMap.get(rel) ?? null;
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
      actions.push({ rel, action: 'create', category, content, hash, extension, capability });
      continue;
    }
    const currentHash = await fileSha256(path.join(targetDir, rel));
    if (currentHash === hash) {
      actions.push({ rel, action: 'keep', category, content, hash, currentHash, extension, capability });
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
          capability,
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
        capability,
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
        ...(adopt ? { userOwned: true } : {}),
        extension,
        capability,
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
          capability,
        });
      } else {
        actions.push({ rel, action: 'update', category, content, hash, currentHash, extension, capability });
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
        capability,
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
          if (a.capability) entry.capability = a.capability;
          delete entry.userModified; // instantiated content was replaced; clear the marker
        } else {
          const ne = { path: a.rel, sha256: a.hash, category: a.category };
          if (a.extension) ne.extension = a.extension;
          if (a.capability) ne.capability = a.capability;
          manifest.files.push(ne);
        }
      }
    } else if (a.action === 'skip' || a.action === 'conflict') {
      skipped.push({ rel: a.rel, reason: a.reason ?? a.action });
      if (!dryRun && (a.userModified || a.userOwned)) {
        const entry = manifest.files.find((f) => f.path === a.rel);
        if (entry) {
          entry.userModified = true; // ownership marker; verify-manifest checks existence only
        } else if (a.userOwned && a.currentHash) {
          const adopted = { path: a.rel, sha256: a.currentHash, category: a.category, userModified: true };
          if (a.extension) adopted.extension = a.extension;
          if (a.capability) adopted.capability = a.capability;
          manifest.files.push(adopted);
        }
      }
    }
  }
  return { written, skipped };
}

// Record-only: recompute hashes for the current seeded surface without touching
// any governed file. The union with seededFiles() is intentional: it lets an
// older manifest adopt newly-added Core files after the scaffold/update phase.
// Existing entries outside the current surface remain tracked so an explicit
// capability-state change never silently abandons a previously managed file.
export async function recordOnly({ targetDir, manifest, userOwned = [] }) {
  normalizeCapabilities(manifest);
  backfillFileCapabilities(manifest);
  manifest.governance ??= { paths: { ...DEFAULT_GOVERNANCE_PATHS }, externalSources: {} };
  manifest.governance.paths = { ...DEFAULT_GOVERNANCE_PATHS, ...(manifest.governance.paths ?? {}) };
  const activeExtensions = extensionCapabilities()
    .filter((capability) => manifest.capabilities.items[capability.id]?.state === 'enabled')
    .map((capability) => capability.id);
  const externalCapabilities = Object.entries(manifest.capabilities.items)
    .filter(([, value]) => value?.state === 'external')
    .map(([id]) => id);
  const candidates = new Map((manifest?.files ?? []).map((entry) => [entry.path, { ...entry }]));
  for (const [rel, category, capabilityKey] of seededFiles(activeExtensions, {
    governancePaths: manifest.governance.paths,
    externalCapabilities,
    externalSources: manifest.governance.externalSources,
  })) {
    const capability = CAPABILITIES[capabilityKey] ? capabilityKey : undefined;
    const extension = capability && CAPABILITIES[capability]?.tier === 'optional' ? capability : undefined;
    if (candidates.has(rel)) {
      const existing = candidates.get(rel);
      existing.category ??= category;
      if (extension) existing.extension ??= extension;
      if (capability) existing.capability ??= capability;
      continue;
    }
    candidates.set(rel, {
      path: rel,
      category,
      ...(extension ? { extension } : {}),
      ...(capability ? { capability } : {}),
    });
  }
  const out = [];
  for (const entry of candidates.values()) {
    if (!safeRepositoryRelativePath(entry.path)) continue;
    const abs = path.join(targetDir, entry.path);
    try {
      const st = await stat(abs);
      if (!st.isFile()) continue;
      const hash = await fileSha256(abs);
      const ne = { path: entry.path, sha256: hash, category: entry.category };
      if (entry.extension) ne.extension = entry.extension;
      if (entry.capability) ne.capability = entry.capability;
      if (userOwned.includes(entry.path) || entry.userModified) ne.userModified = true; // user-owned content: hash is informational
      out.push(ne);
    } catch {
      // file absent: leave it out of the manifest
    }
  }
  manifest.files = out;
  await refreshArtifactPolicy(targetDir, manifest);
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

function parseAssignments(value) {
  const result = {};
  for (const item of parseListFlag(value)) {
    const eq = item.indexOf('=');
    if (eq > 0) result[item.slice(0, eq)] = item.slice(eq + 1);
  }
  return result;
}

async function firstExisting(targetDir, candidates) {
  for (const candidate of candidates) {
    try { await stat(path.join(targetDir, candidate)); return candidate; } catch {}
  }
  return null;
}

export async function discoverAdoption(targetDir) {
  const paths = { ...DEFAULT_GOVERNANCE_PATHS };
  const externalSources = {};
  const alternatives = {
    architecture: ['docs/architecture.md', 'ARCHITECTURE.md'],
    testing: ['docs/testing.md', 'TESTING.md'],
    decisions: ['docs/decisions', 'docs/adr', 'adr', 'decisions'],
    specs: ['docs/specs', 'docs/rfcs', 'rfcs'],
    postmortems: ['docs/postmortems', 'docs/incidents', 'postmortems'],
  };
  for (const [kind, candidates] of Object.entries(alternatives)) {
    const existing = await firstExisting(targetDir, candidates);
    if (!existing) continue;
    paths[kind] = existing;
    if (existing !== DEFAULT_GOVERNANCE_PATHS[kind]) {
      externalSources[kind] = { type: 'repository', location: existing };
    }
  }
  return { paths, externalSources };
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
    console.error('usage: scaffold.mjs <target-dir> [--templates <dir>] [--dry-run] [--no-interview] [--record-only] [--adopt] [--hooks install|skip] [--values k=v] [--extensions ci,release] [--capability-state id=state] [--governance-path kind=path] [--external-source kind=https://url] [--user-owned <path>] [--repo-seed-version <v>]');
    process.exit(2);
  }
  const flags = parseFlags(args);
  const templatesRoot = flags.get('templates');
  const dryRun = flags.has('dry-run');
  const noInterview = flags.has('no-interview');
  const record = flags.has('record-only');
  const adopt = flags.has('adopt');
  const userOwned = parseListFlag(flags.get('user-owned'));
  const extensions = resolveExtensions(parseListFlag(flags.get('extensions')));
  const repoSeedVersion = flags.get('repo-seed-version') ?? '0.6.0';
  const hookMode = flags.get('hooks') || 'skip';
  if (!['install', 'skip'].includes(hookMode)) throw new Error('--hooks must be install or skip');

  let manifest = defaultManifest({ repoSeedVersion });
  try {
    const raw = await readFile(path.join(targetDir, '.repo-seed', 'manifest.json'), 'utf8');
    manifest = JSON.parse(raw);
  } catch {
    // no existing manifest
  }

  if (adopt && !manifest.files?.length) {
    const adoption = await discoverAdoption(targetDir);
    manifest.governance = adoption;
    normalizeCapabilities(manifest);
    for (const [kind, source] of Object.entries(adoption.externalSources)) {
      const capability = kind === 'specs' ? 'spec' : kind === 'postmortems' ? 'postmortems' : kind;
      if (manifest.capabilities.items[capability]) manifest.capabilities.items[capability] = { state: 'external', source };
      if (['architecture', 'testing'].includes(kind)) {
        try {
          const sourcePath = path.join(targetDir, source.location);
          if ((await stat(sourcePath)).isFile()) {
            manifest.files.push({
              path: source.location,
              sha256: await fileSha256(sourcePath),
              category: SEEDED_CATEGORY.docs,
              userModified: true,
            });
          }
        } catch {}
      }
    }
    const facts = await collectGovernanceFacts(targetDir);
    for (const assessment of assessCapabilities(facts, manifest.capabilities.items)) {
      if (CAPABILITIES[assessment.id].tier === 'optional' && assessment.recommendation === 'satisfied-external') {
        manifest.capabilities.items[assessment.id] = {
          state: 'external',
          assessmentHash: assessment.assessmentHash,
          reason: 'existing repository mechanism detected during adoption',
        };
      }
    }
  }
  normalizeCapabilities(manifest);
  for (const id of extensions) {
    if (CAPABILITIES[id]?.tier === 'optional') manifest.capabilities.items[id] = { state: 'enabled' };
  }
  manifest.governance ??= { paths: { ...DEFAULT_GOVERNANCE_PATHS }, externalSources: {} };
  manifest.governance.paths = { ...DEFAULT_GOVERNANCE_PATHS, ...(manifest.governance.paths ?? {}) };
  manifest.governance.externalSources ??= {};

  const governancePathAssignments = parseAssignments(flags.get('governance-path'));
  for (const [kind, rel] of Object.entries(governancePathAssignments)) {
    if (!(kind in DEFAULT_GOVERNANCE_PATHS)) throw new Error(`unknown governance path kind: ${kind}`);
    const normalized = path.posix.normalize(rel.replaceAll('\\', '/'));
    if (!safeRepositoryRelativePath(normalized)) {
      throw new Error(`governance path must stay inside the repository: ${rel}`);
    }
    manifest.governance.paths[kind] = normalized.replace(/\/$/, '');
  }

  const externalSourceAssignments = parseAssignments(flags.get('external-source'));
  for (const [kind, location] of Object.entries(externalSourceAssignments)) {
    if (!(kind in DEFAULT_GOVERNANCE_PATHS)) throw new Error(`unknown external source kind: ${kind}`);
    let parsed;
    try { parsed = new URL(location); } catch { throw new Error(`external source must be an http(s) URL for ${kind}`); }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error(`external source must be an http(s) URL for ${kind}`);
    manifest.governance.externalSources[kind] = { type: 'link', location: parsed.href };
    const capability = kind === 'specs' ? 'spec' : kind === 'postmortems' ? 'postmortems' : kind;
    if (manifest.capabilities.items[capability]) {
      manifest.capabilities.items[capability] = { state: 'external', source: manifest.governance.externalSources[kind] };
    }
  }
  await initializeArtifactPolicy(targetDir, manifest);

  const stateAssignments = parseAssignments(flags.get('capability-state'));
  const reasonAssignments = parseAssignments(flags.get('capability-reason'));
  const assessmentAssignments = parseAssignments(flags.get('capability-assessment'));
  for (const [id, state] of Object.entries(stateAssignments)) {
    if (!CAPABILITIES[id]) throw new Error(`unknown capability: ${id}`);
    if (!CAPABILITY_STATES.has(state)) throw new Error(`invalid capability state for ${id}: ${state}`);
    if (CAPABILITIES[id].tier === 'core' && !['enabled', 'external'].includes(state)) {
      throw new Error(`core capability ${id} must be enabled or external`);
    }
    if (id === 'baseline' && state !== 'enabled') {
      throw new Error('baseline capability must remain enabled in a managed repository');
    }
    const sourceKind = CAPABILITY_SOURCE_KIND[id];
    if (state === 'external' && sourceKind && !manifest.governance.externalSources[sourceKind]) {
      throw new Error(`external core capability ${id} requires --external-source ${sourceKind}=<url> or an adopted repository source`);
    }
    if (['declined', 'deferred'].includes(state) && !/^[a-f0-9]{64}$/.test(assessmentAssignments[id] ?? '')) {
      throw new Error(`${state} capability ${id} requires --capability-assessment ${id}=<sha256>`);
    }
    if (['declined', 'deferred'].includes(state) && !reasonAssignments[id]?.trim()) {
      throw new Error(`${state} capability ${id} requires --capability-reason ${id}=<reason>`);
    }
    manifest.capabilities.items[id] = {
      ...manifest.capabilities.items[id],
      state,
      ...(reasonAssignments[id] ? { reason: reasonAssignments[id] } : {}),
      ...(assessmentAssignments[id] ? { assessmentHash: assessmentAssignments[id] } : {}),
    };
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
  const configuredPaths = manifest.governance.paths;
  const values = {
    ...baseValues(),
    ARCHITECTURE_PATH: configuredPaths.architecture,
    TESTING_PATH: configuredPaths.testing,
    DECISIONS_PATH: configuredPaths.decisions,
    SPECS_PATH: configuredPaths.specs,
    POSTMORTEMS_PATH: configuredPaths.postmortems,
    DECISIONS_RULE: manifest.capabilities.items.decisions?.state === 'external'
      ? `Durable architecture and process decisions follow the registered external source of truth linked from [${configuredPaths.decisions}/](${configuredPaths.decisions}/). Do not create a parallel MADR log.`
      : baseValues().DECISIONS_RULE.replace('docs/decisions', configuredPaths.decisions),
    ...parseValues(flags),
  };
  const { actions, manifest: m } = await planRun({
    targetDir,
    templatesRoot,
    manifest,
    values,
    noInterview,
    userOwned,
    extensions,
    adopt,
  });
  const { written, skipped } = await applyPlan({ targetDir, actions, manifest: m, dryRun });

  if (!dryRun) {
    await mkdir(path.join(targetDir, '.repo-seed'), { recursive: true });
    if (hookMode === 'install') {
      try {
        const hook = await installHook(path.resolve(targetDir));
        if (hook.status === 'conflict') {
          console.warn(`scaffold: preserved custom pre-commit hook at ${hook.hookPath}`);
          m.capabilities.items.hook = { state: 'external', reason: 'custom pre-commit hook preserved' };
        } else {
          m.capabilities.items.hook = { state: 'enabled' };
          console.log(`scaffold: ${hook.status} pre-commit hook at ${hook.hookPath}`);
          if (m.capabilities.items.release?.state === 'enabled') {
            const commitMsg = await installCommitMsgHook(hook.gitDir);
            console.log(`scaffold: ${commitMsg.status} commit-msg hook at ${commitMsg.hookPath}`);
          }
        }
      } catch (error) {
        console.warn(`scaffold: hook skipped (${error.message})`);
      }
    }
    await writeFile(path.join(targetDir, '.repo-seed', 'manifest.json'), JSON.stringify(m, null, 2) + '\n', 'utf8');
  }

  if (adopt) {
    for (const [kind, source] of Object.entries(m.governance.externalSources ?? {})) {
      console.log(`scaffold: ${dryRun ? '[dry-run] would register' : 'registered'} ${kind} source-of-truth ${source.type}:${source.location}`);
    }
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
