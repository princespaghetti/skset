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
  validateConfig,
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
    expect(config.targets['opencode'].global).toBe('~/.config/opencode/skill');
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

describe('validateConfig', () => {
  describe('Valid configurations', () => {
    it('should pass validation for valid config', () => {
      const config: Config = {
        library: '~/.skset/library',
        targets: {
          'claude-code': { global: '~/.claude/skills', repo: '.claude/skills' },
        },
        groups: {
          core: ['pdf', 'docx'],
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should pass validation for default config', () => {
      const config = getDefaultConfig();
      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should allow config with no groups', () => {
      const config: Config = {
        library: '~/.skset/library',
        targets: {
          'claude-code': { global: '~/.claude/skills', repo: '.claude/skills' },
        },
        groups: {},
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should allow targets with only global path', () => {
      const config: Config = {
        library: '~/.skset/library',
        targets: {
          'claude-code': { global: '~/.claude/skills' },
        },
        groups: {},
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should allow targets with only repo path', () => {
      const config: Config = {
        library: '~/.skset/library',
        targets: {
          copilot: { repo: '.github/skills' },
        },
        groups: {},
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('Library validation', () => {
    it('should error when library is missing', () => {
      const config = {
        targets: {},
        groups: {},
      } as unknown as Config;

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].field).toBe('library');
      expect(result.errors[0].message).toContain('required');
    });

    it('should error when library is empty string', () => {
      const config: Config = {
        library: '',
        targets: {},
        groups: {},
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'library')).toBe(true);
    });

    it('should error when library is not a string', () => {
      const config = {
        library: 123,
        targets: {},
        groups: {},
      } as unknown as Config;

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'library')).toBe(true);
    });

    it('should error when library path contains null bytes', () => {
      const config: Config = {
        library: '~/.skset/lib\x00rary',
        targets: {},
        groups: {},
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'library' && e.message.includes('null'))).toBe(true);
    });
  });

  describe('Targets validation', () => {
    it('should error when targets is not an object', () => {
      const config = {
        library: '~/.skset/library',
        targets: 'invalid',
        groups: {},
      } as unknown as Config;

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'targets')).toBe(true);
    });

    it('should error when targets is an array', () => {
      const config = {
        library: '~/.skset/library',
        targets: [],
        groups: {},
      } as unknown as Config;

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'targets')).toBe(true);
    });

    it('should error for invalid target names', () => {
      const config: Config = {
        library: '~/.skset/library',
        targets: {
          UPPERCASE: { global: '~/.invalid' },
          'has spaces': { global: '~/.invalid' },
          has_underscores: { global: '~/.invalid' },
          '123starts-with-number': { global: '~/.invalid' },
        },
        groups: {},
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.filter((e) => e.field?.startsWith('targets.')).length).toBeGreaterThan(0);
    });

    it('should warn when target has neither global nor repo path', () => {
      const config: Config = {
        library: '~/.skset/library',
        targets: {
          'claude-code': {} as any,
        },
        groups: {},
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true); // It's a warning, not an error
      expect(
        result.warnings.some((w) => w.field === 'targets.claude-code' && w.message.includes('no global or repo'))
      ).toBe(true);
    });

    it('should error when target path is empty string', () => {
      const config: Config = {
        library: '~/.skset/library',
        targets: {
          'claude-code': { global: '' },
        },
        groups: {},
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      // validatePath checks for empty/whitespace, should error
      expect(result.errors.some((e) => e.field === 'targets.claude-code.global' && e.message.includes('empty'))).toBe(
        true
      );
    });

    it('should error when target path is not a string', () => {
      const config: Config = {
        library: '~/.skset/library',
        targets: {
          'claude-code': { global: 123 as any },
        },
        groups: {},
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'targets.claude-code.global')).toBe(true);
    });

    it('should error when target path contains null bytes', () => {
      const config: Config = {
        library: '~/.skset/library',
        targets: {
          'claude-code': { global: '~/.claude/ski\x00lls' },
        },
        groups: {},
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'targets.claude-code.global' && e.message.includes('null'))).toBe(
        true
      );
    });
  });

  describe('Groups validation', () => {
    it('should error when groups is not an object', () => {
      const config = {
        library: '~/.skset/library',
        targets: {},
        groups: 'invalid',
      } as unknown as Config;

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'groups')).toBe(true);
    });

    it('should error when groups is an array', () => {
      const config = {
        library: '~/.skset/library',
        targets: {},
        groups: [],
      } as unknown as Config;

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'groups')).toBe(true);
    });

    it('should error for invalid group names', () => {
      const config: Config = {
        library: '~/.skset/library',
        targets: {},
        groups: {
          UPPERCASE: [],
          'has spaces': [],
          has_underscores: [],
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.filter((e) => e.field?.startsWith('groups.')).length).toBeGreaterThan(0);
    });

    it('should error when group value is not an array', () => {
      const config: Config = {
        library: '~/.skset/library',
        targets: {},
        groups: {
          core: 'not-an-array' as any,
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'groups.core')).toBe(true);
    });

    it('should error when group contains non-string skill names', () => {
      const config: Config = {
        library: '~/.skset/library',
        targets: {},
        groups: {
          core: [123, 'pdf'] as any,
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'groups.core' && e.message.includes('non-string'))).toBe(true);
    });

    it('should allow empty skill names (validation happens at skill level)', () => {
      const config: Config = {
        library: '~/.skset/library',
        targets: {},
        groups: {
          core: ['', 'pdf'],
        },
      };

      const result = validateConfig(config);
      // Config validation doesn't check skill name validity, only that they're strings
      expect(result.valid).toBe(true);
    });
  });

  describe('Warnings', () => {
    it('should warn about duplicate skills in same group', () => {
      const config: Config = {
        library: '~/.skset/library',
        targets: {},
        groups: {
          core: ['pdf', 'docx', 'pdf'],
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.field === 'groups.core' && w.message.includes('duplicate'))).toBe(true);
    });

    it('should not warn when skill appears in different groups', () => {
      const config: Config = {
        library: '~/.skset/library',
        targets: {},
        groups: {
          core: ['pdf'],
          work: ['pdf'],
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(true);
      expect(result.warnings.filter((w) => w.message.includes('duplicate')).length).toBe(0);
    });
  });

  describe('Multiple errors', () => {
    it('should collect multiple errors across different sections', () => {
      const config: Config = {
        library: '',
        targets: {
          'INVALID-NAME': { global: '' },
        },
        groups: {
          'INVALID-GROUP': 'not-array' as any,
        },
      };

      const result = validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(2);
      expect(result.errors.some((e) => e.field === 'library')).toBe(true);
      expect(result.errors.some((e) => e.field?.startsWith('targets.'))).toBe(true);
      expect(result.errors.some((e) => e.field?.startsWith('groups.'))).toBe(true);
    });
  });
});
