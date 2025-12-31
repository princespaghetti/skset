/**
 * Minimal USTAR tar extractor for GitHub tarballs
 * Implements basic tar extraction using only Bun APIs
 * Based on USTAR format specification (POSIX.1-1988)
 */

import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, normalize, resolve } from 'node:path';

// USTAR format constants
const BLOCK_SIZE = 512;

// Header field offsets
const OFFSET_NAME = 0;
const OFFSET_SIZE = 124;
const OFFSET_TYPEFLAG = 156;
const OFFSET_LINKNAME = 157;
const OFFSET_MAGIC = 257;
const OFFSET_PREFIX = 345;

// Type flags
const TYPE_FILE = '0';
const TYPE_FILE_ALT = '\0'; // Old tar format used null for files
const TYPE_DIRECTORY = '5';
const TYPE_SYMLINK = '2';

export interface TarEntry {
  name: string;
  size: number;
  type: 'file' | 'directory' | 'symlink';
  mode?: number;
  linkname?: string;
}

export interface ExtractOptions {
  /** Strip N leading path components (like tar --strip-components) */
  strip?: number;
  /** Filter which files to extract */
  filter?: (entry: TarEntry) => boolean;
}

/**
 * Extract a .tar.gz file to a destination directory
 */
export async function extractTarGz(
  tarGzPath: string,
  destDir: string,
  options: ExtractOptions = {}
): Promise<string[]> {
  // Read and decompress the tarball
  const gzipped = await Bun.file(tarGzPath).arrayBuffer();
  const tarData = Bun.gunzipSync(new Uint8Array(gzipped));

  const extractedFiles: string[] = [];
  let offset = 0;

  // Create destination directory
  if (!existsSync(destDir)) {
    await mkdir(destDir, { recursive: true });
  }

  while (offset < tarData.length) {
    // Read header block (512 bytes)
    const headerBlock = tarData.slice(offset, offset + BLOCK_SIZE);

    // Check for end-of-archive (two consecutive zero blocks)
    if (isZeroBlock(headerBlock)) {
      // Check if next block is also zero
      const nextBlock = tarData.slice(offset + BLOCK_SIZE, offset + BLOCK_SIZE * 2);
      if (nextBlock.length === 0 || isZeroBlock(nextBlock)) {
        break; // End of archive
      }
    }

    // Parse header
    const entry = parseHeader(headerBlock);
    if (!entry) {
      // Invalid header, skip this block
      offset += BLOCK_SIZE;
      continue;
    }

    // Move past header
    offset += BLOCK_SIZE;

    // Strip leading path components if requested
    if (options.strip && options.strip > 0) {
      entry.name = stripComponents(entry.name, options.strip);
      if (!entry.name) {
        // All components were stripped, skip this entry
        offset += Math.ceil(entry.size / BLOCK_SIZE) * BLOCK_SIZE;
        continue;
      }
    }

    // Apply filter if provided
    if (options.filter && !options.filter(entry)) {
      // Skip filtered entries
      offset += Math.ceil(entry.size / BLOCK_SIZE) * BLOCK_SIZE;
      continue;
    }

    // Security: Reject absolute paths immediately
    if (isAbsolute(entry.name)) {
      // Skip entries with absolute paths (e.g., /etc/passwd)
      offset += Math.ceil(entry.size / BLOCK_SIZE) * BLOCK_SIZE;
      continue;
    }

    const fullPath = join(destDir, entry.name);

    // Security: Validate path to prevent directory traversal attacks (Zip Slip)
    if (!isPathSafe(fullPath, destDir)) {
      // Skip malicious entries that try to escape the extraction directory
      offset += Math.ceil(entry.size / BLOCK_SIZE) * BLOCK_SIZE;
      continue;
    }

    // Handle different entry types
    if (entry.type === 'directory') {
      // Create directory
      await mkdir(fullPath, { recursive: true });
      extractedFiles.push(entry.name);
    } else if (entry.type === 'file') {
      // Ensure parent directory exists
      const parentDir = dirname(fullPath);
      if (!existsSync(parentDir)) {
        await mkdir(parentDir, { recursive: true });
      }

      // Extract file data
      const fileData = tarData.slice(offset, offset + entry.size);
      await writeFile(fullPath, fileData);
      extractedFiles.push(entry.name);
    } else if (entry.type === 'symlink') {
      // Skip symlinks - GitHub tarballs can contain them, but they're rare in skill directories
      // If symlink support is needed in the future, use Bun.write() with symlink option
    }

    // Skip to next header (file data is padded to 512-byte boundary)
    offset += Math.ceil(entry.size / BLOCK_SIZE) * BLOCK_SIZE;
  }

  return extractedFiles;
}

