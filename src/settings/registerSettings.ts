import { MilestonesSettingsApp } from "../applications/MilestonesSettingsApp";
import { MODULE_ID, SETTINGS_MENU_KEY } from "../constants";

/**
 * Registers the placeholder settings submenu that appears in Foundry's module settings UI.
 */
export function registerSettingsMenu(): void {
  if (!game.settings) {
    console.warn(`${MODULE_ID} | game.settings is unavailable during initialization.`);
    return;
  }

  game.settings.registerMenu(MODULE_ID, SETTINGS_MENU_KEY, {
    name: "Player Milestones",
    label: "Open Settings",
    hint: "Open the placeholder settings page for the Player Milestones module.",
    icon: "fa-solid fa-flag",
    type: MilestonesSettingsApp,
    restricted: false
  });
}
