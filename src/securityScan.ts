import chalk from 'chalk';
import fs from 'node:fs';
import type { Options, Result } from './types.ts';
import { NAME } from './consts.ts';
import { runFluidAttacks } from './engines/fluidAttacks.ts';
import { findUp } from 'find-up';
import path from 'path';
import { getSecureThisConfig } from './configFile.ts';


// Replicate dirname for ESM
//const filename = fileURLToPath(import.meta.url);
//const dirname = path.dirname(filename);





// Export main for testing purposes
export async function securityScan(
    options?: Options
): Promise<Result> {
    console.log(chalk.blue(`Starting ${NAME}...`));

    const cwd = options?.cwd ?? process.cwd();

    const projectPackageJsonPath = await findUp('package.json', { cwd });
    if (!projectPackageJsonPath) {
        console.error(chalk.red('Error: Could not find a package.json in the current directory or any parent directory.'));
        console.error(chalk.red('Please run this tool from within your Node.js project.'));
        process.exit(1);
    }
    const projectRootDirAbsolute = path.dirname(projectPackageJsonPath);
    console.log(chalk.gray(`Project root found: ${projectRootDirAbsolute}`));

    const secureThisConfig = await getSecureThisConfig(projectRootDirAbsolute);

    const outputDirRelative = secureThisConfig.outputDirRelative;

    const outputDirAbsolute = path.resolve(projectRootDirAbsolute, outputDirRelative);
    if (!fs.existsSync(outputDirAbsolute)) {
        console.log(chalk.gray(`Creating output directory: ${outputDirAbsolute}`));
        fs.mkdirSync(outputDirAbsolute, { recursive: true });
    }
    console.log(chalk.gray(`Results will be saved to: ${outputDirAbsolute}`));


    const fluidAttacksResult = await runFluidAttacks(projectRootDirAbsolute, outputDirAbsolute, secureThisConfig, options);

    return {
        ...fluidAttacksResult,
        outputDirAbsolute
    };
}

