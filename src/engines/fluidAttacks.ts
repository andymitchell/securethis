import { execSync, type ExecSyncOptions } from 'child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import chalk from 'chalk';
import yaml from 'js-yaml';
import type { FluidAttackResult, Options, SecureThisConfig } from '../types.ts';
import { fileURLToPath } from 'node:url';
import { BASE_FLUID_ATTACKS_FILE_NAME, FLUID_ATTACKS_OUTPUT_FILE_NAME } from '../consts.ts';




const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);


export async function runFluidAttacks(projectRootDirAbsolute: string, outputDirAbsolute:string, secureThisConfig: SecureThisConfig, options?: Options): Promise<FluidAttackResult> {
    
    

    const baseConfigYamlPathInCli = path.resolve(dirname, '../..', BASE_FLUID_ATTACKS_FILE_NAME);
    if (!fs.existsSync(baseConfigYamlPathInCli)) {
        console.error(chalk.red(`Error: Bundled base fluid-attacks-config.yaml not found.`));
        console.error(chalk.red(`Expected at: ${baseConfigYamlPathInCli}`));
        process.exit(1);
    }
    

    const temporaryMergedConfigHostPath = await createTemporaryFluidAttacksConfigFile(
        baseConfigYamlPathInCli,
        secureThisConfig
    );
    const temporaryMergedConfigContainerPath = '/temp-merged-config/config.yaml';

    let fluidAttacksResultPath: string | undefined;

    try {
        const dockerCommandArr: string[] = [
            `docker run --rm`,
            `-v "${projectRootDirAbsolute}:/scan-target:ro"`,
            `-v "${outputDirAbsolute}:/scan-output"`,
            `-v "${temporaryMergedConfigHostPath}:${temporaryMergedConfigContainerPath}:ro"`,
            `fluidattacks/cli:arm64`, // Consider making this configurable
            `skims scan ${temporaryMergedConfigContainerPath}`
        ];
        const dockerCommand = dockerCommandArr.join(' ');

        console.log(chalk.blue('\nRunning Fluid Attacks Docker container...'));
        console.log(chalk.dim(`Executing: ${dockerCommand.replace(/\s+/g, ' ')}\n`));

        const dockerOptions: ExecSyncOptions = { stdio: 'inherit' };
        execSync(dockerCommand, dockerOptions);

        const originalResultsFilename = FLUID_ATTACKS_OUTPUT_FILE_NAME;
        const originalResultsPath = path.join(outputDirAbsolute, originalResultsFilename);

        if (!fs.existsSync(originalResultsPath)) {
            console.warn(chalk.yellow(`\nWarning: Expected results file '${originalResultsFilename}' not found in ${outputDirAbsolute}.`));
            console.warn(chalk.yellow('The scan may have failed or produced no CSV output. Check Docker logs above.'));
            return {};
        }

        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        const newResultsFilename = `Fluid-Attacks-Results-${timestamp}.csv`;
        const newResultsPath = path.join(outputDirAbsolute, newResultsFilename);

        try {
            fs.renameSync(originalResultsPath, newResultsPath);
            console.log(chalk.green(`\nResults file renamed to: ${newResultsPath}`));
            fluidAttacksResultPath = newResultsPath;
        } catch (renameError) {
            console.error(chalk.red(`\nError renaming results file '${originalResultsPath}' to '${newResultsPath}'.`));
            fluidAttacksResultPath = originalResultsPath;
        }

        const finalResultsPathToCheck = fluidAttacksResultPath;

        if (finalResultsPathToCheck && fs.existsSync(finalResultsPathToCheck)) {
            const resultsContent = fs.readFileSync(finalResultsPathToCheck, 'utf-8');
            // This success message might vary or be insufficient.
            // A more robust check might involve parsing the CSV for lack of critical findings.
            const successMessage = 'Summary: No vulnerabilities were found';

            if (resultsContent.includes(successMessage)) {
                console.log(chalk.green.bold('\n✅ Fluid Attacks scan complete. No vulnerabilities found!'));
            } else {
                const lines = resultsContent.split('\n').filter(line => line.trim() !== '');
                const vulnerabilityCount = lines.length > 1 ? lines.length -1 : 0; // Assuming header row
                if (vulnerabilityCount > 0) {
                    console.log(chalk.red.bold(`\n⚠️ Fluid Attacks scan complete. ${vulnerabilityCount} potential issue(s) found.`));
                } else {
                     // This case could happen if the file exists, isn't empty, but doesn't have the "no vulnerabilities" message and has no actual vulnerability rows.
                    console.log(chalk.yellow.bold(`\n➖ Fluid Attacks scan complete. Results file generated, but could not determine vulnerability status from summary message.`));
                }
                console.log(chalk.red(`Please review the results: file://${finalResultsPathToCheck}`));
            }
        } else {
            console.warn(chalk.yellow(`\nCould not find the Fluid Attacks results file to analyze at ${finalResultsPathToCheck}.`));
        }

    } catch (error) {
        console.error(chalk.red('\nError executing Docker command.'));
        console.error(chalk.red('Please ensure Docker is running and the image fluidattacks/cli:arm64 is available.'));
        if (error instanceof Error) {
           console.error(chalk.red(error.message));
        }
        throw error;
    } finally {
        if (temporaryMergedConfigHostPath) {
            const tempDirToRemove = path.dirname(temporaryMergedConfigHostPath);
            try {
                fs.rmSync(tempDirToRemove, { recursive: true, force: true });
                console.log(chalk.gray(`Cleaned up Fluid Attacks temporary config directory: ${tempDirToRemove}`));
            } catch (cleanupError) {
                console.warn(chalk.yellow(`Warning: Could not clean up temporary directory ${tempDirToRemove}. You may need to remove it manually.`));
            }
        }
    }

    return {
        fluidAttacksResultPath
    };
}


