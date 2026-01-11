/**
 * Configuration management for skset
 */

import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import YAML from 'yaml';
import type { Config } from '../types/index.ts';
import { getErrorMessage } from '../utils/errors.ts';
import { expandHome } from '../utils/paths.ts';

/**
 * Configuration validation error details
 */
export interface ConfigValidationError {
  /** Field path in config (e.g., 'targets.claude-code.global') */
  field: string;
  /** Error or warning message */
  message: string;
  /** Optional hint for resolving the issue */
  hint?: string;
}

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  /** Whether the configuration is valid */
  valid: boolean;
  /** List of validation errors (prevent config from loading) */
  errors: ConfigValidationError[];
  /** List of validation warnings (config loads but may have issues) */
  warnings: ConfigValidationError[];
}

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
        global: '~/.github/skills',
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
      'claude-legacy-repo': {
        path: '.claude/skills',
        readonly: true,
        tools: ['claude-code', 'copilot', 'amp'],
      },
      'claude-legacy-global': {
        path: '~/.claude/skills',
        readonly: true,
        tools: ['claude-code', 'copilot', 'amp'],
      },
    },
  };
}

/**
 * Validate a path string for invalid characters or patterns
 * @param path - Path to validate
 * @param fieldName - Config field name for error reporting
 * @param errors - Array to append errors to
 * @internal
 */
function validatePath(path: string, fieldName: string, errors: ConfigValidationError[]): void {
  if (path.trim() === '') {
    errors.push({
      field: fieldName,
      message: 'Path cannot be empty',
    });
    return;
  }

  // Check for null bytes or other dangerous characters
  // biome-ignore lint/suspicious/noControlCharactersInRegex: Need to check for null bytes in paths
  if (/[\x00]/.test(path)) {
    errors.push({
      field: fieldName,
      message: 'Path contains invalid null byte characters',
    });
  }

  // Warn about paths that don't start with expected prefixes
  if (!path.startsWith('~') && !path.startsWith('/') && !path.startsWith('.')) {
    errors.push({
      field: fieldName,
      message: `Path "${path}" should start with ~, /, or .`,
      hint: 'Use ~ for home directory, / for absolute paths, or . for relative paths',
    });
  }
}

/**
 * Validate configuration structure and values
 * @param config - Configuration object to validate
 * @returns Validation result with errors and warnings
 */
export function validateConfig(config: Config): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];
  const warnings: ConfigValidationError[] = [];

  // Validate library path
  if (!config.library || typeof config.library !== 'string' || config.library.trim() === '') {
    errors.push({
      field: 'library',
      message: 'Library path is required',
      hint: 'Set to a path like ~/.skset/library',
    });
  } else {
    validatePath(config.library, 'library', errors);
  }

  // Validate targets
  if (!config.targets || typeof config.targets !== 'object' || Array.isArray(config.targets)) {
    errors.push({
      field: 'targets',
      message: 'Targets configuration must be an object',
    });
  } else {
    for (const [targetName, targetConfig] of Object.entries(config.targets)) {
      // Validate target name (alphanumeric + hyphens)
      if (!/^[a-z0-9-]+$/.test(targetName)) {
        errors.push({
          field: `targets.${targetName}`,
          message: `Invalid target name "${targetName}"`,
          hint: 'Target names must contain only lowercase letters, numbers, and hyphens',
        });
      }

      // Validate target has at least one path
      if (!targetConfig.global && !targetConfig.repo) {
        warnings.push({
          field: `targets.${targetName}`,
          message: `Target "${targetName}" has no global or repo path configured`,
          hint: 'At least one of "global" or "repo" should be specified',
        });
      }

      // Validate paths
      if (targetConfig.global !== undefined) {
        if (typeof targetConfig.global !== 'string') {
          errors.push({
            field: `targets.${targetName}.global`,
            message: 'Global path must be a string',
          });
        } else {
          validatePath(targetConfig.global, `targets.${targetName}.global`, errors);
        }
      }
      if (targetConfig.repo !== undefined) {
        if (typeof targetConfig.repo !== 'string') {
          errors.push({
            field: `targets.${targetName}.repo`,
            message: 'Repo path must be a string',
          });
        } else {
          validatePath(targetConfig.repo, `targets.${targetName}.repo`, errors);
        }
      }
    }
  }

  // Validate groups
  if (!config.groups) {
    // Groups are optional, initialize empty
    config.groups = {};
  } else if (typeof config.groups !== 'object' || Array.isArray(config.groups)) {
    errors.push({
      field: 'groups',
      message: 'Groups configuration must be an object',
    });
  } else {
    for (const [groupName, skills] of Object.entries(config.groups)) {
      // Validate group name
      if (!/^[a-z0-9-]+$/.test(groupName)) {
        errors.push({
          field: `groups.${groupName}`,
          message: `Invalid group name "${groupName}"`,
          hint: 'Group names must contain only lowercase letters, numbers, and hyphens',
        });
      }

      // Validate skills array
      if (!Array.isArray(skills)) {
        errors.push({
          field: `groups.${groupName}`,
          message: `Group "${groupName}" skills must be an array`,
        });
      } else {
        // Check for duplicate skills in group
        const uniqueSkills = new Set(skills);
        if (uniqueSkills.size !== skills.length) {
          warnings.push({
            field: `groups.${groupName}`,
            message: `Group "${groupName}" contains duplicate skill entries`,
          });
        }

        // Check for non-string entries
        for (const skill of skills) {
          if (typeof skill !== 'string') {
            errors.push({
              field: `groups.${groupName}`,
              message: `Group "${groupName}" contains non-string skill entry`,
            });
          }
        }
      }
    }
  }

  // Validate sources (optional)
  if (config.sources) {
    if (typeof config.sources !== 'object' || Array.isArray(config.sources)) {
      errors.push({
        field: 'sources',
        message: 'Sources configuration must be an object',
      });
    } else {
      for (const [sourceName, sourceConfig] of Object.entries(config.sources)) {
        if (!sourceConfig.path || typeof sourceConfig.path !== 'string') {
          errors.push({
            field: `sources.${sourceName}`,
            message: `Source "${sourceName}" missing or invalid path`,
          });
        }
        if (sourceConfig.readonly === undefined) {
          // Default to readonly for safety
          sourceConfig.readonly = true;
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Load configuration from ~/.skset/config.yaml
 * Returns default config if file doesn't exist
 * Validates config structure and shows warnings
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

    // Validate config structure
    const validation = validateConfig(config);

    if (!validation.valid) {
      // Format errors for display
      const errorMsg = validation.errors
        .map((e) => `  ${e.field}: ${e.message}${e.hint ? `\n    hint: ${e.hint}` : ''}`)
        .join('\n');
      throw new Error(`Invalid configuration in ${configPath}:\n${errorMsg}`);
    }

    // Show warnings to stderr (always display - they indicate potential issues)
    if (validation.warnings.length > 0) {
      console.warn(`\nConfiguration warnings in ${configPath}:`);
      for (const warning of validation.warnings) {
        console.warn(`  ${warning.field}: ${warning.message}`);
        if (warning.hint) {
          console.warn(`    hint: ${warning.hint}`);
        }
      }
      console.warn(''); // Blank line after warnings
    }

    return config;
  } catch (err) {
    throw new Error(`Failed to load config file: ${getErrorMessage(err)}`);
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
    throw new Error(`Failed to write config file: ${getErrorMessage(err)}`);
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
