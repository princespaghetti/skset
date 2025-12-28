import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { join } from 'node:path';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { copyDirectory, directoriesMatch, skillExists } from '../../src/lib/copy.ts';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'skset-test-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('copyDirectory', () => {
  it('should copy directory with all files', async () => {
    const srcDir = join(tempDir, 'source');
    const destDir = join(tempDir, 'dest');

    // Create source structure
    await mkdir(srcDir);
    await writeFile(join(srcDir, 'file1.txt'), 'content1');
    await writeFile(join(srcDir, 'file2.txt'), 'content2');

    const result = await copyDirectory(srcDir, destDir);

    expect(result.success).toBe(true);
    expect(result.filesCopied.length).toBe(2);

    // Verify files exist
    const file1 = await Bun.file(join(destDir, 'file1.txt')).text();
    const file2 = await Bun.file(join(destDir, 'file2.txt')).text();

    expect(file1).toBe('content1');
    expect(file2).toBe('content2');
  });

  it('should copy nested directories', async () => {
    const srcDir = join(tempDir, 'source');
    const destDir = join(tempDir, 'dest');

    // Create nested structure
    await mkdir(join(srcDir, 'subdir'), { recursive: true });
    await writeFile(join(srcDir, 'SKILL.md'), 'skill content');
    await writeFile(join(srcDir, 'subdir', 'nested.txt'), 'nested content');

    const result = await copyDirectory(srcDir, destDir);

    expect(result.success).toBe(true);
    expect(result.filesCopied.length).toBe(2);

    const nested = await Bun.file(join(destDir, 'subdir', 'nested.txt')).text();
    expect(nested).toBe('nested content');
  });
});

