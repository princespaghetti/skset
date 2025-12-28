/**
 * File and directory copy operations with conflict detection
 */

import { existsSync, statSync } from 'node:fs';
import { mkdir, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

/**
 * Copy result information
 */
export interface CopyResult {
  /** Whether the copy was successful */
  success: boolean;
  /** List of files copied */
  filesCopied: string[];
  /** Error message if copy failed */
  error?: string;
}

/**
 * Copy a directory recursively
 * @param src - Source directory path
 * @param dest - Destination directory path
 * @returns Copy result
 */
export async function copyDirectory(src: string, dest: string): Promise<CopyResult> {
  const filesCopied: string[] = [];

  try {
    // Create destination directory
    if (!existsSync(dest)) {
      await mkdir(dest, { recursive: true });
    }

    // Read source directory
    const entries = await readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      if (entry.isDirectory()) {
        // Recursively copy subdirectories
        const result = await copyDirectory(srcPath, destPath);
        if (!result.success) {
          return result;
        }
        filesCopied.push(...result.filesCopied);
      } else if (entry.isFile()) {
        // Copy file
        await mkdir(dest, { recursive: true });
        await Bun.write(destPath, Bun.file(srcPath));
        filesCopied.push(relative(dest, destPath));
      }
    }

    return {
      success: true,
      filesCopied,
    };
  } catch (err) {
    return {
      success: false,
      filesCopied: [],
      error: (err as Error).message,
    };
  }
}

/**
 * Check if two directories have the same content
 * Returns true if SKILL.md files have the same hash
 */
export async function directoriesMatch(dir1: string, dir2: string): Promise<boolean> {
  const skillFile1 = join(dir1, 'SKILL.md');
  const skillFile2 = join(dir2, 'SKILL.md');

  const exists1 = await Bun.file(skillFile1).exists();
  const exists2 = await Bun.file(skillFile2).exists();

  if (!exists1 || !exists2) {
    return false;
  }

  try {
    const hash1 = await getFileHash(skillFile1);
    const hash2 = await getFileHash(skillFile2);
    return hash1 === hash2;
  } catch {
    return false;
  }
}

/**
 * Get SHA-256 hash of a file
 */
async function getFileHash(filePath: string): Promise<string> {
  const file = Bun.file(filePath);
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(await file.arrayBuffer());
  return hasher.digest('hex');
}

/**
 * Check if a skill directory exists and has content
 */
export async function skillExists(dirPath: string): Promise<boolean> {
  if (!existsSync(dirPath)) {
    return false;
  }

  const stat = statSync(dirPath);
  return stat.isDirectory();
}
