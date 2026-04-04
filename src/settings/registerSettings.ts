import { MilestonesSettingsApp } from "../applications/MilestonesSettingsApp";
import { MODULE_ID, SETTINGS_MENU_KEY } from "../constants";

/**
 * Registers the placeholder settings submenu that appears in Foundry's module settings UI.
 *
 * At runtime, Foundry exposes a global `game` singleton that acts as the main API
 * surface for the current client session. `game.settings.registerMenu(namespace, key, config)`
 * adds a button to the Configure Settings dialog. When that button is clicked,
 * Foundry instantiates the `type` class supplied below.
 *
 * The `(MODULE_ID, SETTINGS_MENU_KEY)` pair is the stable identifier for this menu,
 * much like a namespaced key in a typical application configuration system.
 */
export function registerSettingsMenu(): void {
  // This guard keeps tests and unusual boot timing from exploding if `game.settings`
  // is not ready yet.
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
