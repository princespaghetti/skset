/**
 * List skills across library and targets
 */

import { existsSync } from 'node:fs';
import type { InventoryOptions, Skill } from '../types/index.ts';
import { getLibraryPath, loadConfig } from '../lib/config.ts';
import { listSkills } from '../lib/skills.ts';
import { getGlobalPaths, getRepoPaths } from '../lib/targets.ts';
import { isInGitRepo } from '../utils/paths.ts';
import * as out from '../utils/output.ts';
import pc from 'picocolors';

interface InventorySection {
  title: string;
  skills: Skill[];
}

/**
 * Show inventory of skills
 */
export async function inventory(options: InventoryOptions = {}): Promise<void> {
  try {
    if (options.json) {
      await inventoryJSON(options);
    } else {
      await inventoryText(options);
    }
  } catch (err) {
    out.error('Failed to inventory skills', (err as Error).message);
    process.exit(1);
  }
}

/**
 * Show inventory as formatted text
 */
async function inventoryText(options: InventoryOptions): Promise<void> {
  const sections: InventorySection[] = [];

  // Library
  if (!options.target) {
    const libraryPath = await getLibraryPath();
    const librarySkills = existsSync(libraryPath)
      ? await listSkills(libraryPath, 'library')
      : [];

    sections.push({
      title: `Library (${librarySkills.length} skill${librarySkills.length !== 1 ? 's' : ''})`,
      skills: librarySkills,
    });

    if (options.library) {
      // Only show library
      printSections(sections);
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
        out.error(`Target "${options.target}" not found in config`);
        process.exit(1);
      }

      const targetSkills = existsSync(targetPath)
        ? await listSkills(targetPath, 'target', options.target)
        : [];

      sections.push({
        title: `${options.target} (${targetSkills.length} skill${targetSkills.length !== 1 ? 's' : ''})`,
        skills: targetSkills,
      });
    } else {
      // All targets
      for (const [targetName, targetPath] of globalPaths) {
        const targetSkills = existsSync(targetPath)
          ? await listSkills(targetPath, 'target', targetName)
          : [];

        sections.push({
          title: `${targetName} Global (${targetSkills.length} skill${targetSkills.length !== 1 ? 's' : ''})`,
          skills: targetSkills,
        });
      }

      // Repo paths if in git repo
      if (isInGitRepo()) {
        const config = await loadConfig();
        const repoPaths = getRepoPaths(config);

        for (const [targetName, repoPath] of repoPaths) {
          const repoSkills = existsSync(repoPath)
            ? await listSkills(repoPath, 'target', `${targetName}-repo`)
            : [];

          sections.push({
            title: `${targetName} Repo (${repoSkills.length} skill${repoSkills.length !== 1 ? 's' : ''})`,
            skills: repoSkills,
          });
        }
      }
    }
  }

  printSections(sections);
}

/**
 * Print inventory sections
 */
function printSections(sections: InventorySection[]): void {
  console.log('');

  for (const section of sections) {
    console.log(out.bold(section.title));

    if (section.skills.length === 0) {
      console.log(out.dim('  (empty)'));
    } else {
      for (const skill of section.skills) {
        const desc = skill.description.length > 60
          ? skill.description.slice(0, 57) + '...'
          : skill.description;

        console.log(
          `  ${pc.green('✓')} ${out.bold(skill.name)} ${out.dim('-')} ${desc}`
        );
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

  // Library
  if (!options.target) {
    const libraryPath = await getLibraryPath();
    const librarySkills = existsSync(libraryPath)
      ? await listSkills(libraryPath, 'library')
      : [];

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
        out.error(`Target "${options.target}" not found in config`);
        process.exit(1);
      }

      const targetSkills = existsSync(targetPath)
        ? await listSkills(targetPath, 'target', options.target)
        : [];

      result[options.target] = targetSkills;
    } else {
      for (const [targetName, targetPath] of globalPaths) {
        const targetSkills = existsSync(targetPath)
          ? await listSkills(targetPath, 'target', targetName)
          : [];

        result[`${targetName}-global`] = targetSkills;
      }

      // Repo paths
      if (isInGitRepo()) {
        const config = await loadConfig();
        const repoPaths = getRepoPaths(config);

        for (const [targetName, repoPath] of repoPaths) {
          const repoSkills = existsSync(repoPath)
            ? await listSkills(repoPath, 'target', `${targetName}-repo`)
            : [];

          result[`${targetName}-repo`] = repoSkills;
        }
      }
    }
  }

  console.log(JSON.stringify(result, null, 2));
}
