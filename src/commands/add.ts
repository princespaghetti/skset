/**
 * Add a skill to the library
 */

import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { confirm } from '@clack/prompts';
import { addSkillToGroup, getLibraryPath, loadConfig, saveConfig } from '../lib/config.ts';
import { copyDirectory, skillExists } from '../lib/copy.ts';
import { parseSkill, validateSkill } from '../lib/skills.ts';
import type { AddOptions } from '../types/index.ts';
import { SksetError, UserCancelledError, ValidationError } from '../utils/errors.ts';
import * as out from '../utils/output.ts';

/**
 * Add a skill to the library
 */
export async function add(skillPath: string, options: AddOptions = {}): Promise<void> {
  // Resolve path
  const sourcePath = resolve(skillPath);

  if (!existsSync(sourcePath)) {
    throw new SksetError(`Path not found: ${skillPath}`);
  }

  // Parse and validate skill
  const skill = await parseSkill(sourcePath);

  if (!skill) {
    throw new ValidationError('SKILL.md not found', 'The directory must contain a SKILL.md file');
  }

  const validation = await validateSkill(skill);

  if (!validation.valid) {
    const errorMsg = `Skill validation failed:\n${validation.errors.map((e) => `  • ${e}`).join('\n')}`;
    throw new ValidationError(errorMsg, 'Fix these errors and try again');
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

  if (await skillExists(destPath)) {
    const shouldOverwrite = await confirm({
      message: `Skill "${skill.name}" already exists in library. Overwrite?`,
      initialValue: false,
    });

    if (shouldOverwrite === false || typeof shouldOverwrite === 'symbol') {
      throw new UserCancelledError();
    }
  }

  // Copy skill to library
  const result = await copyDirectory(sourcePath, destPath);

  if (!result.success) {
    throw new SksetError('Failed to copy skill', result.error);
  }

  out.success(`Added "${skill.name}" to library`);
  out.dim(`Copied ${result.filesCopied.length} file(s)`);

  // Add to group if specified
  if (options.group) {
    const config = await loadConfig();
    const updatedConfig = addSkillToGroup(config, options.group, skill.name);
    await saveConfig(updatedConfig);
    out.success(`Added "${skill.name}" to group "${options.group}"`);
  }
}