/**
 * Creates a temporary Fluid Attacks configuration file by merging the base
 * configuration with sast.exclude rules from the project's securethis.config.ts.
 * Ensures all exclude paths are wrapped in 'glob()' if not already.
 * @param baseConfigPathInCli Path to the CLI's bundled fluid-attacks-config.yaml.
 * @param projectSecureThisConfig The loaded configuration from securethis.config.ts.
 * @returns A Promise resolving to the path of the temporary merged YAML configuration file.
 */
async function createTemporaryFluidAttacksConfigFile(
    baseConfigPathInCli: string,
    projectSecureThisConfig: SecureThisConfig
): Promise<string> {

    const baseConfigContent = fs.readFileSync(baseConfigPathInCli, 'utf8');
    const baseConfig = yaml.load(baseConfigContent) as any;

    const mergedConfig = JSON.parse(JSON.stringify(baseConfig)); // Deep clone

    if (!mergedConfig.sast) {
        mergedConfig.sast = {};
    }

    // Process sastExclude to ensure all paths are glob-formatted for Fluid Attacks
    const processedSastExclude = projectSecureThisConfig.sastExclude.map(p => {
        const trimmedPath = p.trim();
        if (trimmedPath.toLowerCase().startsWith('glob(') && trimmedPath.endsWith(')')) {
            return trimmedPath; // Already a glob
        }
        // Escape potential special characters for glob if it's a literal path, though Fluid's glob might handle this.
        // For simplicity, directly wrapping. If paths contain glob metacharacters meant literally, this needs more care.
        return `glob(${trimmedPath.replace(/\*\*/g, '*').replace(/\*/g, '[*]')})`; // Basic attempt to make literal paths safer in glob
                                                                                 // Or more simply if Fluid's glob is forgiving:
                                                                                 // return `glob(${trimmedPath})`;
    });

    mergedConfig.sast.exclude = processedSastExclude;

    // Update output path in the temporary config to ensure consistency, though Docker mount handles actual output location.
    // This ensures the CSV filename inside the container matches what we expect.
    // The 'output' object and 'file_path' might be at the root of the config.
    if (!mergedConfig.output) {
      mergedConfig.output = {};
    }
    mergedConfig.output.file_path = `/scan-output/${FLUID_ATTACKS_OUTPUT_FILE_NAME}`; // Path inside the container
    mergedConfig.output.format = 'CSV'; // Ensure format is CSV as expected

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fluid-attacks-config-'));
    const tempConfigFilePath = path.join(tempDir, 'merged-fluid-attacks-config.yaml');


    const content = yaml.dump(mergedConfig);
    fs.writeFileSync(tempConfigFilePath, content);
    console.log(chalk.gray(`\n\nCreated temporary merged Fluid Attacks config at: ${tempConfigFilePath}`));
    console.log(chalk.gray(`---\n${content}\n===\n`))


    return tempConfigFilePath;
}
