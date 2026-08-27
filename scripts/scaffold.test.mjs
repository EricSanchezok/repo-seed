// scaffold.test.mjs — tests for the scaffold, manifest, and hook logic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir, stat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  sha256,
  seededFiles,
  collectTemplates,
  instantiate,
  planRun,
  applyPlan,
  recordOnly,
  defaultManifest,
  extensionPacks,
  resolveExtensions,
  baseValues,
  discoverAdoption,
} from './scaffold.mjs';
import { installHook, hookScript, HOOK_NAME, MANAGED_MARKER } from './install-hooks.mjs';
import { verifyManifest } from './verify-manifest.mjs';
import { verifyPlaceholders, findPlaceholders } from './verify-placeholders.mjs';
import { verifyLinks } from './verify-doc-links.mjs';
import { verifyDir } from './verify-decisions.mjs';

async function tmpdir() {
  return mkdtemp(path.join(os.tmpdir(), 'seed-test-'));
}

// The real template set; extension pack files only have template sources there.
const REPO_TEMPLATES = path.join(process.cwd(), 'references', 'templates');

test('sha256 is deterministic and hex', () => {
  const a = sha256('hello');
  const b = sha256('hello');
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{64}$/);
});

test('seededFiles returns unique paths with categories', () => {
  const files = seededFiles();
  const paths = files.map(([p]) => p);
  assert.equal(new Set(paths).size, paths.length, 'paths must be unique');
  for (const [, cat] of files) {
    assert.ok(['instruction', 'docs', 'skill', 'gate', 'github', 'meta'].includes(cat));
  }
  assert.ok(files.some(([p]) => p === 'AGENTS.md'));
  assert.ok(files.some(([p]) => p.includes('repo-review')));
});

