import "./styles/player-milestones.css";

import { MODULE_ID } from "./constants";
import { registerMilestonesSheetIntegration } from "./dnd5e/registerMilestonesTab";
import { registerSettingsMenu } from "./settings/registerSettings";

/**
 * Main entrypoint for the Player Milestones module.
 * The first scaffold pass only registers a settings page and a placeholder sheet tab.
 */
Hooks.once("init", () => {
  console.info(`${MODULE_ID} | Initializing module scaffold.`);

  registerSettingsMenu();
  registerMilestonesSheetIntegration();
});
