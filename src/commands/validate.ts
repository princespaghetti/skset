/**
 * Validate skills against Agent Skills specification
 */

import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import pc from 'picocolors';
import { getLibraryPath } from '../lib/config.ts';
import { listSkills, parseSkill, validateSkill } from '../lib/skills.ts';
import type { ValidateOptions } from '../types/index.ts';
import * as out from '../utils/output.ts';

/**
 * Validate a skill
 */
export async function validate(skillNameOrPath?: string, options: ValidateOptions = {}): Promise<void> {
  try {
    if (options.all) {
      // Validate all library skills
      await validateAllSkills();
    } else if (skillNameOrPath) {
      // Validate single skill
      await validateSingleSkill(skillNameOrPath);
    } else {
      out.error('Please specify a skill name/path or use --all');
      process.exit(1);
    }
  } catch (err) {
    out.error('Validation failed', (err as Error).message);
    process.exit(1);
  }
}

/**
 * Validate a single skill by name or path
 */
async function validateSingleSkill(skillNameOrPath: string): Promise<void> {
  let skillPath: string;

  // Check if it's a local path
  if (existsSync(skillNameOrPath)) {
    skillPath = resolve(skillNameOrPath);
  } else {
    // Try to find in library
    const libraryPath = await getLibraryPath();
    skillPath = join(libraryPath, skillNameOrPath);

    if (!existsSync(skillPath)) {
      out.error(`Skill "${skillNameOrPath}" not found`, 'Specify a valid skill directory path or name from library');
      process.exit(2);
    }
  }

  const skill = await parseSkill(skillPath);

  if (!skill) {
    out.error('SKILL.md not found in directory', skillPath);
    process.exit(2);
  }

  const result = await validateSkill(skill);

  // Print results
  console.log('');
  console.log(out.bold(`Validating: ${skill.name}`));
  console.log(out.dim(`Path: ${skillPath}`));
  console.log('');

  if (result.errors.length > 0) {
    console.log(pc.red('✗ Validation failed\n'));
    for (const error of result.errors) {
      console.log(pc.red(`  • ${error}`));
    }
    console.log('');
  } else {
    console.log(pc.green('✓ Validation passed\n'));
  }

  if (result.warnings.length > 0) {
    console.log(pc.yellow('Warnings:\n'));
    for (const warning of result.warnings) {
      console.log(pc.yellow(`  • ${warning}`));
    }
    console.log('');
  }

  if (result.lineCount) {
    console.log(out.dim(`Lines: ${result.lineCount} | Tokens: ~${result.estimatedTokens}`));
  }

  if (!result.valid) {
    process.exit(2);
  }
}

/**
 * Validate all skills in library
 */
async function validateAllSkills(): Promise<void> {
  const libraryPath = await getLibraryPath();

  if (!existsSync(libraryPath)) {
    out.error('Library not found', `Run "skset init" first`);
    process.exit(1);
  }

  const skills = await listSkills(libraryPath);

  if (skills.length === 0) {
    out.info('No skills found in library');
    return;
  }

  console.log('');
  console.log(out.bold(`Validating ${skills.length} skill(s)...\n`));

  let validCount = 0;
  let invalidCount = 0;

  for (const skill of skills) {
    const result = await validateSkill(skill);

    if (result.valid) {
      validCount++;
      console.log(`${pc.green('✓')} ${skill.name}`);
    } else {
      invalidCount++;
      console.log(`${pc.red('✗')} ${skill.name}`);
      for (const error of result.errors) {
        console.log(pc.red(`    ${error}`));
      }
    }

    if (result.warnings.length > 0) {
      for (const warning of result.warnings) {
        console.log(pc.yellow(`    ${warning}`));
      }
    }
  }

  console.log('');
  console.log(`Valid: ${validCount} | Invalid: ${invalidCount}`);

  if (invalidCount > 0) {
    process.exit(2);
  }
}
