/**
 * Scaffold a new skill
 */

import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { text } from '@clack/prompts';
import { getLibraryPath } from '../lib/config.ts';
import {
  SKILL_DESCRIPTION_MAX_LENGTH,
  SKILL_NAME_MAX_LENGTH,
  SKILL_NAME_MIN_LENGTH,
  SKILL_NAME_PATTERN,
} from '../lib/constants.ts';
import { SksetError, UserCancelledError, ValidationError } from '../utils/errors.ts';
import * as out from '../utils/output.ts';

/**
 * Create a new skill from template
 */
export async function newSkill(skillName?: string): Promise<void> {
  // Get skill name
  let name = skillName;

  if (!name) {
    const result = await text({
      message: 'Skill name (lowercase, alphanumeric + hyphens):',
      placeholder: 'my-skill',
      validate: (value) => {
        if (!value) return 'Name is required';
        if (!SKILL_NAME_PATTERN.test(value)) {
          return 'Name must contain only lowercase letters, numbers, and hyphens';
        }
        if (value.startsWith('-') || value.endsWith('-')) {
          return 'Name cannot start or end with a hyphen';
        }
        if (value.includes('--')) {
          return 'Name cannot contain consecutive hyphens';
        }
        if (value.length < SKILL_NAME_MIN_LENGTH || value.length > SKILL_NAME_MAX_LENGTH) {
          return `Name must be ${SKILL_NAME_MIN_LENGTH}-${SKILL_NAME_MAX_LENGTH} characters`;
        }
        return undefined;
      },
    });

    if (typeof result === 'symbol') {
      throw new UserCancelledError();
    }

    name = result as string;
  } else {
    // Validate provided name
    if (!SKILL_NAME_PATTERN.test(name)) {
      throw new ValidationError('Invalid skill name', 'Use only lowercase letters, numbers, and hyphens');
    }
    if (name.startsWith('-') || name.endsWith('-')) {
      throw new ValidationError('Invalid skill name', 'Cannot start or end with a hyphen');
    }
    if (name.includes('--')) {
      throw new ValidationError('Invalid skill name', 'Cannot contain consecutive hyphens');
    }
    if (name.length < SKILL_NAME_MIN_LENGTH || name.length > SKILL_NAME_MAX_LENGTH) {
      throw new ValidationError(
        'Invalid skill name',
        `Must be ${SKILL_NAME_MIN_LENGTH}-${SKILL_NAME_MAX_LENGTH} characters`
      );
    }
  }

  const libraryPath = await getLibraryPath();
  const skillPath = join(libraryPath, name);

  // Check if skill already exists
  if (existsSync(skillPath)) {
    throw new SksetError(`Skill "${name}" already exists in library`);
  }

  // Get description
  const description = await text({
    message: 'Skill description:',
    placeholder: 'What does this skill do and when should it be used?',
    validate: (value) => {
      if (!value || value.trim().length === 0) return 'Description is required';
      if (value.length > SKILL_DESCRIPTION_MAX_LENGTH) {
        return `Description must be ${SKILL_DESCRIPTION_MAX_LENGTH} characters or less`;
      }
      return undefined;
    },
  });

  if (typeof description === 'symbol') {
    throw new UserCancelledError();
  }

  // Create skill directory structure
  await mkdir(skillPath, { recursive: true });
  await mkdir(join(skillPath, 'scripts'), { recursive: true });
  await mkdir(join(skillPath, 'references'), { recursive: true });
  await mkdir(join(skillPath, 'assets'), { recursive: true });

  // Create SKILL.md with template
  const template = `---
name: ${name}
description: ${description}
---

# ${name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')}

## Overview

${description}

## When to Use

Describe when an agent should invoke this skill.

## Instructions

Provide step-by-step instructions for the agent to follow.

## Examples

Provide examples of inputs and expected outputs.
`;

  await writeFile(join(skillPath, 'SKILL.md'), template, 'utf-8');

  out.success(`Created skill "${name}"`);
  out.info('');
  out.info(`Location: ${skillPath}`);
  out.info('');
  out.info('Next steps:');
  out.info(`  1. Edit ${skillPath}/SKILL.md to add instructions`);
  out.info(`  2. Add any scripts to ${skillPath}/scripts/`);
  out.info(`  3. Validate: skset validate ${name}`);
  out.info(`  4. Push to targets: skset push ${name}`);
}
