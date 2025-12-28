#!/usr/bin/env bun

/**
 * skset - LLM Skill Manager CLI
 */

import { Command } from 'commander';
import pkg from '../package.json' with { type: 'json' };
import { add } from './commands/add.ts';
import * as groups from './commands/groups.ts';
import { init } from './commands/init.ts';
import { inventory } from './commands/inventory.ts';
import { newSkill } from './commands/new.ts';
import { pull } from './commands/pull.ts';
import { push } from './commands/push.ts';
import { remove } from './commands/remove.ts';
import { validate } from './commands/validate.ts';

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
  .option('-g, --group <name>', 'Add skill to the specified group')
  .action(async (path: string, options) => {
    await add(path, options);
  });

// skset remove <skill>
program
  .command('remove <skill>')
  .description('Remove a skill from the library')
  .option('--force', 'Remove without confirmation')
  .option('--from-group <name>', 'Remove from group only, keep in library')
  .action(async (skill: string, options) => {
    await remove(skill, options);
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
  .option('-g, --group <name>', 'Filter to show only skills in this group')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    await inventory(options);
  });

// skset push [skill]
program
  .command('push [skill]')
  .description('Push skills from library to targets')
  .option('--all', 'Push all library skills')
  .option('-g, --group <name>', 'Push all skills in the specified group')
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

// skset groups
const groupsCmd = program.command('groups').description('Manage skill groups');

// Default action for bare `skset groups` = list
groupsCmd.action(async () => {
  await groups.list();
});

// skset groups list
groupsCmd
  .command('list')
  .description('List all groups and their skills')
  .action(async () => {
    await groups.list();
  });

// skset groups create <name>
groupsCmd
  .command('create <name>')
  .description('Create a new group')
  .action(async (name: string) => {
    await groups.create(name);
  });

// skset groups delete <name>
groupsCmd
  .command('delete <name>')
  .description('Delete a group (skills remain in library)')
  .action(async (name: string) => {
    await groups.deleteGroup(name);
  });

// skset groups add <group> <skill>
groupsCmd
  .command('add <group> <skill>')
  .description('Add a skill to a group')
  .action(async (group: string, skill: string) => {
    await groups.add(group, skill);
  });

// skset groups remove <group> <skill>
groupsCmd
  .command('remove <group> <skill>')
  .description('Remove a skill from a group')
  .action(async (group: string, skill: string) => {
    await groups.remove(group, skill);
  });

// Parse CLI arguments
program.parse();
