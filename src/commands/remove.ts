/**
 * Remove a skill from the library
 */

import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { confirm } from '@clack/prompts';
import { getLibraryPath } from '../lib/config.ts';
import { parseSkill } from '../lib/skills.ts';
import * as out from '../utils/output.ts';

/**
 * Remove a skill from the library
 */
export async function remove(skillName: string, force: boolean = false): Promise<void> {
  try {
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
    if (!force) {
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

    out.success(`Removed "${skillName}" from library`);
  } catch (err) {
    out.error('Failed to remove skill', (err as Error).message);
    process.exit(1);
  }
}
