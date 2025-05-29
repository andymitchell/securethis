
import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import { bundleRequire } from 'bundle-require'; // For loading .ts config
import { getSecureThisPackageName, NAME, SECURETHIS_CONFIG_FILE_NAME } from './consts.ts';
import type { SecureThisConfig } from './types.ts';
import { fileURLToPath } from 'node:url';


const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

function getRelativeImportPathToTypesForTesting(projectRootDirAbsolute:string, configFilePath:string):string {
    return path.relative(projectRootDirAbsolute, path.join(dirname, 'types.ts'));
}

/**
 * Creates a default securethis config file (e.g. securethis.config.ts) in the specified project root directory.
 * @param projectRootDirAbsolute The root directory of the target project.
 * @param customDefault Pass in different config options
 */
export async function createSecureThisConfigFile(projectRootDirAbsolute: string, customDefault?: Partial<SecureThisConfig>): Promise<void> {

    
    

    const configFilePath = path.join(projectRootDirAbsolute, SECURETHIS_CONFIG_FILE_NAME);
    const importPath = process.env.NODE_ENV? getRelativeImportPathToTypesForTesting(projectRootDirAbsolute, configFilePath) : await getSecureThisPackageName();

    const config: SecureThisConfig = {
        outputDirRelative: 'securethis-results',
        sastExclude: [
            'glob(**/node_modules/**)',
            'glob(**/securethis-results/**)',
            'bower_components',
            'vendor',
            'dist',
            'build',
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
        ],
        ...customDefault
    };
    
    
    
    const defaultConfigContent = `// ${NAME} Configuration File (${SECURETHIS_CONFIG_FILE_NAME})
// Please review and adjust these settings as needed for your project.

import type {SecureThisConfig} from '${importPath}';

export const config: SecureThisConfig = ${JSON.stringify(config, undefined, 4)}
`;

    fs.writeFileSync(configFilePath, defaultConfigContent);
    console.log(chalk.yellow(`\nCreated a default configuration file: ${configFilePath}`));
    
}

/**
 * Retrieves the configuration from securethis.config.ts located in the project's root directory.
 * Uses bundle-require to load the TypeScript configuration file.
 * If the file doesn't exist, it offers to create a default one and exits.
 * @param projectRootDir The root directory of the target project.
 * @returns A Promise resolving to the loaded SecureThisConfig.
 */
export async function getSecureThisConfig(projectRootDir: string): Promise<SecureThisConfig> {
    const configFilePath = path.join(projectRootDir, SECURETHIS_CONFIG_FILE_NAME);

    if (!fs.existsSync(configFilePath)) {
        console.log(chalk.yellow(`Configuration file (${SECURETHIS_CONFIG_FILE_NAME}) not found in ${projectRootDir}.`));
        await createSecureThisConfigFile(projectRootDir);
        console.log(chalk.yellow(`Please review this file, customize it for your project, and then re-run the scan.`));
        process.exit(0);
        // createDefaultSecureThisConfigFile exits, so this won't be reached on first run if file doesn't exist.
        //throw new Error("Configuration file was not found and creation was prompted. Please re-run after review.");
    }

    try {
        const { mod } = await bundleRequire({ filepath: configFilePath });
        if (mod.config &&
            typeof mod.config.outputDirRelative === 'string' &&
            Array.isArray(mod.config.sastExclude)) {
            console.log(chalk.gray(`Using project configuration: ${configFilePath}`));
            return mod.config as SecureThisConfig;
        } else {
            console.error(chalk.red(`Error: Invalid configuration in ${configFilePath}.`));
            console.error(chalk.red(`Expected an exported 'config' object with 'outputDirRelative' (string) and 'sastExclude' (array of strings).`));
            process.exit(1);
        }
    } catch (error: any) {
        console.error(chalk.red(`Error loading or bundling configuration file ${configFilePath}:`));
        console.error(chalk.red(error.message || String(error)));
        if (error.errors) { // bundle-require might provide more detailed errors
            error.errors.forEach((err: any) => console.error(chalk.red(err.text)));
        }
        process.exit(1);
    }
}