test('collectTemplates walks nested template dirs', async () => {
  const dir = await tmpdir();
  try {
    await mkdir(path.join(dir, 'docs'), { recursive: true });
    await writeFile(path.join(dir, 'AGENTS.md.tpl'), '# A\n__TOKEN__\n');
    await writeFile(path.join(dir, 'docs', 'testing.md.tpl'), '# T\n');
    const map = await collectTemplates(dir);
    assert.ok(map.has('AGENTS.md'));
    assert.ok(map.has('docs/testing.md'));
    assert.equal(map.get('AGENTS.md'), '# A\n__TOKEN__\n');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('instantiate replaces tokens and leaves unknown tokens', () => {
  assert.equal(instantiate('__A__ and __B__', { A: 'x' }), 'x and __B__');
});

test('testing topology token never regresses an instantiated policy on upgrade', async () => {
  const target = await tmpdir();
  try {
    const manifest = defaultManifest();
    const first = await planRun({
      targetDir: target,
      templatesRoot: REPO_TEMPLATES,
      manifest,
      values: { TEST_TOPOLOGY: '- Unit tests are colocated as `*.test.mjs`.' },
      noInterview: true,
    });
    await applyPlan({ targetDir: target, actions: first.actions, manifest, dryRun: false });
    const installed = await readFile(path.join(target, 'docs', 'testing.md'), 'utf8');
    assert.match(installed, /Unit tests are colocated/);
    assert.doesNotMatch(installed, /__TEST_TOPOLOGY__/);

    const second = await planRun({
      targetDir: target,
      templatesRoot: REPO_TEMPLATES,
      manifest,
      values: {},
      noInterview: true,
    });
    const testingAction = second.actions.find((action) => action.rel === 'docs/testing.md');
    assert.equal(testingAction.action, 'skip');
    assert.match(testingAction.reason, /unresolved placeholders/);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('planRun creates files in an empty target and records manifest', async () => {
  const target = await tmpdir();
  try {
    const { actions, manifest } = await planRun({
      targetDir: target,
      templatesRoot: null,
      manifest: defaultManifest(),
      values: {},
      dryRun: false,
      noInterview: true,
    });
    const creates = actions.filter((a) => a.action === 'create');
    assert.ok(creates.length >= 9, `expected >= 9 creates, got ${creates.length}`);
    assert.ok(actions.every((a) => a.action !== 'conflict'));

    const { written } = await applyPlan({ targetDir: target, actions, manifest, dryRun: false });
    assert.equal(written.length, creates.length);

    // Write the manifest as the CLI would
    await mkdir(path.join(target, '.repo-seed'), { recursive: true });
    await writeFile(path.join(target, '.repo-seed', 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    const raw = await readFile(path.join(target, '.repo-seed', 'manifest.json'), 'utf8');
    const m = JSON.parse(raw);
    assert.equal(m.version, 1);
    assert.equal(m.files.length, creates.length);
    const agents = m.files.find((f) => f.path === 'AGENTS.md');
    assert.ok(agents.sha256.match(/^[0-9a-f]{64}$/));
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('planRun update: untouched files refresh, user-modified files preserved', async () => {
  const target = await tmpdir();
  try {
    // First seed
    const manifest = defaultManifest();
    const { actions } = await planRun({
      targetDir: target,
      templatesRoot: null,
      manifest,
      values: {},
      dryRun: false,
      noInterview: true,
    });
    const { written } = await applyPlan({ targetDir: target, actions, manifest, dryRun: false });
    assert.ok(written.length > 0);
    await mkdir(path.join(target, '.repo-seed'), { recursive: true });
    await writeFile(path.join(target, '.repo-seed', 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    // User modifies AGENTS.md (a file the built-in seed actually creates)
    const agentsPath = path.join(target, 'AGENTS.md');
    await writeFile(agentsPath, '# User-modified AGENTS\n', 'utf8');

    // Second run: user-modified file must be preserved (skip), others refresh (update/keep)
    const { actions: actions2 } = await planRun({
      targetDir: target,
      manifest,
      values: {},
      dryRun: false,
      noInterview: true,
    });
    const agentsAction = actions2.find((a) => a.rel === 'AGENTS.md');
    assert.equal(agentsAction.action, 'skip');
    assert.ok(agentsAction.reason.includes('user-modified'));
    const licenseAction = actions2.find((a) => a.rel === 'LICENSE');
    assert.ok(['keep', 'update'].includes(licenseAction.action));
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('planRun dry-run changes nothing on disk', async () => {
  const target = await tmpdir();
  try {
    const { actions } = await planRun({
      targetDir: target,
      templatesRoot: null,
      manifest: defaultManifest(),
      values: {},
      dryRun: true,
      noInterview: true,
    });
    const { written } = await applyPlan({ targetDir: target, actions, manifest: defaultManifest(), dryRun: true });
    assert.ok(written.length > 0);
    // Nothing actually written
    await assert.rejects(stat(path.join(target, 'AGENTS.md')));
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('installHook writes an executable pre-commit hook', async () => {
  const target = await tmpdir();
  try {
    await mkdir(path.join(target, '.git'), { recursive: true });
    await installHook(target);
    const hookPath = path.join(target, '.git', 'hooks', HOOK_NAME);
    const content = await readFile(hookPath, 'utf8');
    assert.ok(content.includes('scripts/run-gates.mjs --staged'));
    const st = await stat(hookPath);
    assert.ok(st.mode & 0o100, 'hook must be executable');
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('hookScript resolves the active worktree and calls the shared runner', () => {
  const s = hookScript();
  assert.ok(s.includes('git rev-parse --show-toplevel'));
  assert.ok(s.includes('cd "$repo_root"'));
  assert.ok(s.includes('node scripts/run-gates.mjs --staged'));
  assert.ok(!s.includes('/some/repo'));
});

test('installHook preserves a custom hook and refreshes a managed hook', async () => {
  const target = await tmpdir();
  try {
    const hooks = path.join(target, '.git', 'hooks');
    await mkdir(hooks, { recursive: true });
    const hookPath = path.join(hooks, HOOK_NAME);
    await writeFile(hookPath, '#!/bin/sh\necho custom\n', 'utf8');
    const conflict = await installHook(target);
    assert.equal(conflict.status, 'conflict');
    assert.equal(await readFile(hookPath, 'utf8'), '#!/bin/sh\necho custom\n');

    await writeFile(hookPath, `#!/bin/sh\n${MANAGED_MARKER}: pre-commit\necho stale\n`, 'utf8');
    const refreshed = await installHook(target);
    assert.equal(refreshed.status, 'updated');
    assert.match(await readFile(hookPath, 'utf8'), /scripts\/run-gates\.mjs --staged/);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('installHook uses the common hooks directory for a linked worktree', async () => {
  const root = await tmpdir();
  try {
    const worktree = path.join(root, 'worktree');
    const worktreeGit = path.join(root, 'main.git', 'worktrees', 'worktree');
    const commonGit = path.join(root, 'main.git');
    await mkdir(worktree, { recursive: true });
    await mkdir(worktreeGit, { recursive: true });
    await writeFile(path.join(worktree, '.git'), `gitdir: ${worktreeGit}\n`, 'utf8');
    await writeFile(path.join(worktreeGit, 'commondir'), '../..\n', 'utf8');
    const result = await installHook(worktree);
    assert.equal(result.gitDir, commonGit);
    assert.ok((await stat(path.join(commonGit, 'hooks', HOOK_NAME))).isFile());
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('installHook fails on a non-git directory', async () => {
  const target = await tmpdir();
  try {
    await assert.rejects(installHook(target), /not a git repository/);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('verifyManifest: clean seed passes; tampered seed fails', async () => {
  const target = await tmpdir();
  try {
    const manifest = defaultManifest();
    const { actions } = await planRun({
      targetDir: target,
      templatesRoot: null,
      manifest,
      values: {},
      dryRun: false,
      noInterview: true,
    });
    await applyPlan({ targetDir: target, actions, manifest, dryRun: false });
    await mkdir(path.join(target, '.repo-seed'), { recursive: true });
    await writeFile(path.join(target, '.repo-seed', 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

    // Clean
    const clean = await verifyManifest(target);
    assert.deepEqual(clean.errors, []);

    // Tamper with a seeded file
    await writeFile(path.join(target, 'AGENTS.md'), '# tampered\n', 'utf8');
    const tampered = await verifyManifest(target);
    assert.ok(tampered.errors.some((e) => e.includes('hash mismatch')));
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('verifyPlaceholders: flags any leftover token', async () => {
  assert.deepEqual(findPlaceholders('no tokens'), []);
  assert.deepEqual(findPlaceholders('__FOO__'), ['__FOO__']);
  assert.deepEqual(findPlaceholders('__PROJECT_ONE_LINER__'), ['__PROJECT_ONE_LINER__']);
  assert.deepEqual(findPlaceholders('a __A__ b __B__ c'), ['__A__', '__B__']);
});

test('verifyPlaceholders: clean repo passes, injected token fails', async () => {
  const target = await tmpdir();
  try {
    await mkdir(path.join(target, 'docs'), { recursive: true });
    await writeFile(path.join(target, 'AGENTS.md'), '# Fine\n', 'utf8');
    const clean = await verifyPlaceholders(target);
    assert.deepEqual(clean.errors, []);

    await writeFile(path.join(target, 'docs', 'x.md'), '# X\n__LEFTOVER__\n', 'utf8');
    const bad = await verifyPlaceholders(target);
    assert.ok(bad.errors.some((e) => e.includes('__LEFTOVER__')));
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('verifyLinks: dead link and missing anchor fail; clean passes', async () => {
  const target = await tmpdir();
  try {
    await mkdir(path.join(target, 'docs'), { recursive: true });
    await writeFile(path.join(target, 'AGENTS.md'), '# Root\n\nSee [docs/architecture.md](docs/architecture.md).\n', 'utf8');
    await writeFile(path.join(target, 'docs', 'architecture.md'), '# Architecture\n\n## Seams\n\nSee [AGENTS.md](../AGENTS.md#root).\n', 'utf8');

    // Clean
    const clean = await verifyLinks(target);
    assert.deepEqual(clean.errors, []);

    // Dead link
    await writeFile(path.join(target, 'docs', 'architecture.md'), 'See [missing](missing.md).\n', 'utf8');
    const dead = await verifyLinks(target);
    assert.ok(dead.errors.some((e) => e.includes('missing')));

    // Missing anchor
    await writeFile(path.join(target, 'docs', 'architecture.md'), 'See [AGENTS.md](../AGENTS.md#nope).\n', 'utf8');
    const anchor = await verifyLinks(target);
    assert.ok(anchor.errors.some((e) => e.includes('fragment')));
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('verifyDecisions: a real seeded repo passes the decision gate', async () => {
  // Use the actual repo's own decisions dir
  const repoRoot = path.resolve(process.cwd());
  const errors = await verifyDir(path.join(repoRoot, 'docs', 'decisions'));
  assert.deepEqual(errors, []);
});

test('repo-review template carries the two instantiation tokens', async () => {
  const repoRoot = path.resolve(process.cwd());
  const tpl = await readFile(
    path.join(repoRoot, 'references/templates/.agents/skills/repo-review/SKILL.md.tpl'),
    'utf8'
  );
  assert.ok(tpl.includes('__REVIEW_PROJECT_BLOCKING__'), 'blocking token missing');
  assert.ok(tpl.includes('__REVIEW_PROJECT_CHECKS__'), 'checks token missing');
  assert.ok(!tpl.includes('guidance, not a complete checklist'), 'stale disclaimer must be gone');
});

test('source attribution policy ships across governance surfaces', async () => {
  const target = await tmpdir();
  try {
    const { actions } = await planRun({
      targetDir: target,
      templatesRoot: REPO_TEMPLATES,
      manifest: defaultManifest(),
      values: baseValues(),
      noInterview: true,
    });
    const content = (rel) => actions.find((action) => action.rel === rel)?.content ?? '';

    assert.match(content('AGENTS.md'), /materially derived from an external source/);
    assert.match(content('docs/development.md'), /## Source attribution/);
    assert.match(content('docs/AGENTS.md'), /contracts or provenance/);
    assert.match(content('.agents/skills/repo-review/SKILL.md'), /External-source provenance is retained/);
    assert.match(content('.agents/skills/repo-decisions/SKILL.md'), /do not leave research or quantitative claims unlinked/);
    assert.match(content('docs/decisions/README.md'), /cite it descriptively in `## Links`/);
    assert.match(content('.github/pull_request_template.md'), /External sources are cited/);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('seededFiles includes the repo-review instantiation decision record', () => {
  assert.ok(
    seededFiles().some(([p]) => p === 'docs/decisions/0003-repo-review-instantiated-per-project.md')
  );
});

test('user-owned: instantiated repo-review is never refreshed and stays manifest-marked', async () => {
  const target = await tmpdir();
  const templates = await tmpdir();
  try {
    const rel = '.agents/skills/repo-review/SKILL.md';
    await mkdir(path.join(templates, '.agents/skills/repo-review'), { recursive: true });
    await writeFile(
      path.join(templates, '.agents/skills/repo-review', 'SKILL.md.tpl'),
      '# Review\n\n__REVIEW_PROJECT_BLOCKING__\n\n__REVIEW_PROJECT_CHECKS__\n',
      'utf8'
    );

    // 1. First seed: the template ships with tokens.
    const manifest = defaultManifest();
    const first = await planRun({
      targetDir: target,
      templatesRoot: templates,
      manifest,
      values: {},
      noInterview: true,
      userOwned: [],
    });
    const reviewAction = first.actions.find((a) => a.rel === rel);
    assert.equal(reviewAction.action, 'create');
    await applyPlan({ targetDir: target, actions: first.actions, manifest, dryRun: false });

    // 2. The model instantiates the policy (tokens resolved to project content).
    const instantiated =
      '# Review\n\n## Project blocking\n\n1. PR before deploy.\n\n## Checks\n\n- tx boundary.\n';
    await writeFile(path.join(target, rel), instantiated, 'utf8');

    // 3. recordOnly --user-owned marks it in the manifest.
    const recorded = await recordOnly({ targetDir: target, manifest, userOwned: [rel] });
    assert.equal(recorded.files.find((f) => f.path === rel).userModified, true);

    // 4. Re-run: user-owned file is skipped, never refreshed; marker preserved.
    const second = await planRun({
      targetDir: target,
      templatesRoot: templates,
      manifest: recorded,
      values: {},
      noInterview: true,
      userOwned: [rel],
    });
    const secondAction = second.actions.find((a) => a.rel === rel);
    assert.equal(secondAction.action, 'skip');
    assert.ok(secondAction.reason.includes('user-owned'));
    await applyPlan({ targetDir: target, actions: second.actions, manifest: recorded, dryRun: false });
    const onDisk = await readFile(path.join(target, rel), 'utf8');
    assert.equal(onDisk, instantiated, 'user-owned content must stay byte-identical');
    assert.equal(recorded.files.find((f) => f.path === rel).userModified, true);
  } finally {
    await rm(target, { recursive: true, force: true });
    await rm(templates, { recursive: true, force: true });
  }
});

test('verifyPlaceholders flags an un-instantiated repo-review', async () => {
  const target = await tmpdir();
  try {
    await mkdir(path.join(target, '.agents/skills/repo-review'), { recursive: true });
    await writeFile(
      path.join(target, '.agents/skills/repo-review', 'SKILL.md'),
      '# Review\n__REVIEW_PROJECT_BLOCKING__\n',
      'utf8'
    );
    const { errors } = await verifyPlaceholders(target);
    assert.ok(errors.some((e) => e.includes('__REVIEW_PROJECT_BLOCKING__')));
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

// --- Optional extension packs (v0.3.0) ---

test('extensionPacks preserves six legacy ids; spec is a deprecated no-op', () => {
  const packs = extensionPacks();
  assert.equal(packs.length, 6);
  const ids = packs.map((p) => p.id);
  assert.deepEqual(ids.sort(), ['ai-disclosure', 'ci', 'codeowners', 'community', 'release', 'spec']);
  for (const p of packs) {
    if (p.id === 'spec') {
      assert.equal(p.files.length, 0);
      assert.equal(p.deprecated, true);
    } else {
      assert.ok(p.files.length >= 1, `${p.id} has files`);
    }
    assert.ok(p.agentsLine.startsWith('- '), `${p.id} has an AGENTS.md line`);
  }
});

test('seededFiles(extensions) adds pack files to core', () => {
  const core = seededFiles();
  const all = seededFiles(['ci', 'release', 'community', 'codeowners', 'spec', 'ai-disclosure']);
  assert.equal(core.length, 35);
  assert.ok(all.length > core.length);
  assert.ok(all.some(([p]) => p === '.github/workflows/ci.yml'));
  assert.ok(all.some(([p]) => p === 'SECURITY.md'));
  assert.ok(all.some(([p]) => p === 'docs/specs/README.md'));
  // core files still present
  assert.ok(all.some(([p]) => p === 'AGENTS.md'));
});

test('resolveExtensions validates ids and rejects unknown', () => {
  assert.deepEqual(resolveExtensions(['ci,release', 'community']), ['ci', 'release', 'community']);
  assert.deepEqual(resolveExtensions([]), []);
  assert.throws(() => resolveExtensions(['bogus']), /unknown extension pack/);
});

test('planRun with extensions creates extension files and records extension field', async () => {
  const target = await tmpdir();
  try {
    const manifest = defaultManifest();
    const { actions } = await planRun({
      targetDir: target,
      templatesRoot: REPO_TEMPLATES,
      manifest,
      values: {},
      dryRun: false,
      noInterview: true,
      extensions: ['ci', 'release'],
    });
    const ciCreate = actions.find((a) => a.rel === '.github/workflows/ci.yml');
    assert.equal(ciCreate.action, 'create');
    assert.equal(ciCreate.extension, 'ci');
    await applyPlan({ targetDir: target, actions, manifest, dryRun: false });
    await mkdir(path.join(target, '.repo-seed'), { recursive: true });
    await writeFile(path.join(target, '.repo-seed', 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    const ciEntry = manifest.files.find((f) => f.path === '.github/workflows/ci.yml');
    assert.equal(ciEntry.extension, 'ci');
    const relEntry = manifest.files.find((f) => f.path === 'docs/release-policy.md');
    assert.equal(relEntry.extension, 'release');
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('re-run without extensions preserves previously-seeded extension files', async () => {
  const target = await tmpdir();
  try {
    // First seed with ci+release
    const manifest = defaultManifest();
    const first = await planRun({
      targetDir: target,
      templatesRoot: REPO_TEMPLATES,
      manifest,
      values: {},
      dryRun: false,
      noInterview: true,
      extensions: ['ci', 'release'],
    });
    await applyPlan({ targetDir: target, actions: first.actions, manifest, dryRun: false });
    await mkdir(path.join(target, '.repo-seed'), { recursive: true });
    await writeFile(path.join(target, '.repo-seed', 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

    // Second run WITHOUT flags: enabled capabilities remain managed and refreshable.
    const second = await planRun({
      targetDir: target,
      templatesRoot: REPO_TEMPLATES,
      manifest,
      values: {},
      dryRun: false,
      noInterview: true,
      extensions: [],
    });
    const ciAction = second.actions.find((a) => a.rel === '.github/workflows/ci.yml');
    assert.ok(['keep', 'update'].includes(ciAction.action));
    // File still on disk, manifest entry still present
    const ciAbs = path.join(target, '.github/workflows/ci.yml');
    assert.ok((await stat(ciAbs)).isFile());
    assert.ok(manifest.files.some((f) => f.path === '.github/workflows/ci.yml'));
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('default seed includes Core Spec but no optional capability files', async () => {
  const target = await tmpdir();
  try {
    const manifest = defaultManifest();
    const { actions } = await planRun({
      targetDir: target,
      templatesRoot: REPO_TEMPLATES,
      manifest,
      values: { AGENTS_EXTENSION_SECTION: '' },
      dryRun: false,
      noInterview: true,
      extensions: [],
    });
    assert.ok(!actions.some((a) => a.rel === '.github/workflows/ci.yml'));
    assert.ok(!actions.some((a) => a.rel === 'SECURITY.md'));
    assert.ok(actions.some((a) => a.rel === 'docs/specs/README.md'));
    assert.ok(actions.some((a) => a.rel === 'scripts/verify-specs.mjs'));
    // AGENTS.md content has no extension section token residue when instantiated with empty value
    const agents = actions.find((a) => a.rel === 'AGENTS.md');
    assert.ok(!agents.content.includes('__AGENTS_EXTENSION_SECTION__'));
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('recordOnly preserves extension and userModified markers', async () => {
  const target = await tmpdir();
  try {
    const manifest = defaultManifest();
    const { actions } = await planRun({
      targetDir: target,
      templatesRoot: REPO_TEMPLATES,
      manifest,
      values: {},
      dryRun: false,
      noInterview: true,
      extensions: ['ci'],
    });
    await applyPlan({ targetDir: target, actions, manifest, dryRun: false });
    await mkdir(path.join(target, '.repo-seed'), { recursive: true });
    await writeFile(path.join(target, '.repo-seed', 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
    // mark repo-review user-owned like the skill flow does
    const updated = await recordOnly({ targetDir: target, manifest, userOwned: ['.agents/skills/repo-review/SKILL.md'] });
    const ciEntry = updated.files.find((f) => f.path === '.github/workflows/ci.yml');
    assert.equal(ciEntry.extension, 'ci');
    const reviewEntry = updated.files.find((f) => f.path === '.agents/skills/repo-review/SKILL.md');
    assert.equal(reviewEntry.userModified, true);
    // entry whose file was deleted is dropped
    await rm(path.join(target, 'docs', 'architecture.md'));
    const after = await recordOnly({ targetDir: target, manifest: updated });
    assert.ok(!after.files.some((f) => f.path === 'docs/architecture.md'));
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('recordOnly adds newly introduced Core files to an older manifest', async () => {
  const target = await tmpdir();
  try {
    const manifest = defaultManifest({ repoSeedVersion: '0.4.0' });
    const first = await planRun({
      targetDir: target,
      templatesRoot: REPO_TEMPLATES,
      manifest,
      values: baseValues(),
      noInterview: true,
    });
    await applyPlan({ targetDir: target, actions: first.actions, manifest, dryRun: false });
    manifest.files = manifest.files.filter((entry) => entry.path !== 'scripts/audit-governance.mjs');
    const updated = await recordOnly({ targetDir: target, manifest });
    assert.ok(updated.files.some((entry) => entry.path === 'scripts/audit-governance.mjs'));
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('discoverAdoption reuses non-standard governance homes', async () => {
  const target = await tmpdir();
  try {
    await mkdir(path.join(target, 'docs', 'adr'), { recursive: true });
    await mkdir(path.join(target, 'docs', 'rfcs'), { recursive: true });
    await writeFile(path.join(target, 'ARCHITECTURE.md'), '# Architecture\n', 'utf8');
    await writeFile(path.join(target, 'TESTING.md'), '# Testing\n', 'utf8');
    const adoption = await discoverAdoption(target);
    assert.equal(adoption.paths.architecture, 'ARCHITECTURE.md');
    assert.equal(adoption.paths.testing, 'TESTING.md');
    assert.equal(adoption.paths.decisions, 'docs/adr');
    assert.equal(adoption.paths.specs, 'docs/rfcs');
    assert.equal(adoption.externalSources.decisions.location, 'docs/adr');
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

// --- Review fixes (ext-codeowners TODO-OWNER fallback + user-modified regression) ---

test('ext-codeowners without a handle ships @TODO-OWNER placeholder', async () => {
  const target = await tmpdir();
  try {
    // No CODEOWNER_HANDLE value passed: scaffold default 'TODO-OWNER' applies.
    const manifest = defaultManifest();
    const { actions } = await planRun({
      targetDir: target,
      templatesRoot: REPO_TEMPLATES,
      manifest,
      values: baseValues(),
      dryRun: false,
      noInterview: true,
      extensions: ['codeowners'],
    });
    const co = actions.find((a) => a.rel === 'CODEOWNERS');
    assert.equal(co.action, 'create');
    assert.ok(co.content.includes('@TODO-OWNER'), 'CODEOWNERS must fall back to @TODO-OWNER');
    assert.ok(!co.content.includes('__CODEOWNER_HANDLE__'), 'no raw token may remain');
    // And with an explicit handle the placeholder is replaced.
    const { actions: actions2 } = await planRun({
      targetDir: target,
      templatesRoot: REPO_TEMPLATES,
      manifest,
      values: { ...baseValues(), CODEOWNER_HANDLE: 'alice' },
      dryRun: false,
      noInterview: true,
      extensions: ['codeowners'],
    });
    const co2 = actions2.find((a) => a.rel === 'CODEOWNERS');
    assert.ok(co2.content.includes('@alice'));
    assert.ok(!co2.content.includes('@TODO-OWNER'));
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('user-modified seeded file is never refreshed even when disk hash matches manifest', async () => {
  const target = await tmpdir();
  try {
    // Seed core files, then mark AGENTS.md userModified in the manifest with
    // its current (matching) hash — the recorded-hash-equals-disk case.
    const manifest = defaultManifest();
    const first = await planRun({
      targetDir: target,
      templatesRoot: null,
      manifest,
      values: {},
      dryRun: false,
      noInterview: true,
    });
    await applyPlan({ targetDir: target, actions: first.actions, manifest, dryRun: false });
    const agentsEntry = manifest.files.find((f) => f.path === 'AGENTS.md');
    agentsEntry.userModified = true; // user took it over; hash stays the same on disk

    // Template now differs from the seeded content (simulate upstream change).
    const templates = await tmpdir();
    try {
      await writeFile(path.join(templates, 'AGENTS.md.tpl'), '# New upstream AGENTS\n', 'utf8');
      const second = await planRun({
        targetDir: target,
        templatesRoot: templates,
        manifest,
        values: {},
        dryRun: false,
        noInterview: true,
      });
      const agentsAction = second.actions.find((a) => a.rel === 'AGENTS.md');
      assert.equal(agentsAction.action, 'skip', 'user-modified file must skip, not update');
      assert.ok(agentsAction.reason.includes('user-modified'));
      // On-disk content untouched
      const onDisk = await readFile(path.join(target, 'AGENTS.md'), 'utf8');
      assert.ok(!onDisk.includes('New upstream'));
    } finally {
      await rm(templates, { recursive: true, force: true });
    }
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});
