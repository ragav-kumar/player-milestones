import { MODULE_ID } from "../constants";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Minimal ApplicationV2-based settings page used as a stable placeholder while
 * the milestone feature set is still being scaffolded.
 */
export class MilestonesSettingsApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static override DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-settings`,
    tag: "section",
    classes: [MODULE_ID, "player-milestones-settings"],
    window: {
      title: "Player Milestones Settings"
    }
  };

  static override PARTS = {
    content: {
      template: `modules/${MODULE_ID}/templates/settings-placeholder.hbs`
    }
  };
}
