import z from 'zod';
import {isTypeEqual} from '@andyrmitchell/utils';
import type { SecureThisConfig } from './types.ts';

export const SecureThisConfigSchema = z.object({
  /**
   * Directory where scan results will be saved, relative to the project root.
   */
  outputDirRelative: z.string(),

  /**
   * SAST exclusion paths.
   * Entries can be simple paths (e.g., "dist", "vendor/some_lib")
   * or explicit glob patterns (e.g., "glob(**\/__tests__/**)").
   * Simple paths will be automatically wrapped with glob() for Fluid Attacks.
   */
  sastExclude: z.array(z.string())
});


isTypeEqual<z.infer<typeof SecureThisConfigSchema>, SecureThisConfig>(true);