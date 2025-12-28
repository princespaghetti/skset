/**
 * Initialize skset configuration and library
 */

import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { getConfigPath, getDefaultConfig, isInitialized, saveConfig } from '../lib/config.ts';
import * as out from '../utils/output.ts';
import { expandHome } from '../utils/paths.ts';

/**
 * Initialize skset
 */
export async function init(): Promise<void> {
  try {
    if (await isInitialized()) {
      out.warning('skset is already initialized');
      out.info(`Config file: ${getConfigPath()}`);
      return;
    }

    const config = getDefaultConfig();

    // Create library directory
    const libraryPath = expandHome(config.library);
    if (!existsSync(libraryPath)) {
      await mkdir(libraryPath, { recursive: true });
    }

    // Save default config
    await saveConfig(config);

    out.success('Initialized skset');
    out.info('');
    out.info(`Config: ${getConfigPath()}`);
    out.info(`Library: ${libraryPath}`);
    out.info('');
    out.info('Next steps:');
    out.info('  1. Add skills: skset add <path>');
    out.info('  2. Push to targets: skset push --all');
    out.info('  3. View inventory: skset inventory');
  } catch (err) {
    out.error('Failed to initialize skset', (err as Error).message);
    process.exit(1);
  }
}
