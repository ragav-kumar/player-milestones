import { MilestonesSettingsApp } from "../applications/MilestonesSettingsApp";
import {
  MODULE_ID,
  SETTINGS_DEFAULT_MILESTONES_KEY,
  SETTINGS_LEVEL_COSTS_KEY,
  SETTINGS_MENU_KEY,
  SETTINGS_SHARED_TOP_MATTER_KEY
} from "../constants";
import { createDefaultLevelCosts } from "./standardMilestones";

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
  const settings = game.settings;
  if (!settings) {
    console.warn(`${MODULE_ID} | game.settings is unavailable during initialization.`);
    return;
  }

  registerSharedMilestoneSettings(settings);

  settings.registerMenu(MODULE_ID as never, SETTINGS_MENU_KEY, {
    name: "Player Milestones",
    label: "Open Settings",
    hint: "Configure the shared milestone defaults used across all player characters.",
    icon: "fa-solid fa-flag",
    type: MilestonesSettingsApp,
    restricted: true
  });
}

/**
 * Registers the hidden world-scoped values that back the shared milestone settings UI.
 */
function registerSharedMilestoneSettings(settings: ClientSettings): void {
  const registerSetting = settings.register.bind(settings) as (
    namespace: string,
    key: string,
    data: object
  ) => void;

  registerSetting(MODULE_ID, SETTINGS_SHARED_TOP_MATTER_KEY, {
    name: "Shared Top Matter",
    hint: "Stored rich text shown above the shared milestones tab content.",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  registerSetting(MODULE_ID, SETTINGS_DEFAULT_MILESTONES_KEY, {
    name: "Default Milestones",
    hint: "Stored section and milestone defaults shared by all PCs.",
    scope: "world",
    config: false,
    type: Object,
    default: []
  });

  registerSetting(MODULE_ID, SETTINGS_LEVEL_COSTS_KEY, {
    name: "Level Costs",
    hint: "Stored per-level milestone costs shared by all PCs.",
    scope: "world",
    config: false,
    type: Object,
    default: createDefaultLevelCosts()
  });
}
