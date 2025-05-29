// === General

import { findUp } from "find-up";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

export const NAME = "Security Scan";
export const SECURETHIS_CONFIG_FILE_NAME = 'securethis.config.ts';


export async function getSecureThisPackageName() {
    const filename = fileURLToPath(import.meta.url);
    const dirname = path.dirname(filename);
    const packageJsonDirAbsolute = await findUp('package.json', {cwd: dirname});
    const packageJson = readFileSync(packageJsonDirAbsolute!, {encoding: 'utf-8'});
    const obj = JSON.parse(packageJson!);
    return obj.name;

}

// === Fluid Attacks

export const BASE_FLUID_ATTACKS_FILE_NAME = 'base-fluid-attacks-config.yaml';
export const FLUID_ATTACKS_OUTPUT_FILE_NAME = 'Fluid-Attacks-Results.csv'; // As defined in the BASE_FLUID_ATTACKS_FILE_NAME