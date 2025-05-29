// Security Scan Configuration File (securethis.config.ts)
// Please review and adjust these settings as needed for your project.

import type {SecureThisConfig} from '../../../src/types.ts';

export const config: SecureThisConfig = {
    "outputDirRelative": "./securethis-results",
    "sastExclude": [
        "glob(**/node_modules/**)",
        "glob(**/dist/**)",
        "glob(**/build/**)",
        "glob(**/securethis-results/**)",
        "coverage",
        "glob(**/test*/**)",
        "glob(**/*spec*/**)",
        "glob(**/__tests__/**)",
        "target",
        ".venv",
        ".git",
        ".svn",
        ".hg",
        "**/*.log",
        "temp/"
    ]
}