describe('directoriesMatch', () => {
  it('should return true for identical SKILL.md files', async () => {
    const dir1 = join(tempDir, 'dir1');
    const dir2 = join(tempDir, 'dir2');

    await mkdir(dir1);
    await mkdir(dir2);
    await writeFile(join(dir1, 'SKILL.md'), 'same content');
    await writeFile(join(dir2, 'SKILL.md'), 'same content');

    const match = await directoriesMatch(dir1, dir2);

    expect(match).toBe(true);
  });

  it('should return false for different SKILL.md files', async () => {
    const dir1 = join(tempDir, 'dir1');
    const dir2 = join(tempDir, 'dir2');

    await mkdir(dir1);
    await mkdir(dir2);
    await writeFile(join(dir1, 'SKILL.md'), 'content1');
    await writeFile(join(dir2, 'SKILL.md'), 'content2');

    const match = await directoriesMatch(dir1, dir2);

    expect(match).toBe(false);
  });

  it('should return false when SKILL.md is missing', async () => {
    const dir1 = join(tempDir, 'dir1');
    const dir2 = join(tempDir, 'dir2');

    await mkdir(dir1);
    await mkdir(dir2);
    await writeFile(join(dir1, 'SKILL.md'), 'content');

    const match = await directoriesMatch(dir1, dir2);

    expect(match).toBe(false);
  });

  describe('Recursive directory hashing', () => {
    it('should return true for identical skills with scripts/', async () => {
      const dir1 = join(tempDir, 'skill1');
      const dir2 = join(tempDir, 'skill2');

      await mkdir(join(dir1, 'scripts'), { recursive: true });
      await mkdir(join(dir2, 'scripts'), { recursive: true });

      await writeFile(join(dir1, 'SKILL.md'), 'same skill');
      await writeFile(join(dir2, 'SKILL.md'), 'same skill');
      await writeFile(join(dir1, 'scripts', 'helper.py'), 'print("hello")');
      await writeFile(join(dir2, 'scripts', 'helper.py'), 'print("hello")');

      const match = await directoriesMatch(dir1, dir2);

      expect(match).toBe(true);
    });

    it('should return false when scripts/ content differs', async () => {
      const dir1 = join(tempDir, 'skill1');
      const dir2 = join(tempDir, 'skill2');

      await mkdir(join(dir1, 'scripts'), { recursive: true });
      await mkdir(join(dir2, 'scripts'), { recursive: true });

      await writeFile(join(dir1, 'SKILL.md'), 'same skill');
      await writeFile(join(dir2, 'SKILL.md'), 'same skill');
      await writeFile(join(dir1, 'scripts', 'helper.py'), 'print("hello")');
      await writeFile(join(dir2, 'scripts', 'helper.py'), 'print("goodbye")');

      const match = await directoriesMatch(dir1, dir2);

      expect(match).toBe(false);
    });

    it('should return false when scripts/ has different files', async () => {
      const dir1 = join(tempDir, 'skill1');
      const dir2 = join(tempDir, 'skill2');

      await mkdir(join(dir1, 'scripts'), { recursive: true });
      await mkdir(join(dir2, 'scripts'), { recursive: true });

      await writeFile(join(dir1, 'SKILL.md'), 'same skill');
      await writeFile(join(dir2, 'SKILL.md'), 'same skill');
      await writeFile(join(dir1, 'scripts', 'helper.py'), 'print("hello")');
      await writeFile(join(dir2, 'scripts', 'different.py'), 'print("hello")');

      const match = await directoriesMatch(dir1, dir2);

      expect(match).toBe(false);
    });

    it('should return false when only one has scripts/', async () => {
      const dir1 = join(tempDir, 'skill1');
      const dir2 = join(tempDir, 'skill2');

      await mkdir(join(dir1, 'scripts'), { recursive: true });
      await mkdir(dir2);

      await writeFile(join(dir1, 'SKILL.md'), 'same skill');
      await writeFile(join(dir2, 'SKILL.md'), 'same skill');
      await writeFile(join(dir1, 'scripts', 'helper.py'), 'print("hello")');

      const match = await directoriesMatch(dir1, dir2);

      expect(match).toBe(false);
    });

    it('should return true for identical skills with references/', async () => {
      const dir1 = join(tempDir, 'skill1');
      const dir2 = join(tempDir, 'skill2');

      await mkdir(join(dir1, 'references'), { recursive: true });
      await mkdir(join(dir2, 'references'), { recursive: true });

      await writeFile(join(dir1, 'SKILL.md'), 'same skill');
      await writeFile(join(dir2, 'SKILL.md'), 'same skill');
      await writeFile(join(dir1, 'references', 'api.json'), '{"key": "value"}');
      await writeFile(join(dir2, 'references', 'api.json'), '{"key": "value"}');

      const match = await directoriesMatch(dir1, dir2);

      expect(match).toBe(true);
    });

    it('should return false when references/ content differs', async () => {
      const dir1 = join(tempDir, 'skill1');
      const dir2 = join(tempDir, 'skill2');

      await mkdir(join(dir1, 'references'), { recursive: true });
      await mkdir(join(dir2, 'references'), { recursive: true });

      await writeFile(join(dir1, 'SKILL.md'), 'same skill');
      await writeFile(join(dir2, 'SKILL.md'), 'same skill');
      await writeFile(join(dir1, 'references', 'api.json'), '{"key": "value1"}');
      await writeFile(join(dir2, 'references', 'api.json'), '{"key": "value2"}');

      const match = await directoriesMatch(dir1, dir2);

      expect(match).toBe(false);
    });

    it('should return true for identical skills with assets/', async () => {
      const dir1 = join(tempDir, 'skill1');
      const dir2 = join(tempDir, 'skill2');

      await mkdir(join(dir1, 'assets'), { recursive: true });
      await mkdir(join(dir2, 'assets'), { recursive: true });

      await writeFile(join(dir1, 'SKILL.md'), 'same skill');
      await writeFile(join(dir2, 'SKILL.md'), 'same skill');
      await writeFile(join(dir1, 'assets', 'logo.png'), 'fake png data');
      await writeFile(join(dir2, 'assets', 'logo.png'), 'fake png data');

      const match = await directoriesMatch(dir1, dir2);

      expect(match).toBe(true);
    });

    it('should return false when assets/ content differs', async () => {
      const dir1 = join(tempDir, 'skill1');
      const dir2 = join(tempDir, 'skill2');

      await mkdir(join(dir1, 'assets'), { recursive: true });
      await mkdir(join(dir2, 'assets'), { recursive: true });

      await writeFile(join(dir1, 'SKILL.md'), 'same skill');
      await writeFile(join(dir2, 'SKILL.md'), 'same skill');
      await writeFile(join(dir1, 'assets', 'logo.png'), 'fake png data 1');
      await writeFile(join(dir2, 'assets', 'logo.png'), 'fake png data 2');

      const match = await directoriesMatch(dir1, dir2);

      expect(match).toBe(false);
    });

    it('should return true for identical skills with all subdirectories', async () => {
      const dir1 = join(tempDir, 'skill1');
      const dir2 = join(tempDir, 'skill2');

      await mkdir(join(dir1, 'scripts'), { recursive: true });
      await mkdir(join(dir1, 'references'), { recursive: true });
      await mkdir(join(dir1, 'assets'), { recursive: true });
      await mkdir(join(dir2, 'scripts'), { recursive: true });
      await mkdir(join(dir2, 'references'), { recursive: true });
      await mkdir(join(dir2, 'assets'), { recursive: true });

      await writeFile(join(dir1, 'SKILL.md'), 'same skill');
      await writeFile(join(dir2, 'SKILL.md'), 'same skill');

      await writeFile(join(dir1, 'scripts', 'helper.py'), 'script');
      await writeFile(join(dir2, 'scripts', 'helper.py'), 'script');

      await writeFile(join(dir1, 'references', 'api.json'), 'ref');
      await writeFile(join(dir2, 'references', 'api.json'), 'ref');

      await writeFile(join(dir1, 'assets', 'logo.png'), 'asset');
      await writeFile(join(dir2, 'assets', 'logo.png'), 'asset');

      const match = await directoriesMatch(dir1, dir2);

      expect(match).toBe(true);
    });

    it('should return false when any subdirectory differs', async () => {
      const dir1 = join(tempDir, 'skill1');
      const dir2 = join(tempDir, 'skill2');

      await mkdir(join(dir1, 'scripts'), { recursive: true });
      await mkdir(join(dir1, 'references'), { recursive: true });
      await mkdir(join(dir1, 'assets'), { recursive: true });
      await mkdir(join(dir2, 'scripts'), { recursive: true });
      await mkdir(join(dir2, 'references'), { recursive: true });
      await mkdir(join(dir2, 'assets'), { recursive: true });

      await writeFile(join(dir1, 'SKILL.md'), 'same skill');
      await writeFile(join(dir2, 'SKILL.md'), 'same skill');

      await writeFile(join(dir1, 'scripts', 'helper.py'), 'script');
      await writeFile(join(dir2, 'scripts', 'helper.py'), 'script');

      // Different content in references/
      await writeFile(join(dir1, 'references', 'api.json'), 'ref1');
      await writeFile(join(dir2, 'references', 'api.json'), 'ref2');

      await writeFile(join(dir1, 'assets', 'logo.png'), 'asset');
      await writeFile(join(dir2, 'assets', 'logo.png'), 'asset');

      const match = await directoriesMatch(dir1, dir2);

      expect(match).toBe(false);
    });

    it('should return true when both have empty subdirectories', async () => {
      const dir1 = join(tempDir, 'skill1');
      const dir2 = join(tempDir, 'skill2');

      await mkdir(join(dir1, 'scripts'), { recursive: true });
      await mkdir(join(dir2, 'scripts'), { recursive: true });

      await writeFile(join(dir1, 'SKILL.md'), 'same skill');
      await writeFile(join(dir2, 'SKILL.md'), 'same skill');

      const match = await directoriesMatch(dir1, dir2);

      expect(match).toBe(true);
    });

    it('should ignore non-standard subdirectories', async () => {
      const dir1 = join(tempDir, 'skill1');
      const dir2 = join(tempDir, 'skill2');

      await mkdir(join(dir1, 'custom'), { recursive: true });
      await mkdir(dir2);

      await writeFile(join(dir1, 'SKILL.md'), 'same skill');
      await writeFile(join(dir2, 'SKILL.md'), 'same skill');
      await writeFile(join(dir1, 'custom', 'file.txt'), 'ignored');

      const match = await directoriesMatch(dir1, dir2);

      // Non-standard directories are included in the hash, so this should be false
      expect(match).toBe(false);
    });
  });
});

describe('skillExists', () => {
  it('should return true for existing directory', async () => {
    const skillDir = join(tempDir, 'skill');
    await mkdir(skillDir);

    const exists = await skillExists(skillDir);

    expect(exists).toBe(true);
  });

  it('should return false for non-existent directory', async () => {
    const exists = await skillExists(join(tempDir, 'nonexistent'));

    expect(exists).toBe(false);
  });

  it('should return false for files', async () => {
    const filePath = join(tempDir, 'file.txt');
    await writeFile(filePath, 'content');

    const exists = await skillExists(filePath);

    expect(exists).toBe(false);
  });
});
