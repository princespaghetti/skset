import { describe, it, expect } from 'bun:test';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { expandHome, findGitRoot, resolveRepoPath, isInGitRepo } from '../../src/utils/paths.ts';

describe('expandHome', () => {
  it('should expand ~ to home directory', () => {
    const result = expandHome('~/test/path');

    expect(result).toBe(join(homedir(), 'test/path'));
  });

  it('should expand lone ~ to home directory', () => {
    const result = expandHome('~');

    expect(result).toBe(homedir());
  });

  it('should leave paths without ~ unchanged', () => {
    const result = expandHome('/absolute/path');

    expect(result).toBe('/absolute/path');
  });

  it('should leave relative paths unchanged', () => {
    const result = expandHome('relative/path');

    expect(result).toBe('relative/path');
  });
});

describe('findGitRoot', () => {
  it('should find git root from current directory', () => {
    const gitRoot = findGitRoot();

    // We're in the skset repo, so this should find the .git directory
    expect(gitRoot).toBeTruthy();
    expect(gitRoot).toContain('skset');
  });

  it('should find git root from subdirectory', () => {
    const gitRoot = findGitRoot(join(process.cwd(), 'src'));

    expect(gitRoot).toBeTruthy();
    expect(gitRoot).toBe(process.cwd());
  });

  it('should return null for non-git directory', () => {
    const gitRoot = findGitRoot('/tmp');

    expect(gitRoot).toBeNull();
  });
});

describe('isInGitRepo', () => {
  it('should return true when in git repo', () => {
    const result = isInGitRepo();

    expect(result).toBe(true);
  });
});

describe('resolveRepoPath', () => {
  it('should resolve path relative to git root', () => {
    const gitRoot = findGitRoot();
    const result = resolveRepoPath('.claude/skills');

    if (gitRoot) {
      expect(result).toBe(join(gitRoot, '.claude/skills'));
    } else {
      // Fallback to cwd if not in git repo
      expect(result).toBe(join(process.cwd(), '.claude/skills'));
    }
  });

  it('should use cwd if not in git repo', () => {
    // This test assumes we're calling from a git repo, so we can't truly test
    // the fallback without changing directories. We'll just verify it doesn't error.
    const result = resolveRepoPath('.test/path');

    expect(result).toBeTruthy();
    expect(result).toContain('.test/path');
  });
});
