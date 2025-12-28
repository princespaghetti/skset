/**
 * Manage skill groups
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  addSkillToGroup,
  createGroup as createGroupInConfig,
  deleteGroup as deleteGroupInConfig,
  getGroupNames,
  getLibraryPath,
  getSkillsInGroup,
  groupExists,
  loadConfig,
  removeSkillFromGroup,
  saveConfig,
  skillExistsInGroup,
} from '../lib/config.ts';
import { parseSkill } from '../lib/skills.ts';
import { GroupNotFoundError, SkillNotFoundError, SksetError } from '../utils/errors.ts';
import * as out from '../utils/output.ts';

/**
 * List all groups and their skills
 */
export async function list(): Promise<void> {
  const config = await loadConfig();
  const groupNames = getGroupNames(config);

  if (groupNames.length === 0) {
    out.info('No groups configured');
    out.info('Create a group with: skset groups create <name>');
    return;
  }

  console.log(out.bold('Groups:\n'));

  for (const groupName of groupNames) {
    const skills = getSkillsInGroup(config, groupName);
    const count = skills.length;

    if (skills.length === 0) {
      console.log(`  ${out.bold(groupName)} (empty)`);
    } else {
      console.log(`  ${out.bold(groupName)} (${count} skill${count === 1 ? '' : 's'}):`);
      for (const skillName of skills) {
        console.log(`    ${out.dim('•')} ${skillName}`);
      }
    }
    console.log('');
  }
}

/**
 * Create a new empty group
 */
export async function create(name: string): Promise<void> {
  const config = await loadConfig();

  if (groupExists(config, name)) {
    throw new SksetError(`Group "${name}" already exists`);
  }

  const updatedConfig = createGroupInConfig(config, name);
  await saveConfig(updatedConfig);

  out.success(`Created group "${name}"`);
}

/**
 * Delete a group (skills remain in library)
 */
export async function deleteGroup(name: string): Promise<void> {
  const config = await loadConfig();

  if (!groupExists(config, name)) {
    throw new GroupNotFoundError(name);
  }

  const updatedConfig = deleteGroupInConfig(config, name);
  await saveConfig(updatedConfig);

  out.success(`Deleted group "${name}"`);
  out.info('Skills in this group remain in the library');
}

/**
 * Add a skill to a group
 */
export async function add(groupName: string, skillName: string): Promise<void> {
  const config = await loadConfig();
  const libraryPath = await getLibraryPath();
  const skillPath = join(libraryPath, skillName);

  // Verify skill exists in library
  if (!existsSync(skillPath)) {
    throw new SkillNotFoundError(skillName, 'Add the skill to the library first with: skset add <path>');
  }

  // Verify it's a valid skill
  const skill = await parseSkill(skillPath);
  if (!skill) {
    throw new SksetError(`"${skillName}" is not a valid skill (missing SKILL.md)`);
  }

  // Check if already in group
  if (skillExistsInGroup(config, groupName, skillName)) {
    out.warning(`Skill "${skillName}" is already in group "${groupName}"`);
    return;
  }

  // Add to group (creates group if it doesn't exist)
  const updatedConfig = addSkillToGroup(config, groupName, skillName);
  await saveConfig(updatedConfig);

  if (!groupExists(config, groupName)) {
    out.success(`Created group "${groupName}" and added skill "${skillName}"`);
  } else {
    out.success(`Added skill "${skillName}" to group "${groupName}"`);
  }
}

/**
 * Remove a skill from a group
 */
export async function remove(groupName: string, skillName: string): Promise<void> {
  const config = await loadConfig();

  if (!groupExists(config, groupName)) {
    throw new GroupNotFoundError(groupName);
  }

  if (!skillExistsInGroup(config, groupName, skillName)) {
    throw new SksetError(`Skill "${skillName}" is not in group "${groupName}"`);
  }

  const updatedConfig = removeSkillFromGroup(config, groupName, skillName);
  await saveConfig(updatedConfig);

  out.success(`Removed skill "${skillName}" from group "${groupName}"`);
  out.info('Skill remains in library');
}
