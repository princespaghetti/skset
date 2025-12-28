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
import { GroupNotFoundError, SkillNotFoundError, SksetError, UserCancelledError } from '../utils/errors.ts';
import * as out from '../utils/output.ts';

/**
 * Remove a skill from the library
 */
export async function remove(skillName: string, options: RemoveOptions = {}): Promise<void> {
  // Handle --from-group option: remove from group only, keep in library
  if (options.fromGroup) {
    const config = await loadConfig();

    if (!groupExists(config, options.fromGroup)) {
      throw new GroupNotFoundError(options.fromGroup);
    }

    if (!skillExistsInGroup(config, options.fromGroup, skillName)) {
      throw new SksetError(`Skill "${skillName}" is not in group "${options.fromGroup}"`);
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
    throw new SkillNotFoundError(skillName);
  }

  // Verify it's actually a skill
  const skill = await parseSkill(skillPath);
  if (!skill) {
    throw new SksetError(`"${skillName}" is not a valid skill directory`);
  }

  // Confirm deletion unless forced
  if (!options.force) {
    const shouldRemove = await confirm({
      message: `Remove "${skillName}" from library? This cannot be undone.`,
      initialValue: false,
    });

    if (shouldRemove === false || typeof shouldRemove === 'symbol') {
      throw new UserCancelledError();
    }
  }

  // Remove the directory
  await rm(skillPath, { recursive: true, force: true });

  // Also remove from all groups
  const config = await loadConfig();
  const updatedConfig = removeSkillFromAllGroups(config, skillName);
  await saveConfig(updatedConfig);

  out.success(`Removed "${skillName}" from library`);
}
