

export type SecureThisConfig = {
    /**
    * Directory where scan results will be saved, relative to the project root.
    */
    outputDirRelative: string;

    /**
    * SAST exclusion paths.
    * Entries can be simple paths (e.g., "dist", "vendor/some_lib")
    * or explicit glob patterns (e.g., "glob(**\/__tests__/**)").
    * Simple paths will be automatically wrapped with glob() for Fluid Attacks.
    */
    sastExclude: string[]; // Can contain plain paths or glob patterns
};


export type Options = {
    /** Set the cwd, to alter the start point for finding the nearest package.json ancestor */
    cwd?: string;
};

export type FluidAttackResult = {
    fluidAttacksResultPath?: string;
};
export type Result = FluidAttackResult & {
    outputDirAbsolute: string
};