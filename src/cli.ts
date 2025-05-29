#!/usr/bin/env node


// Entry point guard: ensures main() is called only when script is executed directly
// For ESM, `import.meta.url` gives the URL of the current module.
// `process.argv[1]` gives the path of the executed script.

import { fileURLToPath } from "url";
import { securityScan } from "./securityScan.ts";
import { realpathSync } from "fs";
import path from "path";
import chalk from "chalk";

// We need to compare their file paths.
const currentScriptPath = realpathSync(fileURLToPath(import.meta.url));
const executedScriptPath = realpathSync(path.resolve(process.argv[1]!));

if (currentScriptPath === executedScriptPath) {
    securityScan().catch(error => {
        console.error(chalk.red('\nAn unexpected error occurred in security-scan:'));
        console.error(error);
        process.exit(1);
    });
}