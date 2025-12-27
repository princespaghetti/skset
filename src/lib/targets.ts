/**
 * Target path resolution and management
 */

import type { Config, Target } from '../types/index.ts';
import { expandHome, resolveRepoPath } from '../utils/paths.ts';
import { loadConfig } from './config.ts';

/**
 * Get all configured targets
 */
export async function getTargets(): Promise<Target[]> {
  const config = await loadConfig();

  return Object.entries(config.targets).map(([name, target]) => ({
    name,
    global: target.global,
    repo: target.repo,
  }));
}

/**
 * Get a specific target by name
 */
export async function getTarget(name: string): Promise<Target | null> {
  const targets = await getTargets();
  return targets.find(t => t.name === name) || null;
}

/**
 * Get all global paths from all targets (expanded)
 * @returns Map of target name to expanded global path
 */
export async function getGlobalPaths(): Promise<Map<string, string>> {
  const targets = await getTargets();
  const paths = new Map<string, string>();

  for (const target of targets) {
    if (target.global) {
      paths.set(target.name, expandHome(target.global));
    }
  }

  return paths;
}

/**
 * Get all repo paths from all targets (resolved)
 * @returns Map of target name to resolved repo path
 */
export function getRepoPaths(config: Config): Map<string, string> {
  const paths = new Map<string, string>();

  for (const [name, target] of Object.entries(config.targets)) {
    if (target.repo) {
      paths.set(name, resolveRepoPath(target.repo));
    }
  }

  return paths;
}

/**
 * Resolve target paths for push operations
 * @param targetName - Specific target name or undefined for all
 * @param useRepo - Whether to use repo paths instead of global
 * @returns Map of target name to resolved path
 */
export async function resolveTargetPaths(
  targetName?: string,
  useRepo?: boolean
): Promise<Map<string, string>> {
  const config = await loadConfig();

  if (targetName) {
    // Single target
    const target = await getTarget(targetName);
    if (!target) {
      throw new Error(`Target "${targetName}" not found in config`);
    }

    const path = useRepo
      ? target.repo
        ? resolveRepoPath(target.repo)
        : null
      : target.global
        ? expandHome(target.global)
        : null;

    if (!path) {
      const type = useRepo ? 'repo' : 'global';
      throw new Error(`Target "${targetName}" has no ${type} path configured`);
    }

    return new Map([[targetName, path]]);
  }

  // All targets
  if (useRepo) {
    return getRepoPaths(config);
  } else {
    return await getGlobalPaths();
  }
}
