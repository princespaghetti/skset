import { describe, it, expect } from 'bun:test';
import { getDefaultConfig, getConfigPath, getSksetDir } from '../../src/lib/config.ts';
import { homedir } from 'node:os';
import { join } from 'node:path';

describe('getConfigPath', () => {
  it('should return config path in home directory', () => {
    const configPath = getConfigPath();

    expect(configPath).toBe(join(homedir(), '.skset', 'config.yaml'));
  });
});

describe('getSksetDir', () => {
  it('should return skset directory path', () => {
    const sksetDir = getSksetDir();

    expect(sksetDir).toBe(join(homedir(), '.skset'));
  });
});

describe('getDefaultConfig', () => {
  it('should return valid default configuration', () => {
    const config = getDefaultConfig();

    expect(config).toBeTruthy();
    expect(config.library).toBe('~/.skset/library');
    expect(config.targets).toBeTruthy();
    expect(config.groups).toBeTruthy();
  });

  it('should include all expected targets', () => {
    const config = getDefaultConfig();

    expect(config.targets['claude-code']).toBeTruthy();
    expect(config.targets['opencode']).toBeTruthy();
    expect(config.targets['codex']).toBeTruthy();
    expect(config.targets['copilot']).toBeTruthy();
    expect(config.targets['amp']).toBeTruthy();
  });

  it('should have global paths for most targets', () => {
    const config = getDefaultConfig();

    expect(config.targets['claude-code'].global).toBe('~/.claude/skills');
    expect(config.targets['opencode'].global).toBe('~/.opencode/skill');
    expect(config.targets['codex'].global).toBe('~/.codex/skills');
    expect(config.targets['amp'].global).toBe('~/.config/agents/skills');
  });

  it('should have repo paths for all targets except copilot without global', () => {
    const config = getDefaultConfig();

    expect(config.targets['claude-code'].repo).toBe('.claude/skills');
    expect(config.targets['opencode'].repo).toBe('.opencode/skill');
    expect(config.targets['codex'].repo).toBe('.codex/skills');
    expect(config.targets['copilot'].repo).toBe('.github/skills');
    expect(config.targets['amp'].repo).toBe('.agents/skills');
  });

  it('should have a default core group', () => {
    const config = getDefaultConfig();

    expect(config.groups.core).toBeDefined();
    expect(Array.isArray(config.groups.core)).toBe(true);
  });
});
