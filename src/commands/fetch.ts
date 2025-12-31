/**
 * Fetch a skill from a remote GitHub repository
 */

import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { confirm } from '@clack/prompts';
import { addSkillToGroup, getLibraryPath, loadConfig, saveConfig } from '../lib/config.ts';
import { copyDirectory, skillExists } from '../lib/copy.ts';
import { parseSkill, validateSkill } from '../lib/skills.ts';
import { extractTarGz } from '../lib/tar.ts';
import { SksetError, UserCancelledError, ValidationError } from '../utils/errors.ts';
import * as out from '../utils/output.ts';

interface FetchOptions {
  group?: string;
  force?: boolean;
}

interface GitHubUrl {
  owner: string;
  repo: string;
  ref: string;
  path?: string;
}

/**
 * Fetch a skill from a remote GitHub repository and add to library
 */
export async function fetch(url: string, options: FetchOptions = {}): Promise<void> {
  // 1. Parse and normalize URL
  const { owner, repo, ref, path } = parseGitHubUrl(url);
  const tarballUrl = `https://api.github.com/repos/${owner}/${repo}/tarball/${ref}`;

  // 2. Setup temp directories
  const tempTarball = join(tmpdir(), `skset-${Date.now()}.tar.gz`);
  const tempExtract = join(tmpdir(), `skset-extract-${Date.now()}`);
  let properSkillDir: string | null = null;

  try {
    out.info(`Fetching from ${owner}/${repo}${path ? `/${path}` : ''}...`);

    // 3. Download tarball
    const response = await globalThis.fetch(tarballUrl);
    if (!response.ok) {
      if (response.status === 404) {
        throw new SksetError('Repository not found', 'Check the repository owner and name');
      }
      if (response.status === 403) {
        throw new SksetError('Access forbidden', 'The repository may be private or rate limited. Try again later.');
      }
      throw new SksetError(`Failed to download: ${response.statusText}`);
    }

    await Bun.write(tempTarball, response);

    // 4. Extract tarball (GitHub tarballs have repo-hash/ prefix, so strip=1)
    await extractTarGz(tempTarball, tempExtract, {
      strip: 1,
      filter: path
        ? (entry) => {
            // Only extract files under the specified path
            return entry.name === path || entry.name.startsWith(`${path}/`);
          }
        : undefined,
    });

    // 5. Find the skill directory
    const skillDir = path ? join(tempExtract, path) : tempExtract;

    if (!existsSync(skillDir)) {
      throw new ValidationError(
        'Skill path not found in repository',
        path ? `The path "${path}" does not exist in the repository` : 'No files were extracted'
      );
    }

    // 6. Parse skill to get its name (without full validation yet)
    let skill = await parseSkill(skillDir);
    if (!skill) {
      throw new ValidationError('SKILL.md not found', 'The remote path must contain a valid skill');
    }

    // 7. Rename temp dir to match skill name (required for validation)
    properSkillDir = join(tmpdir(), skill.name);
    const renameResult = await copyDirectory(skillDir, properSkillDir);
    if (!renameResult.success) {
      throw new SksetError('Failed to prepare skill for validation', renameResult.error);
    }

    // 8. Re-parse with correct path and validate
    skill = await parseSkill(properSkillDir);
    if (!skill) {
      throw new ValidationError('SKILL.md not found after rename');
    }

    const validation = await validateSkill(skill);
    if (!validation.valid) {
      const errorMsg = `Skill validation failed:\n${validation.errors.map((e) => `  • ${e}`).join('\n')}`;
      throw new ValidationError(errorMsg);
    }

    // Show warnings
    if (validation.warnings.length > 0) {
      for (const warning of validation.warnings) {
        out.warning(warning);
      }
      console.log('');
    }

    // 9. Check for conflicts in library
    const libraryPath = await getLibraryPath();
    const destPath = join(libraryPath, skill.name);

    if (await skillExists(destPath)) {
      if (!options.force) {
        const shouldOverwrite = await confirm({
          message: `Skill "${skill.name}" already exists in library. Overwrite?`,
          initialValue: false,
        });

        if (shouldOverwrite === false || typeof shouldOverwrite === 'symbol') {
          throw new UserCancelledError();
        }
      }
    }

    // 10. Copy to library
    const result = await copyDirectory(properSkillDir, destPath);
    if (!result.success) {
      throw new SksetError('Failed to copy skill', result.error);
    }

    out.success(`Fetched "${skill.name}" to library`);
    out.dim(`Copied ${result.filesCopied.length} file(s)`);

    // 11. Add to group if specified
    if (options.group) {
      const config = await loadConfig();
      const updated = addSkillToGroup(config, options.group, skill.name);
      await saveConfig(updated);
      out.success(`Added "${skill.name}" to group "${options.group}"`);
    }
  } finally {
    // 12. Cleanup temp files
    if (existsSync(tempTarball)) {
      await rm(tempTarball, { force: true });
    }
    if (existsSync(tempExtract)) {
      await rm(tempExtract, { recursive: true, force: true });
    }
    if (properSkillDir && existsSync(properSkillDir)) {
      await rm(properSkillDir, { recursive: true, force: true });
    }
  }
}

/**
 * Parse and normalize various GitHub URL formats
 */
export function parseGitHubUrl(url: string): GitHubUrl {
  // gh:owner/repo/path/to/skill
  // github:owner/repo/path/to/skill
  if (url.startsWith('gh:') || url.startsWith('github:')) {
    const stripped = url.replace(/^(gh|github):/, '');
    const parts = stripped.split('/');

    if (parts.length < 2) {
      throw new SksetError('Invalid GitHub URL format', 'Use: gh:owner/repo or gh:owner/repo/path/to/skill');
    }

    return {
      owner: parts[0],
      repo: parts[1],
      ref: 'main', // Default to main branch
      path: parts.length > 2 ? parts.slice(2).join('/') : undefined,
    };
  }

  // https://github.com/owner/repo
  // https://github.com/owner/repo.git
  // https://github.com/owner/repo/tree/branch
  // https://github.com/owner/repo/tree/branch/path/to/skill
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?(?:\/(.+))?/);
  if (match) {
    const [, owner, rawRepo, branch, path] = match;
    // Strip .git extension if present
    const repo = rawRepo.replace(/\.git$/, '');
    return {
      owner,
      repo,
      ref: branch || 'main',
      path: path || undefined,
    };
  }

  throw new SksetError(
    'Invalid GitHub URL format',
    'Use: gh:owner/repo/path or https://github.com/owner/repo/tree/branch/path'
  );
}
