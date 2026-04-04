import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { URL, fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const MODULE_ID = "player-milestones";
const repoRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDir = path.join(repoRoot, "release");
const outputFile = path.join(outputDir, `${MODULE_ID}.zip`);
const requiredEntries = ["module.json", "dist"];
const optionalEntries = ["templates", "styles", "lang", "packs", "assets"];

/**
 * Builds the Foundry-ready release zip used by the manifest download URL.
 *
 * The archive intentionally contains the runtime files at the zip root so Foundry can
 * install the module directly from GitHub releases.
 */
async function main() {
  const missingRequired = await findMissingEntries(requiredEntries);
  if (missingRequired.length > 0) {
    throw new Error(
      `Cannot create the release zip because these required paths are missing: ${missingRequired.join(", ")}\nRun \`npm run build\` first.`
    );
  }

  const entries = [...requiredEntries, ...(await findExistingEntries(optionalEntries))];
  const relativeOutputFile = path.relative(repoRoot, outputFile);

  await fs.mkdir(outputDir, { recursive: true });
  await fs.rm(outputFile, { force: true });

  await createZipArchive(relativeOutputFile, entries);

  globalThis.console.info(`Created Foundry release zip: ${outputFile}`);
  globalThis.console.info(`Included entries: ${entries.join(", ")}`);
}

async function createZipArchive(relativeOutputFile, entries) {
  try {
    await execFileAsync("tar", ["-a", "-cf", relativeOutputFile, ...entries], {
      cwd: repoRoot
    });
    return;
  } catch (error) {
    if (process.platform !== "win32") {
      throw error;
    }
  }

  const powershellEntries = entries
    .map((entry) => `'${entry.replaceAll("'", "''")}'`)
    .join(", ");
  const powershellOutputFile = relativeOutputFile.replaceAll("'", "''");

  await execFileAsync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `Compress-Archive -Path ${powershellEntries} -DestinationPath '${powershellOutputFile}' -Force`
    ],
    {
      cwd: repoRoot
    }
  );
}

async function findExistingEntries(entries) {
  const results = await Promise.all(entries.map(async (entry) => ((await pathExists(entry)) ? entry : null)));
  return results.filter((entry) => entry !== null);
}

async function findMissingEntries(entries) {
  const results = await Promise.all(entries.map(async (entry) => ((await pathExists(entry)) ? null : entry)));
  return results.filter((entry) => entry !== null);
}

async function pathExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

main().catch((error) => {
  globalThis.console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
