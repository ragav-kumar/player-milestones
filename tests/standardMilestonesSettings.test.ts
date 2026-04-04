import { afterEach, describe, expect, it, vi } from "vitest";

import { MODULE_ID, SETTINGS_MENU_KEY } from "../src/constants";
import { registerSettingsMenu } from "../src/settings/registerSettings";
import {
  addStandardMilestoneItem,
  addStandardMilestoneSection,
  createDefaultLevelCosts,
  createDefaultStandardMilestonesSettings,
  moveStandardMilestoneItem,
  moveStandardMilestoneSection,
  normalizeStandardMilestonesSettings,
  removeStandardMilestoneItem,
  removeStandardMilestoneSection,
  serializeStandardMilestonesFormData
} from "../src/settings/standardMilestones";

const TOP_MATTER_SETTING_KEY = "sharedTopMatter";
const DEFAULT_MILESTONES_SETTING_KEY = "defaultMilestones";
const LEVEL_COSTS_SETTING_KEY = "levelCosts";

/**
 * Builds the requested default level cost map for levels 1 through 19.
 */
function expectedDefaultLevelCosts(): Record<string, number> {
  const defaults: Record<string, number> = {};

  for (let level = 1; level <= 19; level += 1) {
    defaults[String(level)] = level <= 3 ? 3 : level <= 10 ? 4 : 5;
  }

  return defaults;
}

describe("registerSettingsMenu", () => {
  const testGlobal = globalThis as typeof globalThis & { game?: unknown };
  const originalGame = testGlobal.game;

  afterEach(() => {
    Object.defineProperty(globalThis, "game", {
      value: originalGame,
      configurable: true,
      writable: true
    });

    vi.restoreAllMocks();
  });

  it("registers a GM-only menu plus hidden world settings for shared milestone defaults", () => {
    const registerMenu = vi.fn();
    const register = vi.fn();

    Object.defineProperty(globalThis, "game", {
      value: {
        settings: {
          registerMenu,
          register
        }
      },
      configurable: true,
      writable: true
    });

    registerSettingsMenu();

    expect(registerMenu).toHaveBeenCalledWith(
      MODULE_ID,
      SETTINGS_MENU_KEY,
      expect.objectContaining({
        restricted: true
      })
    );

    expect(register).toHaveBeenCalledTimes(3);
    expect(register).toHaveBeenCalledWith(
      MODULE_ID,
      TOP_MATTER_SETTING_KEY,
      expect.objectContaining({
        scope: "world",
        config: false,
        default: ""
      })
    );
    expect(register).toHaveBeenCalledWith(
      MODULE_ID,
      DEFAULT_MILESTONES_SETTING_KEY,
      expect.objectContaining({
        scope: "world",
        config: false,
        default: []
      })
    );
    expect(register).toHaveBeenCalledWith(
      MODULE_ID,
      LEVEL_COSTS_SETTING_KEY,
      expect.objectContaining({
        scope: "world",
        config: false,
        default: expectedDefaultLevelCosts()
      })
    );
  });
});

