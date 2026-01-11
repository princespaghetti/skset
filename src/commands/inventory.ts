/**
 * List skills across library and targets
 */

import { existsSync } from 'node:fs';
import pc from 'picocolors';
import { getLibraryPath, getSkillsInGroup, getSkillToGroupsMap, groupExists, loadConfig } from '../lib/config.ts';
import { listSkills, listSkillsFromGlob } from '../lib/skills.ts';
import { getGlobalPaths, getRepoPaths } from '../lib/targets.ts';
import type { InventoryOptions, Skill } from '../types/index.ts';
import { ConfigError, GroupNotFoundError } from '../utils/errors.ts';
import * as out from '../utils/output.ts';
import { expandHome, isInGitRepo, resolveRepoPath } from '../utils/paths.ts';

/**
 * Resolve a source path - handles both home-relative (~) and repo-relative (.) paths
 */
function resolveSourcePath(path: string): string {
  if (path.startsWith('~')) {
    return expandHome(path);
  }
  if (path.startsWith('.')) {
    return resolveRepoPath(path);
  }
  return path;
}

interface InventorySection {
  title: string;
  path: string;
  skills: Skill[];
}

/**
 * Show inventory of skills
 */
export async function inventory(options: InventoryOptions = {}): Promise<void> {
  // Validate group if specified
  if (options.group) {
    const config = await loadConfig();
    if (!groupExists(config, options.group)) {
      throw new GroupNotFoundError(options.group);
    }
  }

  if (options.json) {
    await inventoryJSON(options);
  } else {
    await inventoryText(options);
  }
}

/**
 * Filter skills by group if group option is specified
 */
function filterSkillsByGroup(skills: Skill[], groupName: string | undefined, groupSkills: string[]): Skill[] {
  if (!groupName) {
    return skills;
  }
  return skills.filter((skill) => groupSkills.includes(skill.name));
}

/**
 * Show inventory as formatted text
 */
async function inventoryText(options: InventoryOptions): Promise<void> {
  const sections: InventorySection[] = [];
  const config = await loadConfig();

  // Build skill-to-groups map for displaying group membership
  const skillToGroupsMap = getSkillToGroupsMap(config);

  // Get skills in group if filtering by group
  const groupSkills = options.group ? getSkillsInGroup(config, options.group) : [];

  // Library
  if (!options.target) {
    const libraryPath = await getLibraryPath();
    let librarySkills = existsSync(libraryPath) ? await listSkills(libraryPath, 'library') : [];

    // Filter by group if specified
    librarySkills = filterSkillsByGroup(librarySkills, options.group, groupSkills);

    const titleSuffix = options.group ? ` (group: ${options.group})` : '';
    sections.push({
      title: `Library (${librarySkills.length} skill${librarySkills.length !== 1 ? 's' : ''})${titleSuffix}`,
      path: libraryPath,
      skills: librarySkills,
    });

    if (options.library) {
      // Only show library
      printSections(sections, skillToGroupsMap);
      return;
    }
  }

  // Target global paths
  if (!options.library) {
    const globalPaths = await getGlobalPaths();

    if (options.target) {
      // Specific target only
      const targetPath = globalPaths.get(options.target);
      if (!targetPath) {
        throw new ConfigError(`Target "${options.target}" not found in config`);
      }

      let targetSkills = existsSync(targetPath) ? await listSkills(targetPath, 'target', options.target) : [];

      // Filter by group if specified
      targetSkills = filterSkillsByGroup(targetSkills, options.group, groupSkills);

      const titleSuffix = options.group ? ` (group: ${options.group})` : '';
      sections.push({
        title: `${options.target} (${targetSkills.length} skill${targetSkills.length !== 1 ? 's' : ''})${titleSuffix}`,
        path: targetPath,
        skills: targetSkills,
      });
    } else {
      // All targets
      for (const [targetName, targetPath] of globalPaths) {
        let targetSkills = existsSync(targetPath) ? await listSkills(targetPath, 'target', targetName) : [];

        // Filter by group if specified
        targetSkills = filterSkillsByGroup(targetSkills, options.group, groupSkills);

        sections.push({
          title: `${targetName} Global (${targetSkills.length} skill${targetSkills.length !== 1 ? 's' : ''})`,
          path: targetPath,
          skills: targetSkills,
        });
      }

      // Repo paths if in git repo
      if (isInGitRepo()) {
        const repoPaths = getRepoPaths(config);

        for (const [targetName, repoPath] of repoPaths) {
          let repoSkills = existsSync(repoPath) ? await listSkills(repoPath, 'target', `${targetName}-repo`) : [];

          // Filter by group if specified
          repoSkills = filterSkillsByGroup(repoSkills, options.group, groupSkills);

          sections.push({
            title: `${targetName} Repo (${repoSkills.length} skill${repoSkills.length !== 1 ? 's' : ''})`,
            path: repoPath,
            skills: repoSkills,
          });
        }
      }

      // Read-only sources (e.g., plugin directories)
      if (config.sources) {
        for (const [sourceName, sourceConfig] of Object.entries(config.sources)) {
          const sourcePath = resolveSourcePath(sourceConfig.path);
          let sourceSkills = await listSkillsFromGlob(sourcePath, sourceName, sourceConfig.readonly);

          // Filter by group if specified
          sourceSkills = filterSkillsByGroup(sourceSkills, options.group, groupSkills);

          const readonlyLabel = sourceConfig.readonly ? ' (read-only)' : '';
          const toolsLabel = sourceConfig.tools?.length ? ` [used by: ${sourceConfig.tools.join(', ')}]` : '';
          sections.push({
            title: `${sourceName}${readonlyLabel}${toolsLabel} (${sourceSkills.length} skill${sourceSkills.length !== 1 ? 's' : ''})`,
            path: sourcePath,
            skills: sourceSkills,
          });
        }
      }
    }
  }

  printSections(sections, skillToGroupsMap);
}

