/**
 * Path resolution utilities for skset
 */

import { homedir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';

/**
 * Expand ~ to the user's home directory
 */
export function expandHome(path: string): string {
  if (path.startsWith('~/')) {
    return join(homedir(), path.slice(2));
  }
  if (path === '~') {
    return homedir();
  }
  return path;
}

/**
 * Find the git repository root by walking up the directory tree
 * @param startDir - Directory to start searching from (defaults to cwd)
 * @returns Git root path or null if not in a git repo
 */
export function findGitRoot(startDir: string = process.cwd()): string | null {
  let currentDir = resolve(startDir);

  // Walk up the directory tree
  while (true) {
    const gitDir = join(currentDir, '.git');

    if (existsSync(gitDir)) {
      return currentDir;
    }

    const parentDir = dirname(currentDir);

    // Reached filesystem root
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

/**
 * Resolve a repo-relative path against the git root or current working directory
 * @param relativePath - The repo-relative path (e.g., '.claude/skills')
 * @returns Absolute path resolved against git root (or cwd if not in a git repo)
 */
export function resolveRepoPath(relativePath: string): string {
  const gitRoot = findGitRoot();
  const base = gitRoot || process.cwd();
  return join(base, relativePath);
}

/**
 * Check if current directory is inside a git repository
 */
export function isInGitRepo(): boolean {
  return findGitRoot() !== null;
}
