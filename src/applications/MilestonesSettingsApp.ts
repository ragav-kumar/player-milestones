import { MODULE_ID } from "../constants";
import {
  addStandardMilestoneItem,
  addStandardMilestoneSection,
  createDefaultLevelCosts,
  createDefaultStandardMilestonesSettings,
  createLevelCostRows,
  getStandardMilestonesSettings,
  moveStandardMilestoneItem,
  moveStandardMilestoneSection,
  removeStandardMilestoneItem,
  removeStandardMilestoneSection,
  saveStandardMilestonesSettings,
  serializeStandardMilestonesFormData,
  type ReorderDirection,
  type StandardMilestone,
  type StandardMilestoneSection,
  type StandardMilestonesSettingsData
} from "../settings/standardMilestones";

/**
 * These classes come from Foundry itself at runtime rather than from a normal npm import.
 *
 * - `ApplicationV2` is Foundry v13's modern base class for windows/apps.
 * - `HandlebarsApplicationMixin` layers declarative Handlebars rendering on top of that base class.
 *
 * The fallback classes keep tests and non-Foundry environments from crashing when this module is imported.
 */
type FoundryApplicationClass = typeof foundry.applications.api.ApplicationV2;
type FoundryHandlebarsMixin = typeof foundry.applications.api.HandlebarsApplicationMixin;

class ApplicationV2Fallback {
  element: HTMLElement | null = null;

  render(): Promise<this> {
    return Promise.resolve(this);
  }

  protected _onRender(): Promise<void> {
    return Promise.resolve();
  }
}

const foundryApplicationApi = typeof foundry !== "undefined" ? foundry.applications.api : undefined;
const ApplicationV2 = (foundryApplicationApi?.ApplicationV2 ??
  ApplicationV2Fallback) as FoundryApplicationClass;
const HandlebarsApplicationMixin =
  (foundryApplicationApi?.HandlebarsApplicationMixin ??
    ((BaseClass: typeof ApplicationV2Fallback) => BaseClass)) as FoundryHandlebarsMixin;

interface MilestonesSettingsTemplateSection extends StandardMilestoneSection {
  index: number;
  isFirst: boolean;
  isLast: boolean;
  milestones: Array<StandardMilestone & { index: number; isFirst: boolean; isLast: boolean }>;
}

interface MilestonesSettingsContext extends Record<string, unknown> {
  topMatter: string;
  sections: MilestonesSettingsTemplateSection[];
  levelRows: Array<{ level: number; cost: number }>;
}

