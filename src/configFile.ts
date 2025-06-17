

import path from 'node:path';
import chalk from 'chalk';
import { getSecureThisPackageName, SECURETHIS_CONFIG_FILE_NAME } from './consts.ts';
import type { SecureThisConfig } from './types.ts';
import { fileURLToPath } from 'node:url';
import { loadTsConfigWithSchema } from '@andyrmitchell/cli-config-file-ts/schema';
import { SecureThisConfigSchema } from './schemas.ts';
import {  createTsConfig } from '@andyrmitchell/cli-config-file-ts';


const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);


const DEFAULT_CONFIG:SecureThisConfig = {
        outputDirRelative: 'securethis-results',
        sastExclude: [
            'glob(**/node_modules/**)',
            'glob(**/dist/**)',
            'glob(**/build/**)',
            'glob(**/securethis-results/**)',
            'coverage',
            'glob(**/test*/**)',
            'glob(**/*spec*/**)',
            'glob(**/__tests__/**)',
            'target', // Common for Java/Maven projects
            '.venv', // Python virtual environments
            '.git',
            '.svn',
            '.hg',
            '**/*.log', // Example of a pattern that will be wrapped
            'temp/'
        ]
    };

/**
 * Creates a default securethis config file (e.g. securethis.config.ts) in the specified project root directory.
 * @param projectRootDirAbsolute The root directory of the target project.
 * @param customDefault Pass in different config options
 */
export async function createSecureThisConfigFile(projectRootDirAbsolute: string, customDefault?: Partial<SecureThisConfig>): Promise<void> {

    const configFilePath = path.join(projectRootDirAbsolute, SECURETHIS_CONFIG_FILE_NAME);

    createTsConfig(configFilePath, {
        config: {
            ...DEFAULT_CONFIG,
            ...customDefault
        },
        constrainToType: {
            identifier: 'SecureThisConfig',
            source: process.env.NODE_ENV==='test'? {
                type: 'local',
                absolutePath: path.join(dirname, 'types.ts')
            }  :{
                type: 'package',
                packageName: await getSecureThisPackageName()
            }
        }
    })
    
    console.log(chalk.yellow(`\nCreated a default configuration file: ${configFilePath}`));
    
}

/**
 * Retrieves the configuration from securethis.config.ts located in the project's root directory.
 * Uses bundle-require to load the TypeScript configuration file.
 * If the file doesn't exist, it creates a default one and exits.
 * @param projectRootDir The root directory of the target project.
 * @returns A Promise resolving to the loaded SecureThisConfig.
 */
export async function getSecureThisConfig(projectRootDir: string): Promise<SecureThisConfig> {
    const configFilePath = path.join(projectRootDir, SECURETHIS_CONFIG_FILE_NAME);

    const result = await loadTsConfigWithSchema(configFilePath, SecureThisConfigSchema, {
        config: DEFAULT_CONFIG
    })
    return result;

}
