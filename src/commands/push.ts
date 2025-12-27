/**
 * Push skills from library to targets
 */

import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { confirm } from '@clack/prompts';
import type { PushOptions } from '../types/index.ts';
import { getLibraryPath, loadConfig, getSkillsInGroup, groupExists } from '../lib/config.ts';
import { listSkills, parseSkill } from '../lib/skills.ts';
import { copyDirectory, skillExists, directoriesMatch } from '../lib/copy.ts';
import { resolveTargetPaths } from '../lib/targets.ts';
import * as out from '../utils/output.ts';

/**
 * Push skills to targets
 * Note: Read-only sources (configured in config.sources) are never used as push targets.
 * They are only for skill discovery in inventory commands.
 */
export async function push(
  skillName?: string,
  options: PushOptions = {}
): Promise<void> {
  try {
    const libraryPath = await getLibraryPath();

    if (!existsSync(libraryPath)) {
      out.error('Library not found', 'Run "skset init" first');
      process.exit(1);
    }

    // Determine which skills to push
    const skillsToPush = await getSkillsToPush(libraryPath, skillName, options);

    if (skillsToPush.length === 0) {
      if (options.all) {
        out.info('No skills in library to push');
      } else if (skillName) {
        out.error(`Skill "${skillName}" not found in library`);
        process.exit(1);
      }
      return;
    }

    // Resolve target paths
    const targetPaths = await resolveTargetPaths(options.target, options.repo);

    if (targetPaths.size === 0) {
      out.error('No targets configured');
      process.exit(1);
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
        if (skillExists(destPath)) {
          const isSame = await directoriesMatch(skillPath, destPath);

          if (isSame) {
            // Skip if identical
            totalSkipped++;
            continue;
          }

          // Prompt if different and not forcing
          if (!options.force) {
            const shouldOverwrite = await confirm({
              message: `Overwrite "${skillName}" in ${targetName}?`,
              initialValue: false,
            });

            if (!shouldOverwrite) {
              totalSkipped++;
              continue;
            }
          }
        }

        // Copy skill
        const result = await copyDirectory(skillPath, destPath);

        if (!result.success) {
          out.error(`Failed to push "${skillName}" to ${targetName}`, result.error);
          continue;
        }

        totalPushed++;
        out.success(`Pushed "${skillName}" to ${targetName}`);
      }
    }

    // Summary
    if (totalPushed > 0 || totalSkipped > 0) {
      console.log('');
      console.log(
        out.dim(`Pushed: ${totalPushed} | Skipped: ${totalSkipped}`)
      );
    }
  } catch (err) {
    out.error('Failed to push skills', (err as Error).message);
    process.exit(1);
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
      out.error(`Group "${options.group}" does not exist`);
      out.info('Run "skset groups list" to see available groups');
      process.exit(1);
    }

    const skills = getSkillsInGroup(config, options.group);

    if (skills.length === 0) {
      out.info(`Group "${options.group}" is empty`);
      out.info(`Add skills with: skset groups add ${options.group} <skill>`);
    }

    return skills;
  } else if (options.all) {
    // Push all skills
    const skills = await listSkills(libraryPath);
    return skills.map(s => s.name);
  } else if (skillName) {
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