/**
 * Parse a USTAR header from a 512-byte block
 */
function parseHeader(block: Uint8Array): TarEntry | null {
  // Verify this is a USTAR header
  const magic = parseString(block, OFFSET_MAGIC, 6);
  if (!magic.startsWith('ustar')) {
    return null;
  }

  // Parse filename (may be split between name and prefix fields)
  let name = parseString(block, OFFSET_NAME, 100);
  const prefix = parseString(block, OFFSET_PREFIX, 155);
  if (prefix) {
    name = `${prefix}/${name}`;
  }

  // Parse file size (stored as octal string)
  const size = parseOctal(block, OFFSET_SIZE, 12);

  // Parse type flag
  const typeflag = String.fromCharCode(block[OFFSET_TYPEFLAG]);

  // Determine entry type
  let type: 'file' | 'directory' | 'symlink';
  if (typeflag === TYPE_DIRECTORY) {
    type = 'directory';
  } else if (typeflag === TYPE_SYMLINK) {
    type = 'symlink';
  } else if (typeflag === TYPE_FILE || typeflag === TYPE_FILE_ALT) {
    type = 'file';
  } else {
    // Unknown type, treat as file
    type = 'file';
  }

  const entry: TarEntry = {
    name,
    size,
    type,
  };

  // Parse linkname for symlinks
  if (type === 'symlink') {
    entry.linkname = parseString(block, OFFSET_LINKNAME, 100);
  }

  return entry;
}

/**
 * Convert octal ASCII string to decimal number
 * USTAR stores numbers as octal strings with trailing space/null
 * Example: "0000644 \0" → 420 (decimal)
 */
function parseOctal(buf: Uint8Array, offset: number, length: number): number {
  const str = parseString(buf, offset, length).trim();
  if (!str) return 0;

  // Parse as octal (base 8)
  const value = Number.parseInt(str, 8);
  return Number.isNaN(value) ? 0 : value;
}

/**
 * Parse null-terminated string from buffer
 * Stops at first null byte or end of length
 */
function parseString(buf: Uint8Array, offset: number, length: number): string {
  const bytes = buf.slice(offset, offset + length);

  // Find null terminator
  const nullIndex = bytes.indexOf(0);
  const end = nullIndex >= 0 ? nullIndex : length;

  // Decode as ASCII/UTF-8
  return new TextDecoder().decode(bytes.slice(0, end));
}

/**
 * Check if a 512-byte block is all zeros
 * Used to detect end-of-archive marker
 */
function isZeroBlock(block: Uint8Array): boolean {
  // Optimize by checking 8 bytes at a time using BigUint64Array
  const view = new BigUint64Array(block.buffer, block.byteOffset, Math.floor(block.length / 8));
  for (let i = 0; i < view.length; i++) {
    if (view[i] !== 0n) {
      return false;
    }
  }

  // Check remaining bytes (if block length not multiple of 8)
  const remaining = block.length % 8;
  for (let i = block.length - remaining; i < block.length; i++) {
    if (block[i] !== 0) {
      return false;
    }
  }

  return true;
}

/**
 * Strip N leading path components from filename
 * Example: strip=1, "repo-abc123/skills/pdf/SKILL.md" → "skills/pdf/SKILL.md"
 */
function stripComponents(path: string, count: number): string {
  const parts = path.split('/');
  if (count >= parts.length) {
    return ''; // All components stripped
  }
  return parts.slice(count).join('/');
}

/**
 * Validate that a path is safe (prevents Zip Slip / path traversal attacks)
 * Ensures the resolved path is within the destination directory
 *
 * @param targetPath - The path to validate
 * @param destDir - The destination directory that should contain the path
 * @returns true if safe, false if potentially malicious
 */
function isPathSafe(targetPath: string, destDir: string): boolean {
  // Resolve both paths to absolute, normalized form
  const resolvedTarget = resolve(normalize(targetPath));
  const resolvedDest = resolve(normalize(destDir));

  // Check if the target path is within the destination directory
  // The target must start with the destination path + path separator
  return resolvedTarget.startsWith(`${resolvedDest}/`) || resolvedTarget === resolvedDest;
}
