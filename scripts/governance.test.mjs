// governance.test.mjs — progressive capability, artifact, audit, and gate tests.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  CAPABILITIES,
  assessmentHash,
  assessCapability,
  normalizeCapabilities,
} from './capabilities.mjs';
import { auditGovernance } from './audit-governance.mjs';
import { contentSha256, initializeArtifactPolicy, safeRepositoryRelativePath } from './governance-config.mjs';
import { governanceGatePaths, runGates } from './run-gates.mjs';
import { verifyPostmortems } from './verify-postmortems.mjs';
import { verifySpecs } from './verify-specs.mjs';
import { verifyLinks } from './verify-doc-links.mjs';

const execFileAsync = promisify(execFile);
const REPO_ROOT = process.cwd();
const TEMPLATES = path.join(REPO_ROOT, 'references', 'templates');

async function tmpdir() {
  return mkdtemp(path.join(os.tmpdir(), 'governance-test-'));
}

async function writeManifest(repoRoot, overrides = {}) {
  const manifest = {
    version: 1,
    repoSeedVersion: '0.6.0',
    governance: {
      paths: {
        architecture: 'docs/architecture.md',
        testing: 'docs/testing.md',
        decisions: 'docs/decisions',
        specs: 'docs/specs',
        postmortems: 'docs/postmortems',
      },
      externalSources: {},
    },
    capabilities: {
      version: 1,
      items: {
        spec: { state: 'enabled', mode: 'repo' },
        decisions: { state: 'enabled' },
        postmortems: { state: 'enabled' },
      },
    },
    artifactPolicy: { version: 1, legacy: [] },
    files: [],
    ...overrides,
  };
  await mkdir(path.join(repoRoot, '.repo-seed'), { recursive: true });
  await writeFile(path.join(repoRoot, '.repo-seed', 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}

async function fileSnapshot(root) {
  const files = [];
  async function walk(dir, prefix = '') {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const rel = path.posix.join(prefix, entry.name);
      if (entry.isDirectory()) await walk(path.join(dir, entry.name), rel);
      else files.push([rel, contentSha256(await readFile(path.join(dir, entry.name), 'utf8'))]);
    }
  }
  await walk(root);
  return files.sort(([a], [b]) => a.localeCompare(b));
}

test('capability assessment hashes only normalized relevant facts', () => {
  const factsA = { hasTestCommand: true, hasGitHubRemote: true, hasCi: false, unrelated: 'a' };
  const factsB = { unrelated: 'b', hasCi: false, hasGitHubRemote: true, hasTestCommand: true };
  assert.equal(assessmentHash(CAPABILITIES.ci, factsA), assessmentHash(CAPABILITIES.ci, factsB));
  assert.notEqual(
    assessmentHash(CAPABILITIES.ci, factsA),
    assessmentHash({ ...CAPABILITIES.ci, recommendWhen: [...CAPABILITIES.ci.recommendWhen, 'newRule'] }, factsA)
  );
  const ci = assessCapability(CAPABILITIES.ci, factsA);
  assert.equal(ci.recommendation, 'recommended');
  assert.equal(ci.timing, 'handoff');
  assert.equal(assessCapability(CAPABILITIES.release, { hasReleaseMarkers: true, hasReleasePolicy: false }).timing, 'before-implementation');
});

test('governance paths stay repository-relative and never target env secrets', () => {
  assert.equal(safeRepositoryRelativePath('docs/specs'), true);
  assert.equal(safeRepositoryRelativePath('../outside'), false);
  assert.equal(safeRepositoryRelativePath('.env'), false);
  assert.equal(safeRepositoryRelativePath('config/.env.production'), false);
});

test('capability catalog exposes the complete progressive-governance contract', () => {
  for (const [id, capability] of Object.entries(CAPABILITIES)) {
    assert.equal(capability.id, id);
    assert.ok(['core', 'optional'].includes(capability.tier));
    assert.ok(Array.isArray(capability.files));
    assert.ok(Array.isArray(capability.prerequisites));
    assert.ok(Array.isArray(capability.signals));
    assert.ok(Array.isArray(capability.equivalentSystemSignals));
    assert.ok(capability.benefit);
    assert.ok(capability.cost);
    assert.ok(['blocking', 'advisory'].includes(capability.urgency));
    assert.ok(capability.agentsContribution);
    assert.ok(Array.isArray(capability.gateContribution));
    assert.ok(Array.isArray(capability.enableConditions));
    assert.ok(Array.isArray(capability.upgradeConditions));
    assert.ok(Array.isArray(capability.reevaluateConditions));
  }
});

test('declined capability is suppressed until relevant facts change', () => {
  const facts = { hasTestCommand: true, hasGitHubRemote: true, hasCi: false };
  const hash = assessmentHash(CAPABILITIES.ci, facts);
  const declined = { state: 'declined', assessmentHash: hash, reason: 'verification is managed elsewhere' };
  assert.equal(assessCapability(CAPABILITIES.ci, facts, declined).recommendation, 'suppressed');

  const changed = { ...facts, hasCi: true };
  const result = assessCapability(CAPABILITIES.ci, changed, declined);
  assert.equal(result.recommendation, 'satisfied-external');
  assert.notEqual(result.assessmentHash, hash);
});

test('CLI records declined capability reason and assessment hash for suppression', async () => {
  const root = await tmpdir();
  try {
    await execFileAsync('git', ['init'], { cwd: root });
    await execFileAsync('git', ['remote', 'add', 'origin', 'https://github.com/example/project.git'], { cwd: root });
    await writeFile(path.join(root, 'package.json'), JSON.stringify({ scripts: { test: 'node --test' } }) + '\n');
    const facts = { hasTestCommand: true, hasGitHubRemote: true, hasCi: false };
    const hash = assessmentHash(CAPABILITIES.ci, facts);
    const cli = path.join(REPO_ROOT, 'scripts', 'scaffold.mjs');
    await execFileAsync(process.execPath, [
      cli,
      root,
      '--templates', TEMPLATES,
      '--no-interview',
      '--capability-state', 'ci=declined',
      '--capability-assessment', `ci=${hash}`,
      '--capability-reason', 'ci=verification is managed by the parent pipeline',
    ]);
    const result = await auditGovernance(root);
    const ci = result.capabilities.find((capability) => capability.id === 'ci');
    assert.equal(ci.recommendation, 'suppressed');
    assert.equal(ci.assessmentHash, hash);
    assert.equal(ci.recordedReason, 'verification is managed by the parent pipeline');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('v0.4 extension entries migrate into capability state without disabling Core', () => {
  const manifest = {
    version: 1,
    repoSeedVersion: '0.4.0',
    files: [{ path: '.github/workflows/ci.yml', extension: 'ci' }],
  };
  normalizeCapabilities(manifest);
  assert.equal(manifest.capabilities.items.baseline.state, 'enabled');
  assert.equal(manifest.capabilities.items.spec.state, 'enabled');
  assert.equal(manifest.capabilities.items.ci.state, 'enabled');
});

test('Spec v1 enforces lifecycle, sections, and permanent evidence', async () => {
  const root = await tmpdir();
  try {
    await mkdir(path.join(root, 'docs', 'specs'), { recursive: true });
    await writeManifest(root);
    const valid = `# Change contract

Artifact-Version: 1
Status: Implemented

## Intent
Preserve the public behavior.

## Contract
The CLI exits zero after installing governance.

## Plan
Install through the scaffold entry point.

## Verification
Run the integration test.

## Evidence
- [Integration test](../../scripts/scaffold.test.mjs)
`;
    const specPath = path.join(root, 'docs', 'specs', '0000-change-contract.md');
    await writeFile(specPath, valid);
    assert.deepEqual((await verifySpecs(root)).errors, []);

    await writeFile(specPath, valid.replace('Status: Implemented', 'Status: Draft'));
    assert.ok((await verifySpecs(root)).errors.some((error) => error.includes('Draft status')));

    await writeFile(specPath, valid.replace('- [Integration test](../../scripts/scaffold.test.mjs)', 'Evidence pending.'));
    assert.ok((await verifySpecs(root)).errors.some((error) => error.includes('permanent repository artifact')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('legacy Spec is grandfathered by path and hash but must migrate when changed', async () => {
  const root = await tmpdir();
  try {
    const rel = 'docs/specs/0000-legacy.md';
    await mkdir(path.join(root, 'docs', 'specs'), { recursive: true });
    const legacy = '# Legacy spec\n\nOld format retained.\n';
    await writeFile(path.join(root, rel), legacy);
    const manifest = await writeManifest(root, { artifactPolicy: undefined });
    await initializeArtifactPolicy(root, manifest);
    await writeFile(path.join(root, '.repo-seed', 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    assert.deepEqual((await verifySpecs(root)).errors, []);

    await writeFile(path.join(root, rel), `${legacy}\nChanged.\n`);
    assert.ok((await verifySpecs(root)).errors.some((error) => error.includes('Artifact-Version')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('Postmortem v1 requires a linked permanent guardrail', async () => {
  const root = await tmpdir();
  try {
    await mkdir(path.join(root, 'docs', 'postmortems'), { recursive: true });
    await writeManifest(root);
    const valid = `# Incident

Artifact-Version: 1

## Executive summary
An escaped defect exposed a missing invariant.

## Summary
The system accepted invalid state.

## Timeline
- Detection and repair.

## Root cause
The boundary lacked executable verification.

## Guardrails
- [Regression test](../../scripts/governance.test.mjs)
`;
    const postmortem = path.join(root, 'docs', 'postmortems', '0000-incident.md');
    await writeFile(postmortem, valid);
    assert.deepEqual((await verifyPostmortems(root)).errors, []);
    await writeFile(postmortem, valid.replace('- [Regression test](../../scripts/governance.test.mjs)', 'Add a test later.'));
    assert.ok((await verifyPostmortems(root)).errors.some((error) => error.includes('Guardrails')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('governance runner uses manifest gates, skips commit-msg and external capabilities', async () => {
  const root = await tmpdir();
  try {
    await mkdir(path.join(root, 'scripts'), { recursive: true });
    await writeFile(path.join(root, 'scripts', 'verify-ok.mjs'), 'process.exit(0);\n');
    await writeFile(path.join(root, 'scripts', 'verify-disabled.mjs'), 'process.exit(9);\n');
    await writeFile(path.join(root, 'scripts', 'verify-commit-msg.mjs'), 'process.exit(9);\n');
    const manifest = await writeManifest(root, {
      capabilities: { version: 1, items: { ci: { state: 'external' } } },
      files: [
        { path: 'scripts/verify-ok.mjs', category: 'gate' },
        { path: 'scripts/verify-disabled.mjs', category: 'gate', capability: 'ci' },
        { path: 'scripts/verify-commit-msg.mjs', category: 'gate' },
      ],
    });
    assert.deepEqual(governanceGatePaths(manifest), ['scripts/verify-ok.mjs']);
    assert.deepEqual(await runGates(root), { errors: [], gates: ['scripts/verify-ok.mjs'] });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('governance audit is read-only and reports discrete repository facts', async () => {
  const root = await tmpdir();
  try {
    await writeFile(path.join(root, 'package.json'), JSON.stringify({ scripts: { test: 'node --test' } }) + '\n');
    await mkdir(path.join(root, '.github', 'workflows'), { recursive: true });
    await writeFile(path.join(root, '.github', 'workflows', 'ci.yml'), 'name: ci\n');
    const before = await fileSnapshot(root);
    const result = await auditGovernance(root);
    const after = await fileSnapshot(root);
    assert.deepEqual(after, before);
    assert.equal(result.managed, false);
    assert.equal(result.facts.hasTestCommand, true);
    assert.equal(result.facts.hasCi, true);
    assert.equal(result.facts.packageCount, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('scaffold CLI installs hooks only with explicit authorization; dry-run stays zero-write', async () => {
  const root = await tmpdir();
  try {
    await mkdir(path.join(root, '.git'), { recursive: true });
    const cli = path.join(REPO_ROOT, 'scripts', 'scaffold.mjs');
    await execFileAsync(process.execPath, [cli, root, '--templates', TEMPLATES, '--dry-run', '--hooks', 'install', '--no-interview']);
    await assert.rejects(stat(path.join(root, '.repo-seed', 'manifest.json')));
    await assert.rejects(stat(path.join(root, '.git', 'hooks', 'pre-commit')));

    await execFileAsync(process.execPath, [cli, root, '--templates', TEMPLATES, '--hooks', 'install', '--no-interview']);
    assert.ok((await stat(path.join(root, '.repo-seed', 'manifest.json'))).isFile());
    assert.match(await readFile(path.join(root, '.git', 'hooks', 'pre-commit'), 'utf8'), /run-gates\.mjs --staged/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('scaffold CLI reports and skips hook installation outside Git', async () => {
  const root = await tmpdir();
  try {
    const cli = path.join(REPO_ROOT, 'scripts', 'scaffold.mjs');
    const result = await execFileAsync(process.execPath, [cli, root, '--templates', TEMPLATES, '--hooks', 'install', '--no-interview']);
    assert.match(result.stderr, /hook skipped \(not a git repository/);
    assert.ok((await stat(path.join(root, '.repo-seed', 'manifest.json'))).isFile());
    const manifest = JSON.parse(await readFile(path.join(root, '.repo-seed', 'manifest.json'), 'utf8'));
    assert.equal(manifest.capabilities.items.hook, undefined);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('adoption dry-run discovers existing paths without creating a second authority', async () => {
  const root = await tmpdir();
  try {
    await mkdir(path.join(root, 'docs', 'adr'), { recursive: true });
    await writeFile(path.join(root, 'ARCHITECTURE.md'), '# Existing architecture\n');
    await writeFile(path.join(root, 'docs', 'adr', 'README.md'), '# Existing decisions\n');
    const before = await fileSnapshot(root);
    const cli = path.join(REPO_ROOT, 'scripts', 'scaffold.mjs');
    await execFileAsync(process.execPath, [cli, root, '--templates', TEMPLATES, '--adopt', '--dry-run', '--no-interview']);
    assert.deepEqual(await fileSnapshot(root), before);
    await assert.rejects(stat(path.join(root, 'docs', 'architecture.md')));
    await assert.rejects(stat(path.join(root, '.repo-seed', 'manifest.json')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('approved adoption records non-standard files as user-owned and keeps one authority', async () => {
  const root = await tmpdir();
  try {
    await mkdir(path.join(root, 'docs', 'adr'), { recursive: true });
    await writeFile(path.join(root, 'ARCHITECTURE.md'), '# Existing architecture\n');
    await writeFile(path.join(root, 'docs', 'adr', '0001-existing.md'), '# Existing decision\n');
    const cli = path.join(REPO_ROOT, 'scripts', 'scaffold.mjs');
    await execFileAsync(process.execPath, [cli, root, '--templates', TEMPLATES, '--adopt', '--no-interview']);
    const manifest = JSON.parse(await readFile(path.join(root, '.repo-seed', 'manifest.json'), 'utf8'));
    assert.equal(manifest.governance.paths.architecture, 'ARCHITECTURE.md');
    assert.equal(manifest.governance.paths.decisions, 'docs/adr');
    assert.equal(manifest.capabilities.items.decisions.state, 'external');
    assert.equal(manifest.files.find((entry) => entry.path === 'ARCHITECTURE.md').userModified, true);
    await assert.rejects(stat(path.join(root, 'docs', 'architecture.md')));
    assert.deepEqual((await verifyLinks(root)).errors, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('generic external source mode creates local pointers and skips duplicate Core systems', async () => {
  const root = await tmpdir();
  try {
    const cli = path.join(REPO_ROOT, 'scripts', 'scaffold.mjs');
    await execFileAsync(process.execPath, [
      cli,
      root,
      '--templates', TEMPLATES,
      '--no-interview',
      '--external-source', 'decisions=https://example.com/decisions/ABC-1',
      '--external-source', 'specs=https://example.com/requirements/REQ-7',
      '--external-source', 'postmortems=https://example.com/incidents/INC-3',
    ]);
    const manifest = JSON.parse(await readFile(path.join(root, '.repo-seed', 'manifest.json'), 'utf8'));
    assert.equal(manifest.capabilities.items.spec.state, 'external');
    assert.equal(manifest.capabilities.items.decisions.state, 'external');
    assert.match(await readFile(path.join(root, 'docs', 'specs', 'README.md'), 'utf8'), /REQ-7/);
    assert.match(await readFile(path.join(root, 'docs', 'decisions', 'README.md'), 'utf8'), /ABC-1/);
    assert.ok(!manifest.files.some((entry) => entry.path === 'scripts/verify-specs.mjs'));
    assert.ok(!manifest.files.some((entry) => entry.path === 'docs/decisions/0000-use-markdown-architectural-decision-records.md'));
    assert.deepEqual((await verifyLinks(root)).errors, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('fully instantiated fresh seed passes its own manifest-selected gates', async () => {
  const root = await tmpdir();
  try {
    const cli = path.join(REPO_ROOT, 'scripts', 'scaffold.mjs');
    const decisionIndex = [
      '- [0000 — Use Markdown Architectural Decision Records](0000-use-markdown-architectural-decision-records.md)',
      '- [0001 — repo-seed is a skill](0001-repo-seed-is-a-skill-not-a-template.md)',
      '- [0002 — Self-governing repository design](0002-self-governing-repository-design.md)',
      '- [0003 — repo-review per project](0003-repo-review-instantiated-per-project.md)',
    ].join('\n');
    const values = {
      PROJECT_ONE_LINER: 'A test repository.',
      TEST_COMMAND: 'node --test',
      LINT_COMMAND: 'n/a',
      RUNTIME_PREREQUISITE: 'Node >= 18',
      ARCHITECTURE_CONTENT: '## Modules\n\n- `src/` owns product code.',
      E2E_COMMAND: 'n/a',
      REVIEW_PROJECT_BLOCKING: 'None beyond the universal requirements.',
      REVIEW_PROJECT_CHECKS: 'None beyond the universal checks below.',
      COPYRIGHT_HOLDER: 'Test Maintainers',
      YEAR: '2026',
      DECISION_INDEX: decisionIndex,
      POSTMORTEM_INDEX: 'None yet.',
    };
    const args = [cli, root, '--templates', TEMPLATES, '--no-interview'];
    for (const [key, value] of Object.entries(values)) args.push('--values', `${key}=${value}`);
    await execFileAsync(process.execPath, args);
    await execFileAsync(process.execPath, [
      cli,
      root,
      '--record-only',
      '--repo-seed-version', '0.6.0',
      '--user-owned', '.agents/skills/repo-review/SKILL.md',
    ]);
    assert.deepEqual((await runGates(root)).errors, []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
