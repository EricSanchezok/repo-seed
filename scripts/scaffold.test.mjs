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
} from './scaffold.mjs';
import { installHook, hookScript, HOOK_NAME } from './install-hooks.mjs';
import { verifyManifest } from './verify-manifest.mjs';
import { verifyPlaceholders, findPlaceholders } from './verify-placeholders.mjs';
import { verifyLinks } from './verify-doc-links.mjs';
import { verifyDir } from './verify-decisions.mjs';

async function tmpdir() {
  return mkdtemp(path.join(os.tmpdir(), 'seed-test-'));
}

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
    assert.ok(content.includes('verify-decisions.mjs'));
    const st = await stat(hookPath);
    assert.ok(st.mode & 0o100, 'hook must be executable');
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test('hookScript embeds the repo root and the four gates', () => {
  const s = hookScript('/some/repo');
  assert.ok(s.includes('cd "/some/repo"'));
  assert.ok(s.includes('verify-decisions.mjs'));
  assert.ok(s.includes('verify-doc-links.mjs'));
  assert.ok(s.includes('verify-placeholders.mjs'));
  assert.ok(s.includes('verify-manifest.mjs'));
  assert.ok(s.includes('git diff --cached --check'));
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
    const { actions } = await planRun({
      targetDir: target,
      templatesRoot: null,
      manifest: defaultManifest(),
      values: {},
      dryRun: false,
      noInterview: true,
    });
    const manifest = defaultManifest();
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
