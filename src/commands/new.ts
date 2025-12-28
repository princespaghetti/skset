/**
 * Scaffold a new skill
 */

import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { text } from '@clack/prompts';
import { getLibraryPath } from '../lib/config.ts';
import * as out from '../utils/output.ts';

/**
 * Create a new skill from template
 */
export async function newSkill(skillName?: string): Promise<void> {
  try {
    // Get skill name
    let name = skillName;

    if (!name) {
      const result = await text({
        message: 'Skill name (lowercase, alphanumeric + hyphens):',
        placeholder: 'my-skill',
        validate: (value) => {
          if (!value) return 'Name is required';
          if (!/^[a-z0-9-]+$/.test(value)) {
            return 'Name must contain only lowercase letters, numbers, and hyphens';
          }
          if (value.startsWith('-') || value.endsWith('-')) {
            return 'Name cannot start or end with a hyphen';
          }
          if (value.includes('--')) {
            return 'Name cannot contain consecutive hyphens';
          }
          if (value.length < 1 || value.length > 64) {
            return 'Name must be 1-64 characters';
          }
          return undefined;
        },
      });

      if (typeof result === 'symbol') {
        // User cancelled
        out.info('Cancelled');
        process.exit(0);
      }

      name = result as string;
    } else {
      // Validate provided name
      if (!/^[a-z0-9-]+$/.test(name)) {
        out.error('Invalid skill name', 'Use only lowercase letters, numbers, and hyphens');
        process.exit(1);
      }
      if (name.startsWith('-') || name.endsWith('-')) {
        out.error('Invalid skill name', 'Cannot start or end with a hyphen');
        process.exit(1);
      }
      if (name.includes('--')) {
        out.error('Invalid skill name', 'Cannot contain consecutive hyphens');
        process.exit(1);
      }
      if (name.length < 1 || name.length > 64) {
        out.error('Invalid skill name', 'Must be 1-64 characters');
        process.exit(1);
      }
    }

    const libraryPath = await getLibraryPath();
    const skillPath = join(libraryPath, name);

    // Check if skill already exists
    if (existsSync(skillPath)) {
      out.error(`Skill "${name}" already exists in library`);
      process.exit(1);
    }

    // Get description
    const description = await text({
      message: 'Skill description:',
      placeholder: 'What does this skill do and when should it be used?',
      validate: (value) => {
        if (!value || value.trim().length === 0) return 'Description is required';
        if (value.length > 1024) return 'Description must be 1024 characters or less';
        return undefined;
      },
    });

    if (typeof description === 'symbol') {
      out.info('Cancelled');
      process.exit(0);
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
  } catch (err) {
    out.error('Failed to create skill', (err as Error).message);
    process.exit(1);
  }
}
