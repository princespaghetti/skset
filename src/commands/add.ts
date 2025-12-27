/**
 * Add a skill to the library
 */

import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { confirm } from '@clack/prompts';
import { getLibraryPath } from '../lib/config.ts';
import { parseSkill, validateSkill } from '../lib/skills.ts';
import { copyDirectory, skillExists } from '../lib/copy.ts';
import * as out from '../utils/output.ts';

/**
 * Add a skill to the library
 */
export async function add(skillPath: string): Promise<void> {
  try {
    // Resolve path
    const sourcePath = resolve(skillPath);

    if (!existsSync(sourcePath)) {
      out.error(`Path not found: ${skillPath}`);
      process.exit(1);
    }

    // Parse and validate skill
    const skill = await parseSkill(sourcePath);

    if (!skill) {
      out.error('SKILL.md not found', `The directory must contain a SKILL.md file`);
      process.exit(2);
    }

    const validation = await validateSkill(skill);

    if (!validation.valid) {
      out.error('Skill validation failed');
      console.log('');
      for (const error of validation.errors) {
        console.log(out.dim(`  • ${error}`));
      }
      console.log('');
      out.info('Fix these errors and try again');
      process.exit(2);
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      for (const warning of validation.warnings) {
        out.warning(warning);
      }
      console.log('');
    }

    // Check if skill already exists in library
    const libraryPath = await getLibraryPath();
    const destPath = join(libraryPath, skill.name);

    if (skillExists(destPath)) {
      const shouldOverwrite = await confirm({
        message: `Skill "${skill.name}" already exists in library. Overwrite?`,
        initialValue: false,
      });

      if (!shouldOverwrite) {
        out.info('Cancelled');
        process.exit(0);
      }
    }

    // Copy skill to library
    const result = await copyDirectory(sourcePath, destPath);

    if (!result.success) {
      out.error('Failed to copy skill', result.error);
      process.exit(1);
    }

    out.success(`Added "${skill.name}" to library`);
    out.dim(`Copied ${result.filesCopied.length} file(s)`);
  } catch (err) {
    out.error('Failed to add skill', (err as Error).message);
    process.exit(1);
  }
}
