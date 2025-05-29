#!/usr/bin/env node


// Entry point guard: ensures main() is called only when script is executed directly
// For ESM, `import.meta.url` gives the URL of the current module.
// `process.argv[1]` gives the path of the executed script.

import { fileURLToPath } from "url";
import { securityScan } from "./securityScan.ts";
import path from "path";
import chalk from "chalk";

// We need to compare their file paths.
const currentScriptPath = fileURLToPath(import.meta.url);
const executedScriptPath = path.resolve(process.argv[1]!); // Resolve to handle relative paths

if (currentScriptPath === executedScriptPath) {
    securityScan().catch(error => {
        console.error(chalk.red('\nAn unexpected error occurred in security-scan:'));
        console.error(error);
        process.exit(1);
    });
}