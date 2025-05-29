import { fileURLToPath } from "url";
import path from "path";
import { existsSync, rmSync } from "fs";
import chalk from "chalk";
import { securityScan } from "../../src/securityScan.ts";
import { createSecureThisConfigFile } from "../../src/configFile.ts";


const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename); // This will be <projectroot>/src when running ts-node/vitest, or <projectroot>/dist when running compiled js
const PROJECT_DIR_NAME = 'example-project';
const SECURETHIS_CONFIG_FILE_NAME = 'securethis.config.ts';
const SCAN_RESULTS_DIR_NAME = 'securethis-results';


function removeScanResults() {
    const dirAbsolute = path.join(dirname, PROJECT_DIR_NAME, SCAN_RESULTS_DIR_NAME)
    rmSync(dirAbsolute, { recursive: true, force: true });
}

function removeConfigFile() {
    const fileAbsolute = path.join(dirname, PROJECT_DIR_NAME, SECURETHIS_CONFIG_FILE_NAME)
    rmSync(fileAbsolute, {force: true});
}

beforeEach(() => {
    removeConfigFile();
    removeScanResults()
})
afterAll(() => {
    console.log(chalk.italic(`FYI ${path.join(dirname, PROJECT_DIR_NAME, SCAN_RESULTS_DIR_NAME)} will be erased before the next test. It's left for now so you can evaluate the results of the last test.`));
    //removeScanResults();
})

it('runs', async () => {
    const cwd = path.join(dirname, PROJECT_DIR_NAME);

    await createSecureThisConfigFile(cwd, {
        outputDirRelative: `./${SCAN_RESULTS_DIR_NAME}`
    })

    const result = await securityScan({
        cwd
    })

    const fileExists = result.fluidAttacksResultPath && existsSync(result.fluidAttacksResultPath);
    expect(fileExists).toBe(true);
    

}, 30000)
    