/**
 * Print inventory sections
 */
function printSections(sections: InventorySection[], skillToGroupsMap: Map<string, string[]>): void {
  console.log('');

  for (const section of sections) {
    console.log(out.bold(section.title));
    console.log(pc.dim(`  ${section.path}`));

    if (section.skills.length === 0) {
      console.log(pc.dim('  (empty)'));
    } else {
      for (const skill of section.skills) {
        const desc = skill.description.length > 60 ? `${skill.description.slice(0, 57)}...` : skill.description;

        // Show group membership for library skills
        const groups = skillToGroupsMap.get(skill.name);
        const groupsBadge = groups && groups.length > 0 ? ` ${pc.dim(`[${groups.join(', ')}]`)}` : '';

        console.log(`  ${pc.green('✓')} ${out.bold(skill.name)}${groupsBadge} ${pc.dim('-')} ${desc}`);
      }
    }

    console.log('');
  }
}

/**
 * Show inventory as JSON
 */
async function inventoryJSON(options: InventoryOptions): Promise<void> {
  const result: Record<string, Skill[]> = {};
  const config = await loadConfig();

  // Get skills in group if filtering by group
  const groupSkills = options.group ? getSkillsInGroup(config, options.group) : [];

  // Library
  if (!options.target) {
    const libraryPath = await getLibraryPath();
    let librarySkills = existsSync(libraryPath) ? await listSkills(libraryPath, 'library') : [];

    // Filter by group if specified
    librarySkills = filterSkillsByGroup(librarySkills, options.group, groupSkills);

    result.library = librarySkills;

    if (options.library) {
      console.log(JSON.stringify(result, null, 2));
      return;
    }
  }

  // Targets
  if (!options.library) {
    const globalPaths = await getGlobalPaths();

    if (options.target) {
      const targetPath = globalPaths.get(options.target);
      if (!targetPath) {
        throw new ConfigError(`Target "${options.target}" not found in config`);
      }

      let targetSkills = existsSync(targetPath) ? await listSkills(targetPath, 'target', options.target) : [];

      // Filter by group if specified
      targetSkills = filterSkillsByGroup(targetSkills, options.group, groupSkills);

      result[options.target] = targetSkills;
    } else {
      for (const [targetName, targetPath] of globalPaths) {
        let targetSkills = existsSync(targetPath) ? await listSkills(targetPath, 'target', targetName) : [];

        // Filter by group if specified
        targetSkills = filterSkillsByGroup(targetSkills, options.group, groupSkills);

        result[`${targetName}-global`] = targetSkills;
      }

      // Repo paths
      if (isInGitRepo()) {
        const repoPaths = getRepoPaths(config);

        for (const [targetName, repoPath] of repoPaths) {
          let repoSkills = existsSync(repoPath) ? await listSkills(repoPath, 'target', `${targetName}-repo`) : [];

          // Filter by group if specified
          repoSkills = filterSkillsByGroup(repoSkills, options.group, groupSkills);

          result[`${targetName}-repo`] = repoSkills;
        }
      }

      // Read-only sources (e.g., plugin directories)
      if (config.sources) {
        for (const [sourceName, sourceConfig] of Object.entries(config.sources)) {
          let sourceSkills = await listSkillsFromGlob(
            resolveSourcePath(sourceConfig.path),
            sourceName,
            sourceConfig.readonly
          );

          // Filter by group if specified
          sourceSkills = filterSkillsByGroup(sourceSkills, options.group, groupSkills);

          result[sourceName] = sourceSkills;
        }
      }
    }
  }

  console.log(JSON.stringify(result, null, 2));
}
