#!/usr/bin/env node
// install-hooks.mjs — install the repo-seed pre-commit hook into a target
// repository's .git/hooks. Zero dependencies; Node >= 18.
// Usage: install-hooks.mjs <target-dir>
// The hook runs the four verifiers (whitespace is built into the hook script
// via `git diff --cached --check`). Never touches global git config.
import { mkdir, writeFile, readFile, stat, chmod } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export const HOOK_NAME = 'pre-commit';

export function hookScript(repoRoot) {
  // repoRoot is the absolute target directory; the hook resolves scripts relative to it.
  return `#!/bin/sh
# repo-seed pre-commit hook (installed by scripts/install-hooks.mjs)
# Runs the governance gates on every commit. Zero dependencies.
set -e
cd "${repoRoot}" || exit 1

node scripts/verify-decisions.mjs
node scripts/verify-doc-links.mjs
node scripts/verify-placeholders.mjs
node scripts/verify-manifest.mjs
git diff --cached --check
`;
}

export async function installHook(targetDir) {
  const gitDir = path.join(targetDir, '.git');
  let st;
  try {
    st = await stat(gitDir);
  } catch {
    throw new Error(`not a git repository: ${targetDir} (no .git)`);
  }
  if (!st.isDirectory()) {
    // worktree: .git is a file pointing to the real git dir
    const gitFile = await readFile(gitDir, 'utf8');
    const m = gitFile.match(/^gitdir:\s*(.+)$/m);
    if (!m) throw new Error(`cannot resolve git dir from ${gitDir}`);
    const realGit = path.resolve(targetDir, m[1].trim());
    await writeHook(realGit, targetDir);
    return realGit;
  }
  await writeHook(gitDir, targetDir);
  return gitDir;
}

async function writeHook(gitDir, targetDir) {
  const hooksDir = path.join(gitDir, 'hooks');
  await mkdir(hooksDir, { recursive: true });
  const hookPath = path.join(hooksDir, HOOK_NAME);
  await writeFile(hookPath, hookScript(targetDir), { mode: 0o755 });
  // Ensure executable bit on platforms that need it
  await chmod(hookPath, 0o755);
}

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('usage: install-hooks.mjs <target-dir>');
    process.exit(2);
  }
  const abs = path.resolve(target);
  try {
    const gitDir = await installHook(abs);
    console.log(`install-hooks: installed ${HOOK_NAME} in ${gitDir}/hooks/`);
  } catch (e) {
    console.error(`install-hooks: ${e.message}`);
    process.exit(1);
  }
}

const isMain =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  main().catch((e) => {
    console.error('install-hooks: fatal', e);
    process.exit(2);
  });
}
