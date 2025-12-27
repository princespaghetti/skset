#!/usr/bin/env bun

/**
 * skset - LLM Skill Manager CLI
 */

import { Command } from 'commander';
import { init } from './commands/init.ts';
import { add } from './commands/add.ts';
import { remove } from './commands/remove.ts';
import { newSkill } from './commands/new.ts';
import { validate } from './commands/validate.ts';
import { inventory } from './commands/inventory.ts';
import { push } from './commands/push.ts';
import { pull } from './commands/pull.ts';
import pkg from '../package.json' with { type: 'json' };

const program = new Command();

program
  .name('skset')
  .description('LLM Skill Manager CLI for managing agent skills across multiple AI coding tools')
  .version(pkg.version);

// skset init
program
  .command('init')
  .description('Initialize skset configuration and library')
  .action(async () => {
    await init();
  });

// skset add <path>
program
  .command('add <path>')
  .description('Add a skill to the library')
  .action(async (path: string) => {
    await add(path);
  });

// skset remove <skill>
program
  .command('remove <skill>')
  .description('Remove a skill from the library')
  .option('--force', 'Remove without confirmation')
  .action(async (skill: string, options) => {
    await remove(skill, options.force);
  });

// skset new [skill]
program
  .command('new [skill]')
  .description('Create a new skill from template')
  .action(async (skill: string | undefined) => {
    await newSkill(skill);
  });

// skset validate [skill]
program
  .command('validate [skill]')
  .description('Validate a skill against the Agent Skills specification')
  .option('--all', 'Validate all skills in library')
  .action(async (skill: string | undefined, options) => {
    await validate(skill, options);
  });

// skset inventory
program
  .command('inventory')
  .description('List all skills across library and targets')
  .option('--library', 'Show library skills only')
  .option('--target <name>', 'Show specific target only')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    await inventory(options);
  });

// skset push [skill]
program
  .command('push [skill]')
  .description('Push skills from library to targets')
  .option('--all', 'Push all library skills')
  .option('--target <name>', 'Push to specific target only')
  .option('--repo', 'Push to repo-local directories instead of global')
  .option('--dry-run', 'Show what would be pushed without actually pushing')
  .option('--force', 'Force overwrite without confirmation')
  .action(async (skill: string | undefined, options) => {
    await push(skill, options);
  });

// skset pull [skill]
program
  .command('pull [skill]')
  .description('Pull skills from targets into library')
  .option('--all', 'Pull all skills from target(s)')
  .option('--target <name>', 'Pull from specific target only')
  .option('--from-repo', 'Pull from repo-local directories instead of global')
  .option('--force', 'Force overwrite without confirmation')
  .action(async (skill: string | undefined, options) => {
    await pull(skill, options);
  });

// Parse CLI arguments
program.parse();
