/**
 * Push skills from library to targets
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { confirm } from '@clack/prompts';
import { getLibraryPath, getSkillsInGroup, groupExists, loadConfig } from '../lib/config.ts';
import { copyDirectory, directoriesMatch, skillExists } from '../lib/copy.ts';
import { listSkills, parseSkill } from '../lib/skills.ts';
import { resolveTargetPaths } from '../lib/targets.ts';
import type { PushOptions } from '../types/index.ts';
import {
  ConfigError,
  GroupNotFoundError,
  isInteractive,
  NonInteractiveError,
  SkillNotFoundError,
  SksetError,
} from '../utils/errors.ts';
import * as out from '../utils/output.ts';

/**
 * Push skills to targets
 * Note: Read-only sources (configured in config.sources) are never used as push targets.
 * They are only for skill discovery in inventory commands.
 */
export async function push(skillName?: string, options: PushOptions = {}): Promise<void> {
  const libraryPath = await getLibraryPath();

  if (!existsSync(libraryPath)) {
    throw new ConfigError('Library not found', 'Run "skset init" first');
  }

  // Determine which skills to push
  const skillsToPush = await getSkillsToPush(libraryPath, skillName, options);

  if (skillsToPush.length === 0) {
    if (options.all) {
      out.info('No skills in library to push');
    } else if (skillName) {
      throw new SkillNotFoundError(skillName);
    }
    return;
  }

  // Resolve target paths
  const targetPaths = await resolveTargetPaths(options.target, options.repo);

  if (targetPaths.size === 0) {
    throw new ConfigError('No targets configured');
  }

  // Dry run
  if (options.dryRun) {
    console.log('');
    console.log(out.bold('Dry run - would push:'));
    console.log('');

    for (const skillName of skillsToPush) {
      console.log(out.highlight(`  ${skillName}`));
      for (const [targetName] of targetPaths) {
        console.log(out.dim(`    → ${targetName}`));
      }
    }

    console.log('');
    return;
  }

  // Push each skill to each target
  let totalPushed = 0;
  let totalSkipped = 0;

  for (const skillName of skillsToPush) {
    const skillPath = join(libraryPath, skillName);

    for (const [targetName, targetPath] of targetPaths) {
      const destPath = join(targetPath, skillName);

      // Check for conflicts
      if (await skillExists(destPath)) {
        const isSame = await directoriesMatch(skillPath, destPath);

        if (isSame) {
          // Skip if identical
          totalSkipped++;
          continue;
        }

        // Prompt if different and not forcing
        if (!options.force) {
          if (!isInteractive()) {
            throw new NonInteractiveError();
          }
          const shouldOverwrite = await confirm({
            message: `Overwrite "${skillName}" in ${targetName}?`,
            initialValue: false,
          });

          if (shouldOverwrite === false || typeof shouldOverwrite === 'symbol') {
            totalSkipped++;
            continue;
          }
        }
      }

      // Copy skill
      const result = await copyDirectory(skillPath, destPath);

      if (!result.success) {
        throw new SksetError(`Failed to push "${skillName}" to ${targetName}`, result.error);
      }

      totalPushed++;
      out.success(`Pushed "${skillName}" to ${targetName}`);
    }
  }

  // Summary
  if (totalPushed > 0 || totalSkipped > 0) {
    console.log('');
    console.log(out.dim(`Pushed: ${totalPushed} | Skipped: ${totalSkipped}`));
  }
}

/**
 * Get list of skill names to push
 */
async function getSkillsToPush(
  libraryPath: string,
  skillName: string | undefined,
  options: PushOptions
): Promise<string[]> {
  if (options.group) {
    // Push all skills in a group
    const config = await loadConfig();

    if (!groupExists(config, options.group)) {
      throw new GroupNotFoundError(options.group);
    }

    const skills = getSkillsInGroup(config, options.group);

    if (skills.length === 0) {
      out.info(`Group "${options.group}" is empty`);
      out.info(`Add skills with: skset groups add ${options.group} <skill>`);
    }

    return skills;
  }

  if (options.all) {
    // Push all skills
    const skills = await listSkills(libraryPath);
    return skills.map((s) => s.name);
  }

  if (skillName) {
    // Push single skill
    const skillPath = join(libraryPath, skillName);
    const skill = await parseSkill(skillPath);

    if (!skill) {
      return [];
    }

    return [skill.name];
  }

  return [];
}
