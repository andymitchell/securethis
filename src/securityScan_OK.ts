#!/usr/bin/env node

import { execSync, type ExecSyncOptions } from 'child_process';
import fs from 'node:fs'; // Use node: prefix for built-in modules
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { findUp } from 'find-up';

const NAME = "Security Scan";
const FLUID_ATTACKS_OUTPUT_FILE_NAME = 'Fluid-Attacks-Results.csv';

// Replicate dirname for ESM
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename); // This will be <projectroot>/src when running ts-node/vitest, or <projectroot>/dist when running compiled js


type Options = {

    /** Set the cwd, to alter the start point for finding the nearest package.json ancestor */
    cwd?: string,

    /** Instead of asking the user, set the result for which folder to output to. Useful in testing or any non-interactive mode. */
    forceFluidAttacksOutputDirRelative?: string

}

type FluidAttackResult = {
    fluidAttacksResultPath?: string
}
type Result = FluidAttackResult & {}


// Export main for testing purposes
export async function securityScan(
    options?: Options
):Promise<Result> {
    console.log(chalk.blue(`Starting ${NAME}...`));

    const fluidAttacksResult = await runFluidAttacks(options);

    return {
        ...fluidAttacksResult
    }

}

async function runFluidAttacks(options?:Options):Promise<FluidAttackResult> {

    const cwd = options?.cwd ?? process.cwd();

    const projectPackageJsonPath = await findUp('package.json', { cwd });
    if (!projectPackageJsonPath) {
        console.error(chalk.red('Error: Could not find a package.json in the current directory or any parent directory.'));
        console.error(chalk.red('Please run this tool from within your Node.js project.'));
        process.exit(1);
    }
    const projectRootDir = path.dirname(projectPackageJsonPath);
    console.log(chalk.gray(`Project root found: ${projectRootDir}`));

    let outputDirRelative:string;
    if( options?.forceFluidAttacksOutputDirRelative ) {
        outputDirRelative = options.forceFluidAttacksOutputDirRelative;
    } else {
        const result = await inquirer.prompt([
            {
                type: 'input',
                name: 'outputDirRelative',
                message: 'Enter the directory to output results (relative to project root):',
                default: 'security-scan-results',
            },
        ]);
        outputDirRelative = result.outputDirRelative;
    }

    const absoluteOutputDir = path.resolve(projectRootDir, outputDirRelative);
    if (!fs.existsSync(absoluteOutputDir)) {
        console.log(chalk.gray(`Creating output directory: ${absoluteOutputDir}`));
        fs.mkdirSync(absoluteOutputDir, { recursive: true });
    }
    console.log(chalk.gray(`Results will be saved to: ${absoluteOutputDir}`));

    // Path to CLI's bundled fluid-attacks-config.yaml
    // If dirname is src/, then ../fluid-attacks-config.yaml is at project root.
    // If dirname is dist/, then ../fluid-attacks-config.yaml is at project root.
    const configYamlPathInCli = path.resolve(dirname, '..', 'fluid-attacks-config.yaml');

    if (!fs.existsSync(configYamlPathInCli)) {
        console.error(chalk.red(`Error: Bundled fluid-attacks-config.yaml not found.`));
        console.error(chalk.red(`Expected at: ${configYamlPathInCli}`));
        console.error(chalk.red(`Current dirname: ${dirname}`));
        console.error(chalk.red('This indicates an installation problem or a misconfiguration in the CLI tool itself.'));
        process.exit(1);
    }
    console.log(chalk.gray(`Using CLI config: ${configYamlPathInCli}`));

    const dockerCommandArr:string[] = [
        `docker run --rm`,
        `-v "${projectRootDir}:/scan-target:ro"`, // 'ro' is read-only
        `-v "${absoluteOutputDir}:/scan-output"`,
        `-v "${configYamlPathInCli}:/cli-config/fluid-attacks-config.yaml:ro"`, // 'ro' is read-only
        `fluidattacks/cli:arm64`,
        `skims scan /cli-config/fluid-attacks-config.yaml`
    ];
    const dockerCommand = dockerCommandArr.join(' ');

    //console.log({dockerCommand});
    

    console.log(chalk.blue('\nRunning Fluid Attacks Docker container...'));
    console.log(chalk.dim(`Executing: ${dockerCommand.replace(/\s+/g, ' ')}\n`));

    const dockerOptions: ExecSyncOptions = { stdio: 'inherit' };

    try {
        execSync(dockerCommand, dockerOptions);
    } catch (error) {
        console.error(chalk.red('\nError executing Docker command.'));
        console.error(chalk.red('Please ensure Docker is running and the image fluidattacks/cli:arm64 is available.'));
        process.exit(1);
    }

    

    const originalResultsFilename = FLUID_ATTACKS_OUTPUT_FILE_NAME;
    const originalResultsPath = path.join(absoluteOutputDir, originalResultsFilename);

    if (!fs.existsSync(originalResultsPath)) {
        console.warn(chalk.yellow(`\nWarning: Expected results file '${originalResultsFilename}' not found in ${absoluteOutputDir}.`));
        console.warn(chalk.yellow('The scan may have failed or produced no CSV output. Check Docker logs above.'));
        return {};
    }

    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
    const newResultsFilename = `Fluid-Attacks-Results-${timestamp}.csv`;
    const newResultsPath = path.join(absoluteOutputDir, newResultsFilename);

    try {
        fs.renameSync(originalResultsPath, newResultsPath);
        console.log(chalk.green(`\nResults file renamed to: ${newResultsPath}`));
    } catch (renameError) {
        console.error(chalk.red(`\nError renaming results file '${originalResultsPath}' to '${newResultsPath}'.`));
        // console.error(renameError); // Keep it concise
    }

    const finalResultsPathToCheck = fs.existsSync(newResultsPath) ? newResultsPath : originalResultsPath;

    if (fs.existsSync(finalResultsPathToCheck)) {
        const resultsContent = fs.readFileSync(finalResultsPathToCheck, 'utf-8');
        const successMessage = 'Summary: No vulnerabilities were found';

        if (resultsContent.includes(successMessage)) {
            console.log(chalk.green.bold('\n✅ Scan complete. No vulnerabilities found!'));
        } else {
            console.log(chalk.red.bold(`\n⚠️ Scan complete. Potential issues found.`));
            console.log(chalk.red(`Please review the results: file://${finalResultsPathToCheck}`));
        }
    } else {
        console.warn(chalk.yellow(`\nCould not find results file to analyze at ${finalResultsPathToCheck}.`));
    }

    return {
        fluidAttacksResultPath: finalResultsPathToCheck
    }
}