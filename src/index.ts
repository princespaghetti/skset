#!/usr/bin/env bun

/**
 * skset - LLM Skill Manager CLI
 */

import { Command } from 'commander';
import { init } from './commands/init.ts';
import { add } from './commands/add.ts';
import { validate } from './commands/validate.ts';
import { inventory } from './commands/inventory.ts';
import { push } from './commands/push.ts';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Get package.json path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '..', 'package.json');

// Read version from package.json
const packageJson = await Bun.file(packageJsonPath).json();
const version = packageJson.version || '0.1.0';

const program = new Command();

program
  .name('skset')
  .description('LLM Skill Manager CLI for managing agent skills across multiple AI coding tools')
  .version(version);

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

// Parse CLI arguments
program.parse();
