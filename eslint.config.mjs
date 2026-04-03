import { defineConfig } from "eslint/config";
import { fileURLToPath } from "node:url";

import js from "@eslint/js";
import globals from "globals";
import eslintConfigPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint";

const typeCheckedConfigs = tseslint.configs.recommendedTypeChecked.map((config) => ({
  ...config,
  files: ["**/*.ts"]
}));

/**
 * ESLint configuration for the TypeScript Foundry module scaffold.
 * The `no-explicit-any` rule is enabled to keep the codebase educational and type-safe.
 */
export default defineConfig([
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**"]
  },
  js.configs.recommended,
  ...typeCheckedConfigs,
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2024
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: rootDirFromMeta()
      }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error"
    }
  },
  {
    files: ["tests/**/*.ts"],
    languageOptions: {
      globals: {
        describe: "readonly",
        expect: "readonly",
        it: "readonly"
      }
    }
  },
  eslintConfigPrettier
]);

/**
 * Resolves the current config directory for typed linting.
 */
function rootDirFromMeta() {
  return fileURLToPath(new globalThis.URL(".", import.meta.url));
}
