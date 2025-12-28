/**
 * Configuration management for skset
 */

import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import YAML from 'yaml';
import type { Config } from '../types/index.ts';
import { expandHome } from '../utils/paths.ts';

/**
 * Get the path to the skset config file
 */
export function getConfigPath(): string {
  return join(homedir(), '.skset', 'config.yaml');
}

/**
 * Get the path to the skset directory
 */
export function getSksetDir(): string {
  return join(homedir(), '.skset');
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): Config {
  return {
    library: '~/.skset/library',
    targets: {
      'claude-code': {
        global: '~/.claude/skills',
        repo: '.claude/skills',
      },
      opencode: {
        global: '~/.opencode/skill',
        repo: '.opencode/skill',
      },
      codex: {
        global: '~/.codex/skills',
        repo: '.codex/skills',
      },
      copilot: {
        repo: '.github/skills',
      },
      amp: {
        global: '~/.config/agents/skills',
        repo: '.agents/skills',
      },
    },
    groups: {
      core: [],
    },
    sources: {
      'claude-plugins': {
        path: '~/.claude/plugins/marketplaces/*/*/skills',
        readonly: true,
      },
    },
  };
}

/**
 * Load configuration from ~/.skset/config.yaml
 * Returns default config if file doesn't exist
 */
export async function loadConfig(): Promise<Config> {
  const configPath = getConfigPath();
  const configFile = Bun.file(configPath);

  if (!(await configFile.exists())) {
    return getDefaultConfig();
  }

  try {
    const content = await configFile.text();
    const config = YAML.parse(content) as Config;
    return config;
  } catch (err) {
    throw new Error(`Failed to parse config file: ${(err as Error).message}`);
  }
}

/**
 * Save configuration to ~/.skset/config.yaml
 */
export async function saveConfig(config: Config): Promise<void> {
  const configPath = getConfigPath();
  const configDir = getSksetDir();

  // Ensure directory exists
  if (!existsSync(configDir)) {
    await mkdir(configDir, { recursive: true });
  }

  try {
    const content = YAML.stringify(config);
    await Bun.write(configPath, content);
  } catch (err) {
    throw new Error(`Failed to write config file: ${(err as Error).message}`);
  }
}

/**
 * Get the library path with ~ expanded
 */
export async function getLibraryPath(): Promise<string> {
  const config = await loadConfig();
  return expandHome(config.library);
}

/**
 * Check if skset is initialized (config exists)
 */
export async function isInitialized(): Promise<boolean> {
  return await Bun.file(getConfigPath()).exists();
}

/**
 * Get all skills in a group
 */
export function getSkillsInGroup(config: Config, groupName: string): string[] {
  return config.groups[groupName] || [];
}

/**
 * Check if a group exists
 */
export function groupExists(config: Config, groupName: string): boolean {
  return groupName in config.groups;
}

/**
 * Check if a skill exists in a group
 */
export function skillExistsInGroup(config: Config, groupName: string, skillName: string): boolean {
  const skills = getSkillsInGroup(config, groupName);
  return skills.includes(skillName);
}

/**
 * Add a skill to a group (creates group if it doesn't exist)
 */
export function addSkillToGroup(config: Config, groupName: string, skillName: string): Config {
  const updatedConfig = { ...config };

  // Initialize group if it doesn't exist
  if (!updatedConfig.groups[groupName]) {
    updatedConfig.groups[groupName] = [];
  }

  // Add skill if not already in group
  if (!updatedConfig.groups[groupName].includes(skillName)) {
    updatedConfig.groups[groupName] = [...updatedConfig.groups[groupName], skillName];
  }

  return updatedConfig;
}

/**
 * Remove a skill from a group
 */
export function removeSkillFromGroup(config: Config, groupName: string, skillName: string): Config {
  const updatedConfig = { ...config };

  if (updatedConfig.groups[groupName]) {
    updatedConfig.groups[groupName] = updatedConfig.groups[groupName].filter((name) => name !== skillName);
  }

  return updatedConfig;
}

/**
 * Remove a skill from all groups
 */
export function removeSkillFromAllGroups(config: Config, skillName: string): Config {
  const updatedConfig = { ...config };

  for (const groupName of Object.keys(updatedConfig.groups)) {
    updatedConfig.groups[groupName] = updatedConfig.groups[groupName].filter((name) => name !== skillName);
  }

  return updatedConfig;
}

/**
 * Create a new empty group
 */
export function createGroup(config: Config, groupName: string): Config {
  const updatedConfig = { ...config };

  if (!updatedConfig.groups[groupName]) {
    updatedConfig.groups[groupName] = [];
  }

  return updatedConfig;
}

/**
 * Delete a group (skills remain in library)
 */
export function deleteGroup(config: Config, groupName: string): Config {
  const updatedConfig = { ...config };

  if (updatedConfig.groups[groupName]) {
    delete updatedConfig.groups[groupName];
  }

  return updatedConfig;
}

/**
 * Get all group names
 */
export function getGroupNames(config: Config): string[] {
  return Object.keys(config.groups);
}

/**
 * Build a reverse map of skill names to group names
 */
export function getSkillToGroupsMap(config: Config): Map<string, string[]> {
  const map = new Map<string, string[]>();

  for (const [groupName, skills] of Object.entries(config.groups)) {
    for (const skillName of skills) {
      if (!map.has(skillName)) {
        map.set(skillName, []);
      }
      map.get(skillName)?.push(groupName);
    }
  }

  return map;
}
