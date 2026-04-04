import "./styles/player-milestones.css";

import { MODULE_ID } from "./constants";
import { registerMilestonesSheetIntegration } from "./dnd5e/registerMilestonesTab";
import { registerSettingsMenu } from "./settings/registerSettings";

/**
 * Main entrypoint for the Player Milestones module.
 *
 * Foundry loads this file because `module.json` lists the built output in its
 * `esmodules` array. The global `Hooks` object is Foundry's application-wide event
 * bus, and `init` is the earliest lifecycle stage where a module should register
 * settings, sheet hooks, and other startup behavior that must exist before the UI
 * is fully available.
 */
Hooks.once("init", () => {
  console.info(`${MODULE_ID} | Initializing module scaffold.`);

  // Register module-owned configuration UI under Foundry's settings system.
  registerSettingsMenu();

  // Attach the character-sheet integration that will run whenever a dnd5e sheet renders.
  registerMilestonesSheetIntegration();
});
