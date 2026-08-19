#!/usr/bin/env node
// verify-commit-msg.mjs — conventional commits message gate (ext-release).
// Reads the commit message from .git/COMMIT_EDITMSG (or a file argument) and
// checks the subject against the Conventional Commits format:
//   type(scope)!: subject
// Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci,
// chore, revert. Merge commits are allowed through.
// Zero dependencies; Node >= 18. Exits non-zero on violation.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export const ALLOWED_TYPES = new Set([
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
]);

const SUBJECT_RE = /^([a-z]+)(\([a-z0-9-]+\))?(!)?: .+$/;

export function checkCommitMessage(message) {
  const errors = [];
  const lines = message.split('\n');
  const subject = lines[0]?.trim() ?? '';
  if (subject === '') {
    errors.push('empty commit message');
    return errors;
  }
  if (subject.startsWith('Merge ')) return errors; // merge commits are exempt
  const m = subject.match(SUBJECT_RE);
  if (!m) {
    errors.push(`subject does not follow Conventional Commits: "${subject}"`);
    return errors;
  }
  const type = m[1];
  if (!ALLOWED_TYPES.has(type)) {
    errors.push(`unknown commit type "${type}" (allowed: ${[...ALLOWED_TYPES].join(', ')})`);
  }
  return errors;
}

async function main() {
  const target = process.argv[2] ?? path.join(process.cwd(), '.git', 'COMMIT_EDITMSG');
  let message;
  try {
    message = await readFile(target, 'utf8');
  } catch {
    console.error(`verify-commit-msg: cannot read commit message at ${target}`);
    process.exit(2);
  }
  const errors = checkCommitMessage(message);
  if (errors.length) {
    for (const e of errors) console.error(`verify-commit-msg: ${e}`);
    process.exit(1);
  }
  console.log('verify-commit-msg: OK');
}

const isMain =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  main().catch((e) => {
    console.error('verify-commit-msg: fatal', e);
    process.exit(2);
  });
}
