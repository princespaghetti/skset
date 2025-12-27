import { describe, it, expect, beforeAll } from 'bun:test';
import { join } from 'node:path';
import { parseSkill, validateSkill, listSkills } from '../../src/lib/skills.ts';

const fixturesDir = join(import.meta.dir, '..', 'fixtures');

describe('parseSkill', () => {
  it('should parse a valid skill', async () => {
    const skillPath = join(fixturesDir, 'valid-skill');
    const skill = await parseSkill(skillPath);

    expect(skill).toBeTruthy();
    expect(skill?.name).toBe('valid-skill');
    expect(skill?.description).toBe('A valid test skill for testing purposes');
    expect(skill?.license).toBe('MIT');
    expect(skill?.path).toBe(skillPath);
    expect(skill?.source).toBe('library');
  });

  it('should return null for directory without SKILL.md', async () => {
    const skillPath = join(fixturesDir, 'invalid-no-skillmd');
    const skill = await parseSkill(skillPath);

    expect(skill).toBeNull();
  });

  it('should parse skill with target info', async () => {
    const skillPath = join(fixturesDir, 'valid-skill');
    const skill = await parseSkill(skillPath, 'target', 'claude-code');

    expect(skill).toBeTruthy();
    expect(skill?.source).toBe('target');
    expect(skill?.target).toBe('claude-code');
  });
});

describe('validateSkill', () => {
  it('should validate a valid skill', async () => {
    const skillPath = join(fixturesDir, 'valid-skill');
    const skill = await parseSkill(skillPath);
    expect(skill).toBeTruthy();

    const result = await validateSkill(skill!);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject uppercase in name', async () => {
    const skillPath = join(fixturesDir, 'invalid-name-uppercase');
    const skill = await parseSkill(skillPath);
    expect(skill).toBeTruthy();

    const result = await validateSkill(skill!);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.includes('lowercase'))).toBe(true);
  });

  it('should reject missing description', async () => {
    const skillPath = join(fixturesDir, 'invalid-no-description');
    const skill = await parseSkill(skillPath);
    expect(skill).toBeTruthy();

    const result = await validateSkill(skill!);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('description'))).toBe(true);
  });

  it('should warn about oversized skills', async () => {
    const skillPath = join(fixturesDir, 'oversized-skill');
    const skill = await parseSkill(skillPath);
    expect(skill).toBeTruthy();

    const result = await validateSkill(skill!);

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('lines'))).toBe(true);
    expect(result.lineCount).toBeGreaterThan(500);
  });

  it('should reject name that does not match directory', async () => {
    const skillPath = join(fixturesDir, 'invalid-name-uppercase');
    const skill = await parseSkill(skillPath);
    expect(skill).toBeTruthy();

    const result = await validateSkill(skill!);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('does not match directory'))).toBe(true);
  });

  it('should reject names with leading hyphen', async () => {
    const skill = {
      name: '-invalid',
      description: 'Test',
      path: '/test/-invalid',
      source: 'library' as const,
    };

    const result = await validateSkill(skill);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('start or end with a hyphen'))).toBe(true);
  });

  it('should reject names with trailing hyphen', async () => {
    const skill = {
      name: 'invalid-',
      description: 'Test',
      path: '/test/invalid-',
      source: 'library' as const,
    };

    const result = await validateSkill(skill);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('start or end with a hyphen'))).toBe(true);
  });

  it('should reject names with consecutive hyphens', async () => {
    const skill = {
      name: 'invalid--name',
      description: 'Test',
      path: '/test/invalid--name',
      source: 'library' as const,
    };

    const result = await validateSkill(skill);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('consecutive hyphens'))).toBe(true);
  });

  it('should reject names longer than 64 characters', async () => {
    const longName = 'a'.repeat(65);
    const skill = {
      name: longName,
      description: 'Test',
      path: `/test/${longName}`,
      source: 'library' as const,
    };

    const result = await validateSkill(skill);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('1-64 characters'))).toBe(true);
  });

  it('should reject empty description', async () => {
    const skill = {
      name: 'test-skill',
      description: '',
      path: '/test/test-skill',
      source: 'library' as const,
    };

    const result = await validateSkill(skill);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('description'))).toBe(true);
  });
});

describe('listSkills', () => {
  it('should list all skills in fixtures directory', async () => {
    const skills = await listSkills(fixturesDir);

    expect(skills.length).toBeGreaterThan(0);
    expect(skills.some(s => s.name === 'valid-skill')).toBe(true);
  });

  it('should return empty array for non-existent directory', async () => {
    const skills = await listSkills('/non/existent/path');

    expect(skills).toHaveLength(0);
  });

  it('should skip directories without SKILL.md', async () => {
    const skills = await listSkills(fixturesDir);

    expect(skills.every(s => s.name !== 'invalid-no-skillmd')).toBe(true);
  });
});
