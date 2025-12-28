/**
 * Remove a skill from the library
 */

import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { confirm } from '@clack/prompts';
import {
  getLibraryPath,
  groupExists,
  loadConfig,
  removeSkillFromAllGroups,
  removeSkillFromGroup,
  saveConfig,
  skillExistsInGroup,
} from '../lib/config.ts';
import { parseSkill } from '../lib/skills.ts';
import type { RemoveOptions } from '../types/index.ts';
import * as out from '../utils/output.ts';

/**
 * Remove a skill from the library
 */
export async function remove(skillName: string, options: RemoveOptions = {}): Promise<void> {
  try {
    // Handle --from-group option: remove from group only, keep in library
    if (options.fromGroup) {
      const config = await loadConfig();

      if (!groupExists(config, options.fromGroup)) {
        out.error(`Group "${options.fromGroup}" does not exist`);
        out.info('Run "skset groups list" to see available groups');
        process.exit(1);
      }

      if (!skillExistsInGroup(config, options.fromGroup, skillName)) {
        out.error(`Skill "${skillName}" is not in group "${options.fromGroup}"`);
        process.exit(1);
      }

      const updatedConfig = removeSkillFromGroup(config, options.fromGroup, skillName);
      await saveConfig(updatedConfig);

      out.success(`Removed "${skillName}" from group "${options.fromGroup}"`);
      out.info('Skill remains in library');
      return;
    }

    // Full deletion from library
    const libraryPath = await getLibraryPath();
    const skillPath = join(libraryPath, skillName);

    if (!existsSync(skillPath)) {
      out.error(`Skill "${skillName}" not found in library`);
      process.exit(1);
    }

    // Verify it's actually a skill
    const skill = await parseSkill(skillPath);
    if (!skill) {
      out.error(`"${skillName}" is not a valid skill directory`);
      process.exit(1);
    }

    // Confirm deletion unless forced
    if (!options.force) {
      const shouldRemove = await confirm({
        message: `Remove "${skillName}" from library? This cannot be undone.`,
        initialValue: false,
      });

      if (!shouldRemove) {
        out.info('Cancelled');
        process.exit(0);
      }
    }

    // Remove the directory
    await rm(skillPath, { recursive: true, force: true });

    // Also remove from all groups
    const config = await loadConfig();
    const updatedConfig = removeSkillFromAllGroups(config, skillName);
    await saveConfig(updatedConfig);

    out.success(`Removed "${skillName}" from library`);
  } catch (err) {
    out.error('Failed to remove skill', (err as Error).message);
    process.exit(1);
  }
}
