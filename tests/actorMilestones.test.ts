import { describe, expect, it } from "vitest";

import {
  adjustMilestoneProgress,
  applyLevelCostToProgress,
  buildMilestonesTabData,
  normalizeActorMilestonesState,
  removeCustomMilestone,
  setMilestoneChecked,
  setMilestoneProgressCurrent,
  upsertCustomMilestone,
  type ActorMilestonesState
} from "../src/dnd5e/actorMilestones";
import type { StandardMilestonesSettingsData } from "../src/settings/standardMilestones";

function createSettingsFixture(): StandardMilestonesSettingsData {
  return {
    topMatter:
      "<p>Shared intro with @UUID[Compendium.dnd5e.items.Item.abc]{linked item}</p>",
    sections: [
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
            id: "truth",
            name: "Say Something Real",
            description: "Address a truth, secret, or personal belief in conversation."
          }
        ]
      }
    ],
    levelCosts: {
      "1": 3,
      "2": 3,
      "3": 3,
      "4": 4,
      "5": 4,
      "6": 4,
      "7": 4,
      "8": 4,
      "9": 4,
      "10": 4,
      "11": 5,
      "12": 5,
      "13": 5,
      "14": 5,
      "15": 5,
      "16": 5,
      "17": 5,
      "18": 5,
      "19": 5
    }
  };
}

describe("actor milestone state", () => {
  it("keeps progress by stable ids, defaults new shared items to unchecked, and prunes deleted data", () => {
    // Arrange
    const settings = createSettingsFixture();

    const previousActorState = {
      sections: {
        combat: {
          checked: {
            spellbook: true,
            removed: true
          },
          customItems: [
            {
              id: "custom-1",
              title: "Bring spare torches",
              description: "Keep an extra light source ready for cave travel.",
              checked: true
            }
          ]
        },
        removedSection: {
          checked: {
            ghost: true
          },
          customItems: [
            {
              id: "custom-ghost",
              title: "Should disappear",
              description: "",
              checked: false
            }
          ]
        }
      },
      progress: {
        current: 0,
        targetCost: 3
      }
    } satisfies ActorMilestonesState;

    // Act
    const normalized = normalizeActorMilestonesState(previousActorState, settings);
    const tabData = buildMilestonesTabData(settings, normalized);

    // Assert
    expect(normalized).toEqual({
      sections: {
        combat: {
          checked: {
            spellbook: true
          },
          customItems: [
            {
              id: "custom-1",
              title: "Bring spare torches",
              description: "Keep an extra light source ready for cave travel.",
              checked: true
            }
          ]
        },
        social: {
          checked: {},
          customItems: []
        }
      },
      progress: {
        current: 0,
        targetCost: 3
      }
    });

    expect(tabData.topMatter).toContain("@UUID[");
    expect(tabData.sections[0]?.items).toEqual([
      {
        id: "narration",
        label: "Show Your Fighting Style",
        description: "Use narration during combat to show how your character fights.",
        checked: false,
        isCustom: false
      },
      {
        id: "spellbook",
        label: "Cast Everything Once",
        description: "Cast every one of your spells and spell-like features at least once.",
        checked: true,
        isCustom: false
      },
      {
        id: "custom-1",
        label: "Bring spare torches",
        description: "Keep an extra light source ready for cave travel.",
        checked: true,
        isCustom: true
      }
    ]);
  });

  it("tracks next-level progress, supports GM overrides, and resets to zero whenever Level up is applied", () => {
    // Arrange
    const settings = createSettingsFixture();

    // Act
    const initial = normalizeActorMilestonesState(undefined, settings);

    // Assert
    expect(initial.progress).toEqual({
      current: 0,
      targetCost: 3
    });

    const gainedTwo = adjustMilestoneProgress(initial, 2);
    expect(gainedTwo.progress).toEqual({
      current: 2,
      targetCost: 3
    });

    const manuallyAdjusted = setMilestoneProgressCurrent(gainedTwo, 7);
    expect(manuallyAdjusted.progress).toEqual({
      current: 7,
      targetCost: 3
    });

    const sameCost = applyLevelCostToProgress(manuallyAdjusted, 3);
    expect(sameCost.progress).toEqual({
      current: 0,
      targetCost: 3
    });

    const newCost = applyLevelCostToProgress(manuallyAdjusted, 4);
    expect(newCost.progress).toEqual({
      current: 0,
      targetCost: 4
    });

    const floored = adjustMilestoneProgress(newCost, -99);
    expect(floored.progress.current).toBe(0);
  });

  it("adds, edits, toggles, and removes custom items within a section", () => {
    // Arrange
    const settings = createSettingsFixture();
    const initial = normalizeActorMilestonesState(undefined, settings);

    // Act
    const rejected = upsertCustomMilestone(initial, {
      sectionId: "combat",
      title: "Call out the enemy captain",
      description: ""
    });
    const added = upsertCustomMilestone(initial, {
      sectionId: "combat",
      title: "Call out the enemy captain",
      description: "Challenge the strongest foe in front of the party."
    });

    expect(added.sections.combat?.customItems).toHaveLength(1);

    const customId = added.sections.combat?.customItems[0]?.id;
    expect(customId).toBeTruthy();

    const edited = upsertCustomMilestone(added, {
      sectionId: "combat",
      itemId: customId ?? "",
      title: "Call out the enemy champion",
      description: "Single out the toughest foe and draw their attention."
    });
    const toggled = setMilestoneChecked(edited, {
      sectionId: "combat",
      itemId: customId ?? "",
      checked: true,
      isCustom: true
    });
    const removed = removeCustomMilestone(toggled, {
      sectionId: "combat",
      itemId: customId ?? ""
    });

    // Assert
    expect(rejected.sections.combat?.customItems).toEqual([]);
    expect(edited.sections.combat?.customItems[0]?.title).toBe("Call out the enemy champion");
    expect(edited.sections.combat?.customItems[0]?.description).toBe(
      "Single out the toughest foe and draw their attention."
    );
    expect(toggled.sections.combat?.customItems[0]?.checked).toBe(true);
    expect(removed.sections.combat?.customItems).toEqual([]);
  });

  it("preserves checked state when shared sections and items are renamed or reordered", () => {
    // Arrange
    const originalSettings = createSettingsFixture();

    // Act
    const state = setMilestoneChecked(normalizeActorMilestonesState(undefined, originalSettings), {
      sectionId: "combat",
      itemId: "narration",
      checked: true,
      isCustom: false
    });

    const updatedSettings: StandardMilestonesSettingsData = {
      ...originalSettings,
      sections: [
        {
          id: "social",
          name: "Conversations",
          milestones: [
            {
              id: "truth",
              name: "Speak a Hard Truth",
              description: "Address a difficult truth, secret, or personal belief in conversation."
            }
          ]
        },
        {
          id: "combat",
          name: "Battlecraft",
          milestones: [
            {
              id: "spellbook",
              name: "Cast Everything Once",
              description: "Cast every one of your spells and spell-like features at least once."
            },
            {
              id: "narration",
              name: "Narrate Your Fighting Style",
              description: "Use narration during combat to show how your character fights."
            }
          ]
        }
      ]
    };

    const tabData = buildMilestonesTabData(updatedSettings, state);
    const combatSection = tabData.sections.find((section) => section.id === "combat");

    // Assert
    expect(combatSection?.name).toBe("Battlecraft");
    expect(combatSection?.items[1]).toEqual({
      id: "narration",
      label: "Narrate Your Fighting Style",
      description: "Use narration during combat to show how your character fights.",
      checked: true,
      isCustom: false
    });
  });
});
