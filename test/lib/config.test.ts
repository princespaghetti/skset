import { describe, it, expect } from 'bun:test';
import {
  getDefaultConfig,
  getConfigPath,
  getSksetDir,
  getSkillsInGroup,
  groupExists,
  skillExistsInGroup,
  addSkillToGroup,
  removeSkillFromGroup,
  removeSkillFromAllGroups,
  createGroup,
  deleteGroup,
  getGroupNames,
  getSkillToGroupsMap,
} from '../../src/lib/config.ts';
import type { Config } from '../../src/types/index.ts';
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

describe('Group Helper Functions', () => {
  // Helper to create fresh config for each test
  const createMockConfig = (): Config => ({
    library: '~/.skset/library',
    targets: {
      'claude-code': { global: '~/.claude/skills', repo: '.claude/skills' },
    },
    groups: {
      core: ['pdf', 'docx'],
      work: ['api-client', 'security-scanner'],
      empty: [],
    },
  });

  describe('getGroupNames', () => {
    it('should return all group names', () => {
      const config = createMockConfig();
      const names = getGroupNames(config);
      expect(names).toEqual(['core', 'work', 'empty']);
    });

    it('should return empty array for config with no groups', () => {
      const config = createMockConfig();
      config.groups = {};
      const names = getGroupNames(config);
      expect(names).toEqual([]);
    });
  });

  describe('groupExists', () => {
    it('should return true for existing group', () => {
      const config = createMockConfig();
      expect(groupExists(config, 'core')).toBe(true);
      expect(groupExists(config, 'work')).toBe(true);
    });

    it('should return false for non-existent group', () => {
      const config = createMockConfig();
      expect(groupExists(config, 'nonexistent')).toBe(false);
    });

    it('should return true for empty group', () => {
      const config = createMockConfig();
      expect(groupExists(config, 'empty')).toBe(true);
    });
  });

  describe('getSkillsInGroup', () => {
    it('should return skills for existing group', () => {
      const config = createMockConfig();
      expect(getSkillsInGroup(config, 'core')).toEqual(['pdf', 'docx']);
      expect(getSkillsInGroup(config, 'work')).toEqual(['api-client', 'security-scanner']);
    });

    it('should return empty array for empty group', () => {
      const config = createMockConfig();
      expect(getSkillsInGroup(config, 'empty')).toEqual([]);
    });

    it('should return empty array for non-existent group', () => {
      const config = createMockConfig();
      expect(getSkillsInGroup(config, 'nonexistent')).toEqual([]);
    });
  });

  describe('skillExistsInGroup', () => {
    it('should return true when skill exists in group', () => {
      const config = createMockConfig();
      expect(skillExistsInGroup(config, 'core', 'pdf')).toBe(true);
      expect(skillExistsInGroup(config, 'work', 'api-client')).toBe(true);
    });

    it('should return false when skill does not exist in group', () => {
      const config = createMockConfig();
      expect(skillExistsInGroup(config, 'core', 'api-client')).toBe(false);
    });

    it('should return false for non-existent group', () => {
      const config = createMockConfig();
      expect(skillExistsInGroup(config, 'nonexistent', 'pdf')).toBe(false);
    });
  });

  describe('createGroup', () => {
    it('should create new empty group', () => {
      const config = createMockConfig();
      const updated = createGroup(config, 'personal');
      expect(updated.groups.personal).toEqual([]);
      expect(updated.groups.core).toEqual(['pdf', 'docx']); // Existing groups unchanged
    });

    it('should not overwrite existing group', () => {
      const config = createMockConfig();
      const updated = createGroup(config, 'core');
      expect(updated.groups.core).toEqual(['pdf', 'docx']); // Unchanged
    });
  });

  describe('deleteGroup', () => {
    it('should remove existing group', () => {
      const config = createMockConfig();
      const updated = deleteGroup(config, 'work');
      expect(updated.groups.work).toBeUndefined();
      expect(updated.groups.core).toEqual(['pdf', 'docx']); // Other groups unchanged
    });

    it('should handle deleting non-existent group', () => {
      const config = createMockConfig();
      const updated = deleteGroup(config, 'nonexistent');
      expect(updated.groups).toEqual(config.groups); // No change
    });
  });

  describe('addSkillToGroup', () => {
    it('should add skill to existing group', () => {
      const config = createMockConfig();
      const updated = addSkillToGroup(config, 'core', 'xlsx');
      expect(updated.groups.core).toEqual(['pdf', 'docx', 'xlsx']);
    });

    it('should create group if it does not exist', () => {
      const config = createMockConfig();
      const updated = addSkillToGroup(config, 'new-group', 'test-skill');
      expect(updated.groups['new-group']).toEqual(['test-skill']);
    });

    it('should not duplicate skill if already in group', () => {
      const config = createMockConfig();
      const updated = addSkillToGroup(config, 'core', 'pdf');
      expect(updated.groups.core).toEqual(['pdf', 'docx']);
    });
  });

  describe('removeSkillFromGroup', () => {
    it('should remove skill from group', () => {
      const config = createMockConfig();
      const updated = removeSkillFromGroup(config, 'core', 'pdf');
      expect(updated.groups.core).toEqual(['docx']);
    });

    it('should handle removing non-existent skill', () => {
      const config = createMockConfig();
      const updated = removeSkillFromGroup(config, 'core', 'nonexistent');
      expect(updated.groups.core).toEqual(['pdf', 'docx']); // Unchanged
    });

    it('should handle non-existent group', () => {
      const config = createMockConfig();
      const updated = removeSkillFromGroup(config, 'nonexistent', 'pdf');
      expect(updated.groups).toEqual(config.groups); // No change
    });
  });

  describe('removeSkillFromAllGroups', () => {
    it('should remove skill from all groups it appears in', () => {
      const config = createMockConfig();
      config.groups = {
        core: ['pdf', 'docx'],
        work: ['pdf', 'api-client'],
        personal: ['pdf', 'notes'],
      };

      const updated = removeSkillFromAllGroups(config, 'pdf');
      expect(updated.groups.core).toEqual(['docx']);
      expect(updated.groups.work).toEqual(['api-client']);
      expect(updated.groups.personal).toEqual(['notes']);
    });

    it('should handle skill not in any group', () => {
      const config = createMockConfig();
      const updated = removeSkillFromAllGroups(config, 'nonexistent');
      expect(updated.groups).toEqual(config.groups); // No change
    });
  });

  describe('getSkillToGroupsMap', () => {
    it('should create map of skills to their groups', () => {
      const config = createMockConfig();
      config.groups = {
        core: ['pdf', 'docx'],
        work: ['pdf', 'api-client'],
        personal: ['notes'],
      };

      const map = getSkillToGroupsMap(config);
      expect(map.get('pdf')).toEqual(['core', 'work']);
      expect(map.get('docx')).toEqual(['core']);
      expect(map.get('api-client')).toEqual(['work']);
      expect(map.get('notes')).toEqual(['personal']);
    });

    it('should return empty map for config with no groups', () => {
      const config = createMockConfig();
      config.groups = {};
      const map = getSkillToGroupsMap(config);
      expect(map.size).toBe(0);
    });

    it('should handle empty groups', () => {
      const config = createMockConfig();
      const map = getSkillToGroupsMap(config);
      expect(map.get('pdf')).toEqual(['core']);
      expect(map.get('docx')).toEqual(['core']);
    });
  });
});
