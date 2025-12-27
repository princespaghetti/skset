/**
 * Skill parsing and validation logic
 */

import { basename, join } from 'node:path';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import matter from 'gray-matter';
import type { Skill, ValidationResult } from '../types/index.ts';

/**
 * Parse a SKILL.md file and extract frontmatter
 * @param dirPath - Absolute path to skill directory
 * @param source - Where this skill is from ('library', 'target', or 'plugin')
 * @param target - Target name if source is 'target'
 * @param readonly - Whether this skill source is read-only
 * @returns Parsed skill object or null if SKILL.md doesn't exist
 */
export async function parseSkill(
  dirPath: string,
  source: 'library' | 'target' | 'plugin' = 'library',
  target?: string,
  readonly?: boolean
): Promise<Skill | null> {
  // Try case-insensitive SKILL.md search
  const skillFile = await findSkillFile(dirPath);

  if (!skillFile) {
    return null;
  }

  const skillPath = join(dirPath, skillFile);

  try {
    const content = await readFile(skillPath, 'utf-8');
    const { data } = matter(content);

    const skill: Skill = {
      name: data.name as string,
      description: data.description as string,
      license: data.license as string | undefined,
      compatibility: data.compatibility as string | undefined,
      metadata: data.metadata as Record<string, string> | undefined,
      allowedTools: data['allowed-tools']
        ? (data['allowed-tools'] as string).split(/\s+/)
        : undefined,
      path: dirPath,
      source,
      target,
      readonly,
    };

    return skill;
  } catch (err) {
    throw new Error(`Failed to parse ${skillFile}: ${(err as Error).message}`);
  }
}

/**
 * Find SKILL.md file (case-insensitive)
 */
async function findSkillFile(dirPath: string): Promise<string | null> {
  if (!existsSync(dirPath)) {
    return null;
  }

  try {
    const files = await readdir(dirPath);
    const skillFile = files.find(f => f.toLowerCase() === 'skill.md');
    return skillFile || null;
  } catch {
    return null;
  }
}

/**
 * Validate a skill against the Agent Skills specification
 */
export async function validateSkill(skill: Skill): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate name
  if (!skill.name) {
    errors.push('name is required');
  } else {
    // Name: 1-64 chars, lowercase alphanumeric + hyphens
    if (skill.name.length < 1 || skill.name.length > 64) {
      errors.push('name must be 1-64 characters');
    }

    if (!/^[a-z0-9-]+$/.test(skill.name)) {
      errors.push('name must contain only lowercase letters, numbers, and hyphens');
    }

    if (skill.name.startsWith('-') || skill.name.endsWith('-')) {
      errors.push('name cannot start or end with a hyphen');
    }

    if (skill.name.includes('--')) {
      errors.push('name cannot contain consecutive hyphens');
    }

    // Name should match directory name
    const dirName = basename(skill.path);
    if (skill.name !== dirName) {
      errors.push(
        `name "${skill.name}" does not match directory name "${dirName}"`
      );
    }
  }

  // Validate description
  if (!skill.description) {
    errors.push('description is required');
  } else {
    if (skill.description.length < 1 || skill.description.length > 1024) {
      errors.push('description must be 1-1024 characters');
    }

    if (skill.description.trim().length === 0) {
      errors.push('description cannot be empty or only whitespace');
    }
  }

  // Validate optional fields
  if (skill.compatibility && skill.compatibility.length > 500) {
    errors.push('compatibility field must be 500 characters or less');
  }

  if (skill.license && skill.license.length > 500) {
    errors.push('license field must be 500 characters or less');
  }

  // Check SKILL.md file size
  const skillFile = await findSkillFile(skill.path);
  if (skillFile) {
    const skillPath = join(skill.path, skillFile);
    const content = await readFile(skillPath, 'utf-8');
    const lines = content.split('\n');
    const lineCount = lines.length;

    // Token estimation (rough): ~4 chars per token
    const estimatedTokens = Math.ceil(content.length / 4);

    if (lineCount > 500) {
      warnings.push(`SKILL.md has ${lineCount} lines (recommended: ≤500)`);
    }

    if (estimatedTokens > 5000) {
      warnings.push(
        `SKILL.md has ~${estimatedTokens} tokens (recommended: ≤5000)`
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      lineCount,
      estimatedTokens,
    };
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * List all skills in a directory
 * @param dirPath - Directory to scan for skills
 * @param source - Where these skills are from
 * @param target - Target name if source is 'target'
 * @param readonly - Whether this skill source is read-only
 * @returns Array of parsed skills
 */
export async function listSkills(
  dirPath: string,
  source: 'library' | 'target' | 'plugin' = 'library',
  target?: string,
  readonly?: boolean
): Promise<Skill[]> {
  if (!existsSync(dirPath)) {
    return [];
  }

  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const skills: Skill[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillPath = join(dirPath, entry.name);
        const skill = await parseSkill(skillPath, source, target, readonly);

        if (skill) {
          skills.push(skill);
        }
      }
    }

    return skills;
  } catch {
    return [];
  }
}

/**
 * List all skills from a glob pattern (for read-only sources like plugins)
 * @param globPattern - Glob pattern to match directories (e.g., ~/.claude/plugins/*\/*\/skills)
 * @param sourceName - Name of the source (e.g., 'claude-plugins')
 * @param readonly - Whether this source is read-only
 * @returns Array of parsed skills from all matching directories
 */
export async function listSkillsFromGlob(
  globPattern: string,
  sourceName: string,
  readonly: boolean
): Promise<Skill[]> {
  try {
    const { Glob } = await import('bun');
    const glob = new Glob(globPattern);
    const allSkills: Skill[] = [];

    // Scan for matching directories
    for await (const path of glob.scan({ onlyFiles: false })) {
      if (existsSync(path)) {
        const skills = await listSkills(path, 'plugin', sourceName, readonly);
        allSkills.push(...skills);
      }
    }

    return allSkills;
  } catch (err) {
    // If glob fails, return empty array
    return [];
  }
}
