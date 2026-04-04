import { describe, expect, it } from "vitest";

import {
  adjustMilestoneProgress,
  getActorMilestonesState,
  saveActorMilestonesState,
  setMilestoneChecked,
  type ActorFlagLike
} from "../src/dnd5e/actorMilestones";
import { grantActorInspirationIfMissing } from "../src/dnd5e/renderMilestonesTab";
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

class MergeStyleFlagActor implements ActorFlagLike {
  #storedValue: unknown;

  getFlag(scope: string, key: string): unknown {
    void scope;
    void key;
    return this.#storedValue;
  }

  setFlag(scope: string, key: string, value: unknown): Promise<unknown> {
    void scope;
    void key;
    this.#storedValue = deepMerge(this.#storedValue, value);
    return Promise.resolve(this.#storedValue);
  }

}

class InspirationFlagActor extends MergeStyleFlagActor {
  system = {
    attributes: {
      inspiration: false
    }
  };

  updateCalls: Array<Record<string, unknown>> = [];

  update(data: Record<string, unknown>): Promise<unknown> {
    this.updateCalls.push(data);
    this.system.attributes.inspiration = true;
    return Promise.resolve(data);
  }
}

describe("shared milestone toggle persistence", () => {
  it("fully replaces the persisted flag so a shared milestone can be unchecked again", async () => {
    const settings = createSettingsFixture();
    const actor = new MergeStyleFlagActor();

    const checked = setMilestoneChecked(getActorMilestonesState(actor, settings), {
      sectionId: "combat",
      itemId: "narration",
      checked: true,
      isCustom: false
    });
    await saveActorMilestonesState(actor, checked);

    const unchecked = setMilestoneChecked(getActorMilestonesState(actor, settings), {
      sectionId: "combat",
      itemId: "narration",
      checked: false,
      isCustom: false
    });
    await saveActorMilestonesState(actor, unchecked);

    expect(getActorMilestonesState(actor, settings).sections.combat?.checked).toEqual({
      narration: false
    });
  });

  it("tracks the current milestone counter as items are checked and unchecked", async () => {
    const settings = createSettingsFixture();
    const actor = new MergeStyleFlagActor();

    const checked = adjustMilestoneProgress(
      setMilestoneChecked(getActorMilestonesState(actor, settings), {
        sectionId: "combat",
        itemId: "narration",
        checked: true,
        isCustom: false
      }),
      1
    );
    await saveActorMilestonesState(actor, checked);

    expect(getActorMilestonesState(actor, settings).progress.current).toBe(1);

    const unchecked = adjustMilestoneProgress(
      setMilestoneChecked(getActorMilestonesState(actor, settings), {
        sectionId: "combat",
        itemId: "narration",
        checked: false,
        isCustom: false
      }),
      -1
    );
    await saveActorMilestonesState(actor, unchecked);

    expect(getActorMilestonesState(actor, settings).progress.current).toBe(0);
  });

  it("grants inspiration only when the actor does not already have it", async () => {
    const actor = new InspirationFlagActor();

    await grantActorInspirationIfMissing(actor);
    await grantActorInspirationIfMissing(actor);

    expect(actor.updateCalls).toEqual([{ "system.attributes.inspiration": true }]);
  });
});

function deepMerge(current: unknown, incoming: unknown): unknown {
  if (!isRecord(current) || !isRecord(incoming)) {
    return incoming;
  }

  const merged: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(incoming)) {
    merged[key] = deepMerge(merged[key], value);
  }

  return merged;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
