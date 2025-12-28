/**
 * Pull skills from targets into library
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { confirm } from '@clack/prompts';
import { getLibraryPath, loadConfig } from '../lib/config.ts';
import { copyDirectory, directoriesMatch, skillExists } from '../lib/copy.ts';
import { listSkills, parseSkill } from '../lib/skills.ts';
import { getGlobalPaths, getRepoPaths, getTarget } from '../lib/targets.ts';
import * as out from '../utils/output.ts';
import { isInGitRepo } from '../utils/paths.ts';

interface PullOptions {
  target?: string;
  fromRepo?: boolean;
  all?: boolean;
  force?: boolean;
}

/**
 * Pull skills from targets into library
 */
export async function pull(skillName?: string, options: PullOptions = {}): Promise<void> {
  try {
    const libraryPath = await getLibraryPath();

    if (!existsSync(libraryPath)) {
      out.error('Library not found', 'Run "skset init" first');
      process.exit(1);
    }

    if (options.all) {
      // Pull all skills from target(s)
      await pullAll(libraryPath, options);
    } else if (skillName) {
      // Pull specific skill
      await pullSingle(skillName, libraryPath, options);
    } else {
      out.error('Please specify a skill name or use --all');
      process.exit(1);
    }
  } catch (err) {
    out.error('Failed to pull skills', (err as Error).message);
    process.exit(1);
  }
}

/**
 * Pull a single skill by name
 */
async function pullSingle(skillName: string, libraryPath: string, options: PullOptions): Promise<void> {
  // Determine source paths to search
  const sourcePaths = await getSourcePaths(options);

  if (sourcePaths.size === 0) {
    out.error('No source targets configured');
    process.exit(1);
  }

  // Find the skill in any target
  let foundPath: string | null = null;
  let foundTarget: string | null = null;

  for (const [targetName, targetPath] of sourcePaths) {
    const skillPath = join(targetPath, skillName);

    if (existsSync(skillPath)) {
      const skill = await parseSkill(skillPath);
      if (skill) {
        foundPath = skillPath;
        foundTarget = targetName;
        break;
      }
    }
  }

  if (!foundPath) {
    out.error(`Skill "${skillName}" not found in any target`);
    process.exit(1);
  }

  // Copy to library
  const destPath = join(libraryPath, skillName);

  // Check if already exists
  if (await skillExists(destPath)) {
    const isSame = await directoriesMatch(foundPath, destPath);

    if (isSame) {
      out.info(`Skill "${skillName}" already exists in library (identical)`);
      return;
    }

    // Prompt if different and not forcing
    if (!options.force) {
      const shouldOverwrite = await confirm({
        message: `Skill "${skillName}" already exists in library. Overwrite?`,
        initialValue: false,
      });

      if (!shouldOverwrite) {
        out.info('Cancelled');
        return;
      }
    }
  }

  // Copy skill
  const result = await copyDirectory(foundPath, destPath);

  if (!result.success) {
    out.error(`Failed to pull "${skillName}"`, result.error);
    process.exit(1);
  }

  out.success(`Pulled "${skillName}" from ${foundTarget}`);
}

/**
 * Pull all skills from target(s)
 */
async function pullAll(libraryPath: string, options: PullOptions): Promise<void> {
  const sourcePaths = await getSourcePaths(options);

  if (sourcePaths.size === 0) {
    out.error('No source targets configured');
    process.exit(1);
  }

  let totalPulled = 0;
  let totalSkipped = 0;

  for (const [targetName, targetPath] of sourcePaths) {
    if (!existsSync(targetPath)) {
      continue;
    }

    const skills = await listSkills(targetPath);

    for (const skill of skills) {
      const sourcePath = skill.path;
      const destPath = join(libraryPath, skill.name);

      // Check if already exists
      if (await skillExists(destPath)) {
        const isSame = await directoriesMatch(sourcePath, destPath);

        if (isSame) {
          totalSkipped++;
          continue;
        }

        // Prompt if different and not forcing
        if (!options.force) {
          const shouldOverwrite = await confirm({
            message: `Overwrite "${skill.name}" in library with version from ${targetName}?`,
            initialValue: false,
          });

          if (!shouldOverwrite) {
            totalSkipped++;
            continue;
          }
        }
      }

      // Copy skill
      const result = await copyDirectory(sourcePath, destPath);

      if (!result.success) {
        out.error(`Failed to pull "${skill.name}" from ${targetName}`, result.error);
        continue;
      }

      totalPulled++;
      out.success(`Pulled "${skill.name}" from ${targetName}`);
    }
  }

  // Summary
  if (totalPulled > 0 || totalSkipped > 0) {
    console.log('');
    console.log(out.dim(`Pulled: ${totalPulled} | Skipped: ${totalSkipped}`));
  } else {
    out.info('No skills found to pull');
  }
}

/**
 * Get source paths based on options
 */
async function getSourcePaths(options: PullOptions): Promise<Map<string, string>> {
  if (options.target) {
    // Pull from specific target
    const target = await getTarget(options.target);
    if (!target) {
      throw new Error(`Target "${options.target}" not found in config`);
    }

    const path = options.fromRepo ? target.repo : target.global;

    if (!path) {
      const type = options.fromRepo ? 'repo' : 'global';
      throw new Error(`Target "${options.target}" has no ${type} path configured`);
    }

    const resolvedPath = options.fromRepo
      ? require('../utils/paths.ts').resolveRepoPath(path)
      : require('../utils/paths.ts').expandHome(path);

    return new Map([[options.target, resolvedPath]]);
  }

  // Pull from all targets
  if (options.fromRepo) {
    if (!isInGitRepo()) {
      throw new Error('Not in a git repository');
    }
    const config = await loadConfig();
    return getRepoPaths(config);
  } else {
    return await getGlobalPaths();
  }
}
