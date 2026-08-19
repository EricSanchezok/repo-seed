// verify-decisions.test.mjs — positive and negative cases for the decision log gate.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { verifyDir, sectionOrder, checkStatusAndClass } from './verify-decisions.mjs';

const VALID_BODY = `## Status
Accepted
Class: architecture

## Context and Problem Statement
Context.

## Decision Drivers
- Driver.

## Considered Options
- Option A.

## Decision Outcome
Chosen: A.

## Pros and Cons of the Options
### A
- Good.

### B
- Bad.

## Links
None.
`;

async function withTempDecisions(files, fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'seed-dec-'));
  const decisions = path.join(dir, 'docs', 'decisions');
  await mkdir(decisions, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    await writeFile(path.join(decisions, name), content);
  }
  try {
    await fn(decisions);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('sectionOrder accepts a well-formed record', () => {
  assert.equal(sectionOrder(VALID_BODY), true);
});

test('sectionOrder rejects missing required section', () => {
  const bad = VALID_BODY.replace('## Links\nNone.\n', '');
  assert.equal(sectionOrder(bad), false);
});

test('sectionOrder rejects wrong order (Links before Status)', () => {
  const bad = `## Links\nNone.\n\n${VALID_BODY}`;
  assert.equal(sectionOrder(bad), false);
});

test('checkStatusAndClass accepts valid status and class', () => {
  const errors = [];
  checkStatusAndClass('0000-x.md', VALID_BODY, [0], errors);
  assert.deepEqual(errors, []);
});

test('checkStatusAndClass rejects invalid status', () => {
  const errors = [];
  const bad = VALID_BODY.replace('## Status\nAccepted', '## Status\nMaybe');
  checkStatusAndClass('0000-x.md', bad, [0], errors);
  assert.ok(errors.some((e) => e.includes('invalid status')));
});

test('checkStatusAndClass rejects invalid class', () => {
  const errors = [];
  const bad = VALID_BODY.replace('Class: architecture', 'Class: nonsense');
  checkStatusAndClass('0000-x.md', bad, [0], errors);
  assert.ok(errors.some((e) => e.includes('invalid Class')));
});

test('checkStatusAndClass rejects superseded target that does not exist', () => {
  const errors = [];
  const bad = VALID_BODY.replace('## Status\nAccepted', '## Status\nSuperseded by [0001](0001-other.md)');
  checkStatusAndClass('0000-x.md', bad, [0], errors);
  assert.ok(errors.some((e) => e.includes('does not exist')));
});

test('checkStatusAndClass accepts superseded target that exists', () => {
  const errors = [];
  const bad = VALID_BODY.replace('## Status\nAccepted', '## Status\nSuperseded by [0001](0001-other.md)');
  checkStatusAndClass('0000-x.md', bad, [0, 1], errors);
  assert.deepEqual(errors, []);
});

test('verifyDir passes a clean directory', async () => {
  await withTempDecisions(
    {
      '0000-use-madr.md': VALID_BODY.replace('Class: architecture', 'Class: process'),
      '0001-other.md': VALID_BODY.replace('## Status\nAccepted', '## Status\nProposed'),
    },
    async (decisions) => {
      const errors = await verifyDir(decisions);
      assert.deepEqual(errors, []);
    },
  );
});

test('verifyDir rejects non-sequential numbering', async () => {
  await withTempDecisions(
    { '0001-skip-zero.md': VALID_BODY },
    async (decisions) => {
      const errors = await verifyDir(decisions);
      assert.ok(errors.some((e) => e.includes('sequential')));
    },
  );
});

test('verifyDir rejects duplicate numbering', async () => {
  await withTempDecisions(
    { '0000-a.md': VALID_BODY, '0000-b.md': VALID_BODY },
    async (decisions) => {
      const errors = await verifyDir(decisions);
      assert.ok(errors.some((e) => e.includes('duplicate decision number')));
    },
  );
});

test('verifyDir rejects a file that is not NNNN-title.md', async () => {
  await withTempDecisions(
    { '0000-a.md': VALID_BODY, 'README.md': '# index' },
    async (decisions) => {
      const errors = await verifyDir(decisions);
      assert.deepEqual(errors, []);
    },
  );
});

test('verifyDir reports a missing directory', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'seed-nodir-'));
  try {
    const errors = await verifyDir(path.join(dir, 'does-not-exist'));
    assert.ok(errors.some((e) => e.includes('missing')));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
