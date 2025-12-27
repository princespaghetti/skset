/**
 * Manage skill groups
 */

import { join } from 'node:path';
import { existsSync } from 'node:fs';
import {
  loadConfig,
  saveConfig,
  getGroupNames,
  getSkillsInGroup,
  groupExists,
  skillExistsInGroup,
  createGroup as createGroupInConfig,
  deleteGroup as deleteGroupInConfig,
  addSkillToGroup,
  removeSkillFromGroup,
  getLibraryPath,
} from '../lib/config.ts';
import { parseSkill } from '../lib/skills.ts';
import * as out from '../utils/output.ts';

/**
 * List all groups and their skills
 */
export async function list(): Promise<void> {
  try {
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
  } catch (err) {
    out.error('Failed to list groups', (err as Error).message);
    process.exit(1);
  }
}

/**
 * Create a new empty group
 */
export async function create(name: string): Promise<void> {
  try {
    const config = await loadConfig();

    if (groupExists(config, name)) {
      out.error(`Group "${name}" already exists`);
      process.exit(1);
    }

    const updatedConfig = createGroupInConfig(config, name);
    await saveConfig(updatedConfig);

    out.success(`Created group "${name}"`);
  } catch (err) {
    out.error('Failed to create group', (err as Error).message);
    process.exit(1);
  }
}

/**
 * Delete a group (skills remain in library)
 */
export async function deleteGroup(name: string): Promise<void> {
  try {
    const config = await loadConfig();

    if (!groupExists(config, name)) {
      out.error(`Group "${name}" does not exist`);
      out.info(`Run "skset groups list" to see available groups`);
      process.exit(1);
    }

    const updatedConfig = deleteGroupInConfig(config, name);
    await saveConfig(updatedConfig);

    out.success(`Deleted group "${name}"`);
    out.info('Skills in this group remain in the library');
  } catch (err) {
    out.error('Failed to delete group', (err as Error).message);
    process.exit(1);
  }
}

/**
 * Add a skill to a group
 */
export async function add(groupName: string, skillName: string): Promise<void> {
  try {
    const config = await loadConfig();
    const libraryPath = await getLibraryPath();
    const skillPath = join(libraryPath, skillName);

    // Verify skill exists in library
    if (!existsSync(skillPath)) {
      out.error(`Skill "${skillName}" not found in library`);
      out.info('Add the skill to the library first with: skset add <path>');
      process.exit(1);
    }

    // Verify it's a valid skill
    const skill = await parseSkill(skillPath);
    if (!skill) {
      out.error(`"${skillName}" is not a valid skill (missing SKILL.md)`);
      process.exit(1);
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
  } catch (err) {
    out.error('Failed to add skill to group', (err as Error).message);
    process.exit(1);
  }
}

/**
 * Remove a skill from a group
 */
export async function remove(groupName: string, skillName: string): Promise<void> {
  try {
    const config = await loadConfig();

    if (!groupExists(config, groupName)) {
      out.error(`Group "${groupName}" does not exist`);
      out.info('Run "skset groups list" to see available groups');
      process.exit(1);
    }

    if (!skillExistsInGroup(config, groupName, skillName)) {
      out.error(`Skill "${skillName}" is not in group "${groupName}"`);
      process.exit(1);
    }

    const updatedConfig = removeSkillFromGroup(config, groupName, skillName);
    await saveConfig(updatedConfig);

    out.success(`Removed skill "${skillName}" from group "${groupName}"`);
    out.info('Skill remains in library');
  } catch (err) {
    out.error('Failed to remove skill from group', (err as Error).message);
    process.exit(1);
  }
}