describe("standard milestone settings helpers", () => {
  it("returns the default editable settings shape", () => {
    expect(createDefaultStandardMilestonesSettings()).toEqual({
      topMatter: "",
      sections: [],
      levelCosts: expectedDefaultLevelCosts()
    });
  });

  it("returns the requested default level costs for every level from 1 to 19", () => {
    expect(createDefaultLevelCosts()).toEqual(expectedDefaultLevelCosts());
  });

  it("normalizes invalid top matter to an empty string", () => {
    const normalized = normalizeStandardMilestonesSettings({
      topMatter: { bad: true },
      sections: [],
      levelCosts: expectedDefaultLevelCosts()
    });

    expect(normalized.topMatter).toBe("");
  });

  it("normalizes malformed stored settings into a safe editable shape", () => {
    const normalized = normalizeStandardMilestonesSettings({
      topMatter: 42,
      sections: [
        {
          id: "kept-section",
          name: "",
          milestones: [
            { id: "kept-milestone", name: "First Goal", description: 9 },
            { bogus: true }
          ]
        },
        "bad-row"
      ],
      levelCosts: {
        1: "7",
        2: null,
        19: -3
      }
    });

    expect(normalized.topMatter).toBe("");
    expect(normalized.sections).toHaveLength(1);
    expect(normalized.sections[0]).toMatchObject({
      id: "kept-section",
      name: "",
      milestones: [{ id: "kept-milestone", name: "First Goal", description: "" }]
    });
    expect(normalized.levelCosts["1"]).toBe(7);
    expect(normalized.levelCosts["2"]).toBe(3);
    expect(normalized.levelCosts["19"]).toBe(5);
  });

  it("reorders entire sections with move up and move down actions", () => {
    const movedUp = moveStandardMilestoneSection(
      [
        { id: "combat", name: "Combat", milestones: [] },
        { id: "social", name: "Social", milestones: [] },
        { id: "exploration", name: "Exploration", milestones: [] }
      ],
      2,
      "up"
    );

    const movedDown = moveStandardMilestoneSection(movedUp, 1, "down");

    expect(movedUp.map((section: { id: string }) => section.id)).toEqual([
      "combat",
      "exploration",
      "social"
    ]);
    expect(movedDown.map((section: { id: string }) => section.id)).toEqual([
      "combat",
      "social",
      "exploration"
    ]);
  });

  it("reorders milestone items within a section with move up and move down actions", () => {
    const sections = [
      {
        id: "combat",
        name: "Combat",
        milestones: [
          {
            id: "narration",
            name: "Narrate Your Fighting Style",
            description: "Use narration during combat to show how your character fights."
          },
          {
            id: "spellbook",
            name: "Use Your Full Kit",
            description: "Cast every one of your spells and spell-like features at least once."
          },
          {
            id: "social-turn",
            name: "Speak a Hard Truth",
            description: "Address a truth, secret, or personal belief in conversation."
          }
        ]
      }
    ];

    const movedUp = moveStandardMilestoneItem(sections, 0, 2, "up");
    const movedDown = moveStandardMilestoneItem(movedUp, 0, 1, "down");

    const movedUpSection = movedUp[0];
    const movedDownSection = movedDown[0];

    expect(movedUpSection?.milestones.map((milestone: { id: string }) => milestone.id)).toEqual([
      "narration",
      "social-turn",
      "spellbook"
    ]);
    expect(movedDownSection?.milestones.map((milestone: { id: string }) => milestone.id)).toEqual([
      "narration",
      "spellbook",
      "social-turn"
    ]);
  });

  it("inserts and removes whole sections without disturbing the remaining order", () => {
    const inserted = addStandardMilestoneSection([
      { id: "combat", name: "Combat", milestones: [] },
      { id: "social", name: "Social", milestones: [] }
    ]);

    expect(inserted).toHaveLength(3);
    expect(inserted[2]).toMatchObject({
      name: "",
      milestones: []
    });

    const removed = removeStandardMilestoneSection(inserted, 1);

    const insertedSection = inserted[2];

    expect(removed.map((section: { id: string }) => section.id)).toEqual([
      "combat",
      insertedSection?.id
    ]);
  });

  it("inserts and removes milestone rows within a section without disturbing the others", () => {
    const sections = [
      {
        id: "social",
        name: "Social",
        milestones: [
          {
            id: "opinion",
            name: "Change the Room",
            description: "Shift an NPC’s opinion of you or your group — positively or negatively."
          }
        ]
      }
    ];

    const inserted = addStandardMilestoneItem(sections, 0);

    const insertedSection = inserted[0];

    expect(insertedSection?.milestones).toHaveLength(2);
    expect(insertedSection?.milestones[1]).toMatchObject({
      name: "",
      description: ""
    });

    const removed = removeStandardMilestoneItem(inserted, 0, 0);
    const removedSection = removed[0];

    expect(removedSection?.milestones).toHaveLength(1);
    expect(removedSection?.milestones[0]?.id).toBe(insertedSection?.milestones[1]?.id);
  });

  it("serializes edits to section names, milestone fields, and level cost values from form data", () => {
    const formData = new FormData();
    formData.set("topMatter", "<p>Shared intro with @UUID[Compendium.dnd5e.items.Item.abc]{linked item}</p>");
    formData.set("sections.0.id", "combat");
    formData.set("sections.0.name", "Combat");
    formData.set("sections.0.milestones.0.id", "narration");
    formData.set("sections.0.milestones.0.name", "Show Your Fighting Style");
    formData.set(
      "sections.0.milestones.0.description",
      "Use narration during combat to show how your character fights."
    );
    formData.set("sections.0.milestones.1.id", "spellbook");
    formData.set("sections.0.milestones.1.name", "Cast Everything Once");
    formData.set(
      "sections.0.milestones.1.description",
      "Cast every one of your spells and spell-like features at least once."
    );
    formData.set("sections.1.id", "social");
    formData.set("sections.1.name", "Social");
    formData.set("sections.1.milestones.0.id", "opinion");
    formData.set("sections.1.milestones.0.name", "Change the Room");
    formData.set(
      "sections.1.milestones.0.description",
      "Shift an NPC’s opinion of you or your group — positively or negatively."
    );
    formData.set("sections.1.milestones.1.id", "truth");
    formData.set("sections.1.milestones.1.name", "Say Something Real");
    formData.set(
      "sections.1.milestones.1.description",
      "Address a truth, secret, or personal belief in conversation."
    );
    formData.set("levelCosts.1", "7");
    formData.set("levelCosts.4", "8");
    formData.set("levelCosts.19", "12");

    const serialized = serializeStandardMilestonesFormData(formData);

    expect(serialized.topMatter).toContain("@UUID[");
    expect(serialized.sections).toEqual([
      {
        id: "combat",
        name: "Combat",
        milestones: [
          {
            id: "narration",
            name: "Show Your Fighting Style",
            description: "Use narration during combat to show how your character fights."
          },
          {
            id: "spellbook",
            name: "Cast Everything Once",
            description: "Cast every one of your spells and spell-like features at least once."
          }
        ]
      },
      {
        id: "social",
        name: "Social",
        milestones: [
          {
            id: "opinion",
            name: "Change the Room",
            description: "Shift an NPC’s opinion of you or your group — positively or negatively."
          },
          {
            id: "truth",
            name: "Say Something Real",
            description: "Address a truth, secret, or personal belief in conversation."
          }
        ]
      }
    ]);
    expect(serialized.levelCosts["1"]).toBe(7);
    expect(serialized.levelCosts["4"]).toBe(8);
    expect(serialized.levelCosts["19"]).toBe(12);
  });
});
