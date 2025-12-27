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
});

describe('skillExists', () => {
  it('should return true for existing directory', async () => {
    const skillDir = join(tempDir, 'skill');
    await mkdir(skillDir);

    const exists = skillExists(skillDir);

    expect(exists).toBe(true);
  });

  it('should return false for non-existent directory', () => {
    const exists = skillExists(join(tempDir, 'nonexistent'));

    expect(exists).toBe(false);
  });

  it('should return false for files', async () => {
    const filePath = join(tempDir, 'file.txt');
    await writeFile(filePath, 'content');

    const exists = skillExists(filePath);

    expect(exists).toBe(false);
  });
});