/**
 * ApplicationV2-based editor for the shared milestone defaults used across all PCs.
 *
 * The app keeps an in-memory draft so the user can add/remove/reorder entries without persisting
 * each click immediately. Pressing Save commits the normalized data into world-scoped Foundry settings.
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

  #draftSettings: StandardMilestonesSettingsData = createDefaultStandardMilestonesSettings();
  #hasLoadedSettings = false;
  #sectionsScrollTop = 0;

  protected override _prepareContext(_options: Record<string, unknown>): Promise<never> {
    void _options;

    if (!this.#hasLoadedSettings) {
      this.#draftSettings = getStandardMilestonesSettings();
      this.#hasLoadedSettings = true;
    }

    const context = {
      topMatter: this.#draftSettings.topMatter,
      sections: this.#draftSettings.sections.map((section, sectionIndex, allSections) => ({
        ...section,
        index: sectionIndex,
        isFirst: sectionIndex === 0,
        isLast: sectionIndex === allSections.length - 1,
        milestones: section.milestones.map((milestone, milestoneIndex, allMilestones) => ({
          ...milestone,
          index: milestoneIndex,
          isFirst: milestoneIndex === 0,
          isLast: milestoneIndex === allMilestones.length - 1
        }))
      })),
      levelRows: createLevelCostRows(this.#draftSettings.levelCosts)
    } satisfies MilestonesSettingsContext;

    return Promise.resolve(context as never);
  }

  protected override async _onRender(context: object, options: object): Promise<void> {
    await super._onRender(context as never, options as never);

    if (!(this.element instanceof HTMLElement)) {
      return;
    }

    const form = this.element.querySelector<HTMLFormElement>(
      "[data-player-milestones-settings-form]"
    );

    if (!form) {
      return;
    }

    form.addEventListener("submit", (event) => {
      void this.#onSubmit(event);
    });

    form.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
      button.addEventListener("click", (event: Event) => {
        void this.#onAction(event);
      });
    });

    const sectionsContainer = form.querySelector<HTMLElement>(".player-milestones-settings__sections");
    if (sectionsContainer) {
      sectionsContainer.scrollTop = this.#sectionsScrollTop;
    }
  }

  async #onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();

    if (!(event.currentTarget instanceof HTMLFormElement)) {
      return;
    }

    this.#draftSettings = serializeStandardMilestonesFormData(new FormData(event.currentTarget));
    await saveStandardMilestonesSettings(this.#draftSettings);

    if (typeof ui !== "undefined") {
      ui.notifications?.info("Player Milestones shared defaults saved.");
    }
  }

  async #onAction(event: Event): Promise<void> {
    event.preventDefault();

    if (!(event.currentTarget instanceof HTMLButtonElement)) {
      return;
    }

    const form = event.currentTarget.closest("form");
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    const sectionsContainer = form.querySelector<HTMLElement>(".player-milestones-settings__sections");
    this.#sectionsScrollTop = sectionsContainer?.scrollTop ?? 0;

    const snapshot = serializeStandardMilestonesFormData(new FormData(form), {
      keepEmptyRows: true
    });
    this.#draftSettings = applySettingsAction(
      snapshot,
      event.currentTarget.dataset.action ?? "",
      event.currentTarget.dataset
    );

    await this.render();
  }
}

function applySettingsAction(
  settings: StandardMilestonesSettingsData,
  action: string,
  dataset: DOMStringMap
): StandardMilestonesSettingsData {
  const sectionIndex = parseIndex(dataset.sectionIndex);
  const milestoneIndex = parseIndex(dataset.milestoneIndex);

  switch (action) {
    case "add-section":
      return {
        ...settings,
        sections: addStandardMilestoneSection(settings.sections)
      };

    case "remove-section":
      return sectionIndex === null
        ? settings
        : {
            ...settings,
            sections: removeStandardMilestoneSection(settings.sections, sectionIndex)
          };

    case "move-section-up":
      return reorderSection(settings, sectionIndex, "up");

    case "move-section-down":
      return reorderSection(settings, sectionIndex, "down");

    case "add-item":
      return sectionIndex === null
        ? settings
        : {
            ...settings,
            sections: addStandardMilestoneItem(settings.sections, sectionIndex)
          };

    case "remove-item":
      return sectionIndex === null || milestoneIndex === null
        ? settings
        : {
            ...settings,
            sections: removeStandardMilestoneItem(settings.sections, sectionIndex, milestoneIndex)
          };

    case "move-item-up":
      return reorderItem(settings, sectionIndex, milestoneIndex, "up");

    case "move-item-down":
      return reorderItem(settings, sectionIndex, milestoneIndex, "down");

    case "reset-level-costs":
      return {
        ...settings,
        levelCosts: createDefaultLevelCosts()
      };

    default:
      return settings;
  }
}

function reorderSection(
  settings: StandardMilestonesSettingsData,
  sectionIndex: number | null,
  direction: ReorderDirection
): StandardMilestonesSettingsData {
  if (sectionIndex === null) {
    return settings;
  }

  return {
    ...settings,
    sections: moveStandardMilestoneSection(settings.sections, sectionIndex, direction)
  };
}

function reorderItem(
  settings: StandardMilestonesSettingsData,
  sectionIndex: number | null,
  milestoneIndex: number | null,
  direction: ReorderDirection
): StandardMilestonesSettingsData {
  if (sectionIndex === null || milestoneIndex === null) {
    return settings;
  }

  return {
    ...settings,
    sections: moveStandardMilestoneItem(settings.sections, sectionIndex, milestoneIndex, direction)
  };
}

function parseIndex(value: string | undefined): number | null {
  if (typeof value !== "string" || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}
