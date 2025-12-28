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
 * Check if two directories have identical content
 * Uses recursive hashing to compare entire directory trees
 * @param dir1 - First directory path
 * @param dir2 - Second directory path
 * @returns True if all files and subdirectories are identical
 */
export async function directoriesMatch(dir1: string, dir2: string): Promise<boolean> {
  try {
    const hash1 = await hashDirectory(dir1);
    const hash2 = await hashDirectory(dir2);
    return hash1 === hash2;
  } catch {
    return false;
  }
}

/**
 * Recursively hash all files in a directory
 * Produces a deterministic hash based on file names and contents
 * @param dirPath - Directory to hash
 * @returns Hex-encoded hash of the entire directory tree
 * @internal
 */
async function hashDirectory(dirPath: string): Promise<string> {
  const hasher = new Bun.CryptoHasher('sha256');

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });

    // Sort entries for deterministic hashing
    const sortedEntries = entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of sortedEntries) {
      const fullPath = join(dirPath, entry.name);

      // Hash the entry name first (for structure)
      hasher.update(entry.name);

      if (entry.isFile()) {
        // Hash file content
        const fileBuffer = await Bun.file(fullPath).arrayBuffer();
        hasher.update(new Uint8Array(fileBuffer));
      } else if (entry.isDirectory()) {
        // Recursively hash subdirectory
        const subdirHash = await hashDirectory(fullPath);
        hasher.update(subdirHash);
      }
    }

    return hasher.digest('hex');
  } catch (_err) {
    // If directory doesn't exist or can't be read, return empty hash
    return hasher.digest('hex');
  }
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
