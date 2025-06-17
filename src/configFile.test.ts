import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import path from "node:path";
import fs, { mkdir, rm } from "fs-extra"; // Using fs-extra for easier recursive directory operations
import os from "node:os";


import { createSecureThisConfigFile, getSecureThisConfig } from "./configFile.ts";
import { SECURETHIS_CONFIG_FILE_NAME } from "./consts.ts";
import type {SecureThisConfig} from "./types.ts";
import { existsSync } from "node:fs";

// --- Mocking Dependencies ---

// We need to mock the async function `getSecureThisPackageName` from "consts.ts"
// This ensures our test is predictable and doesn"t depend on the actual package.json
vi.mock("./consts.ts", async (importOriginal) => {
    const actual = await importOriginal<typeof import("./consts.ts")>();
    return {
        ...actual, // Keep original exports like SECURETHIS_CONFIG_FILE_NAME
        getSecureThisPackageName: vi.fn().mockResolvedValue("my-securethis-package"),
    };
});



const tmpDir = path.join(os.tmpdir(), 'securethis-tests');
beforeAll(async () => {
    await rm(tmpDir, {force: true, recursive: true});
    await mkdir(tmpDir);
});
afterAll(async () => {
    rm(tmpDir, {force: true, recursive: true});
});

async function createTempDir() {
    return await fs.mkdtemp(path.join(tmpDir, "securethis-test-"));
}

// --- Test Suite ---

describe("SecureThis Configuration Management", () => {
    const originalNodeEnv = process.env.NODE_ENV;

    // Create a unique temporary directory for each test
    beforeEach(async () => {
        // Reset NODE_ENV before each test
        process.env.NODE_ENV = originalNodeEnv;
    });

    // Clean up the temporary directory after each test
    afterEach(async () => {
        
        // Restore NODE_ENV
        process.env.NODE_ENV = originalNodeEnv;
    });

    describe("createSecureThisConfigFile", () => {

        it("should create a default config file in testing environment", async () => {
            const tempProjectDir = await createTempDir();
            const expectedConfigPath = path.join(tempProjectDir, SECURETHIS_CONFIG_FILE_NAME);

            // Act
            await createSecureThisConfigFile(tempProjectDir);

            // Assert: Check if the file exists
            const fileExists = await fs.pathExists(expectedConfigPath);
            expect(fileExists).toBe(true);

            // Assert: Check the content of the file for correctness
            const fileContent = await fs.readFile(expectedConfigPath, "utf-8");

            // 1. Check for the local import path (specific to "test" env)
            // We expect an absolute path to types.ts. It should NOT be a package import.
            expect(fileContent).toContain(`import type {SecureThisConfig} from `);
            expect(fileContent).toContain(`types.ts"`);
            expect(fileContent).not.toContain(`from "my-securethis-package"`);

            // 2. Check for the default configuration values
            expect(fileContent).toContain(`"outputDirRelative": "securethis-results"`);
            expect(fileContent).toContain(`"glob(**/node_modules/**)"`);
            expect(fileContent).toContain(`export const config`);
        });

        it("should create a default config file in non-testing environment", async () => {
            const tempProjectDir = await createTempDir();

            // Arrange: Set environment to something other than "testing"
            process.env.NODE_ENV = "production";
            const expectedConfigPath = path.join(tempProjectDir, SECURETHIS_CONFIG_FILE_NAME);

            // Act
            await createSecureThisConfigFile(tempProjectDir);

            // Assert: Check file content for correctness
            const fileContent = await fs.readFile(expectedConfigPath, "utf-8");

            // 1. Check for the package import path
            // The mocked "getSecureThisPackageName" returns "my-securethis-package"
            expect(fileContent).toContain(`import type {SecureThisConfig} from "my-securethis-package"`);

            // 2. Check for default values
            expect(fileContent).toContain(`"outputDirRelative": "securethis-results"`);
        });

        it("should override custom defaults with the default config", async () => {
            const tempProjectDir = await createTempDir();
            // Arrange
            const customConfig: Partial<SecureThisConfig> = {
                outputDirRelative: "my-custom-results",
                sastExclude: ["custom/exclude/path"],
            };
            const expectedConfigPath = path.join(tempProjectDir, SECURETHIS_CONFIG_FILE_NAME);

            // Act
            await createSecureThisConfigFile(tempProjectDir, customConfig);

            // Assert: Check the file content
            const fileContent = await fs.readFile(expectedConfigPath, "utf-8");

            // 1. Custom value should be present
            expect(fileContent).toContain(`"outputDirRelative": "my-custom-results"`);

            // 2. Custom array value should be present
            expect(fileContent).toContain(`"custom/exclude/path"`);

        });
    });

    describe("getSecureThisConfig", () => {

        it("should throw error if the config file does not exist", async () => {
            const tempProjectDir = await createTempDir();
            // Act
            await expect(getSecureThisConfig(tempProjectDir)).rejects.toThrow("A config file has been created ");

            const configFilePath = path.join(tempProjectDir, SECURETHIS_CONFIG_FILE_NAME);
            expect(existsSync(configFilePath)).toBe(true);

        });

        it("should load and return the config from an existing file", async () => {
            const tempProjectDir = await createTempDir();
            // Arrange: Manually create a config file with custom values
            const configFilePath = path.join(tempProjectDir, SECURETHIS_CONFIG_FILE_NAME);
            const testConfigContent = `
        export default {
          outputDirRelative: "loaded-from-file",
          sastExclude: ["only-this-one"]
        };
      `;
            await fs.writeFile(configFilePath, testConfigContent);

            // Act
            const config = await getSecureThisConfig(tempProjectDir);

            // Assert: The loaded config should match the file content, not the default
            expect(config.outputDirRelative).toBe("loaded-from-file");
            expect(config.sastExclude).toEqual(["only-this-one"]);
        });
    });

    describe("Integration: create and get", () => {

        it("should correctly get a config that was just created", async () => {
            const tempProjectDir = await createTempDir();
            // Arrange: Define custom config to create
            const customConfig: Partial<SecureThisConfig> = {
                outputDirRelative: "e2e-test-dir",
                sastExclude: ["e2e/exclude", "glob(**/dist/**)"], // Mix custom and default
            };

            // Act (Step 1: Create)
            await createSecureThisConfigFile(tempProjectDir, customConfig);

            // Act (Step 2: Get)
            const loadedConfig = await getSecureThisConfig(tempProjectDir);

            // Assert: The loaded config must match the merged config that was written to the file
            expect(loadedConfig.outputDirRelative).toBe("e2e-test-dir");
            expect(loadedConfig.sastExclude).toEqual([
                "e2e/exclude",
                "glob(**/dist/**)"
            ]);
        });
    });
});