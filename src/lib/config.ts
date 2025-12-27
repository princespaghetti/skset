/**
 * Configuration management for skset
 */

import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
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
      'opencode': {
        global: '~/.opencode/skill',
        repo: '.opencode/skill',
      },
      'codex': {
        global: '~/.codex/skills',
        repo: '.codex/skills',
      },
      'copilot': {
        repo: '.github/skills',
      },
      'amp': {
        global: '~/.config/agents/skills',
        repo: '.agents/skills',
      },
    },
    groups: {
      core: [],
    },
  };
}

/**
 * Load configuration from ~/.skset/config.yaml
 * Returns default config if file doesn't exist
 */
export async function loadConfig(): Promise<Config> {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    return getDefaultConfig();
  }

  try {
    const content = await readFile(configPath, 'utf-8');
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
    await writeFile(configPath, content, 'utf-8');
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
export function isInitialized(): boolean {
  return existsSync(getConfigPath());
}
