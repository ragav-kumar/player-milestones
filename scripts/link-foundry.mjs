import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const MODULE_ID = "player-milestones";
const repoRoot = path.resolve(fileURLToPath(new globalThis.URL("..", import.meta.url)));
const dataPath = process.env.FOUNDRY_DATA_PATH;
const modulesPath = process.env.FOUNDRY_MODULES_PATH;
const defaultModulesPath = process.env.LOCALAPPDATA
  ? path.join(process.env.LOCALAPPDATA, "FoundryVTT", "Data", "modules")
  : undefined;
const foundryModulesPath = modulesPath ?? (dataPath ? path.join(dataPath, "modules") : defaultModulesPath);
const junctionPath = foundryModulesPath ? path.join(foundryModulesPath, MODULE_ID) : undefined;

/**
 * Creates or verifies the Windows junction used for local Foundry testing.
 * You can override the default location with `FOUNDRY_DATA_PATH` or `FOUNDRY_MODULES_PATH`.
 */
async function main() {
  if (!junctionPath || !foundryModulesPath) {
    throw new Error(
      "Unable to resolve the Foundry modules directory. Set FOUNDRY_DATA_PATH or FOUNDRY_MODULES_PATH first."
    );
  }

  await fs.mkdir(foundryModulesPath, { recursive: true });

  const existingPath = await getExistingPath(junctionPath);
  if (existingPath) {
    const resolvedTarget = await fs.realpath(junctionPath).catch(() => null);

    if (resolvedTarget && pathsMatch(resolvedTarget, repoRoot)) {
      globalThis.console.info(`Foundry module link already points to this repo: ${junctionPath}`);
      return;
    }

    throw new Error(
      `The path already exists and points somewhere else: ${junctionPath}\n` +
        "Remove it manually, or move the existing folder before re-running this script."
    );
  }

  await fs.symlink(repoRoot, junctionPath, "junction");
  globalThis.console.info(`Created Foundry junction:\n  ${junctionPath}\n-> ${repoRoot}`);
}

/**
 * Returns the path when it already exists, otherwise `null`.
 */
async function getExistingPath(targetPath) {
  try {
    await fs.lstat(targetPath);
    return targetPath;
  } catch (error) {
    if (isMissingPathError(error)) {
      return null;
    }

    throw error;
  }
}

/**
 * Normalizes paths for a stable comparison on Windows.
 */
function pathsMatch(leftPath, rightPath) {
  return path.resolve(leftPath).toLowerCase() === path.resolve(rightPath).toLowerCase();
}

/**
 * Checks whether an error means the path does not exist yet.
 */
function isMissingPathError(error) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

main().catch((error) => {
  globalThis.console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
