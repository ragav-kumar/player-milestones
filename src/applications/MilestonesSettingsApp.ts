import { MODULE_ID } from "../constants";

/**
 * These classes come from Foundry itself at runtime rather than from a normal npm import.
 *
 * - `ApplicationV2` is Foundry v13's modern base class for windows/apps.
 * - `HandlebarsApplicationMixin` layers declarative Handlebars rendering on top of that base class.
 *
 * If you come from React/Vue, the closest analogy is a stateful window class whose UI is defined by
 * static metadata plus a Handlebars template instead of JSX/components.
 */
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Minimal ApplicationV2-based settings page used as a stable placeholder while
 * the milestone feature set is still being scaffolded.
 *
 * In Foundry, an app/window is usually configured by static properties:
 * - `DEFAULT_OPTIONS` controls the outer shell: id, CSS classes, HTML tag, and window title.
 * - `PARTS` tells the Handlebars mixin which template(s) to render into the app body.
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
