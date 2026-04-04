import { describe, expect, it } from "vitest";

import {
  normalizeActorMilestonesState,
  setMilestoneChecked
} from "../src/dnd5e/actorMilestones";
import type { StandardMilestonesSettingsData } from "../src/settings/standardMilestones";

function createSettingsFixture(): StandardMilestonesSettingsData {
  return {
    topMatter: "",
    sections: [
      {
        id: "combat",
        name: "Combat",
        milestones: [
          {
            id: "narration",
            name: "Show Your Fighting Style",
            description: "Use narration during combat to show how your character fights."
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

describe("shared milestone toggle behavior", () => {
  it("allows a previously checked shared milestone to be unchecked again", () => {
    const settings = createSettingsFixture();
    const initial = normalizeActorMilestonesState(undefined, settings);

    const checked = setMilestoneChecked(initial, {
      sectionId: "combat",
      itemId: "narration",
      checked: true,
      isCustom: false
    });
    const unchecked = setMilestoneChecked(checked, {
      sectionId: "combat",
      itemId: "narration",
      checked: false,
      isCustom: false
    });

    expect(checked.sections.combat?.checked).toEqual({ narration: true });
    expect(unchecked.sections.combat?.checked).toEqual({});
  });
});
