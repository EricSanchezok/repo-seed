#!/usr/bin/env node
// install-hooks.mjs — install the repo-seed pre-commit (and optionally
// commit-msg) hook into a target repository's .git/hooks. Zero dependencies;
// Node >= 18.
// Usage: install-hooks.mjs <target-dir> [--with-commit-msg]
// The pre-commit hook runs the four verifiers (whitespace is built into the
// hook script via `git diff --cached --check`). The commit-msg hook (opt-in,
// ext-release) runs scripts/verify-commit-msg.mjs. Never touches global git
// config.
import { mkdir, writeFile, readFile, stat, chmod } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export const HOOK_NAME = 'pre-commit';
export const COMMIT_MSG_HOOK_NAME = 'commit-msg';

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

export function commitMsgHookScript(repoRoot) {
  return `#!/bin/sh
# repo-seed commit-msg hook (installed by scripts/install-hooks.mjs --with-commit-msg)
# Enforces conventional commits (ext-release). Zero dependencies.
set -e
cd "${repoRoot}" || exit 1
node scripts/verify-commit-msg.mjs "\${1:-.git/COMMIT_EDITMSG}"
`;
}

async function writeHookFile(gitDir, hookName, content) {
  const hooksDir = path.join(gitDir, 'hooks');
  await mkdir(hooksDir, { recursive: true });
  const hookPath = path.join(hooksDir, hookName);
  await writeFile(hookPath, content, { mode: 0o755 });
  await chmod(hookPath, 0o755);
}

export async function installHook(targetDir) {
  const gitDir = path.join(targetDir, '.git');
  let st;
  try {
    st = await stat(gitDir);
  } catch {
    throw new Error(`not a git repository: ${targetDir} (no .git)`);
  }
  let realGit = gitDir;
  if (!st.isDirectory()) {
    // worktree: .git is a file pointing to the real git dir
    const gitFile = await readFile(gitDir, 'utf8');
    const m = gitFile.match(/^gitdir:\s*(.+)$/m);
    if (!m) throw new Error(`cannot resolve git dir from ${gitDir}`);
    realGit = path.resolve(targetDir, m[1].trim());
  }
  await writeHookFile(realGit, HOOK_NAME, hookScript(targetDir));
  return realGit;
}

export async function installCommitMsgHook(gitDir, targetDir) {
  await writeHookFile(gitDir, COMMIT_MSG_HOOK_NAME, commitMsgHookScript(targetDir));
}

async function main() {
  const args = process.argv.slice(2);
  const target = args[0];
  const withCommitMsg = args.includes('--with-commit-msg');
  if (!target) {
    console.error('usage: install-hooks.mjs <target-dir> [--with-commit-msg]');
    process.exit(2);
  }
  const abs = path.resolve(target);
  try {
    const gitDir = await installHook(abs);
    const installed = [HOOK_NAME];
    if (withCommitMsg) {
      await installCommitMsgHook(gitDir, abs);
      installed.push(COMMIT_MSG_HOOK_NAME);
    }
    console.log(`install-hooks: installed ${installed.join(', ')} in ${gitDir}/hooks/`);
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
