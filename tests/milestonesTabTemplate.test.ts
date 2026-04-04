import { afterEach, describe, expect, it } from "vitest";

import {
  SETTINGS_DEFAULT_MILESTONES_KEY,
  SETTINGS_LEVEL_COSTS_KEY,
  SETTINGS_SHARED_TOP_MATTER_KEY
} from "../src/constants";
import type { ActorFlagLike, ActorMilestonesState } from "../src/dnd5e/actorMilestones";
import { renderMilestonesTab } from "../src/dnd5e/renderMilestonesTab";
import type { StandardMilestonesSettingsData } from "../src/settings/standardMilestones";

const testGlobal = globalThis as typeof globalThis & {
  game?: unknown;
  foundry?: unknown;
};
const originalGame = testGlobal.game;
const originalFoundry = testGlobal.foundry;

function createSettingsFixture(): StandardMilestonesSettingsData {
  return {
    topMatter: "<p>Shared milestone guidance.</p>",
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

function createActorStateFixture(
  progress: Partial<ActorMilestonesState["progress"]> = {}
): ActorMilestonesState {
  return {
    sections: {
      combat: {
        checked: {
          narration: true
        },
        customItems: [
          {
            id: "custom-1",
            title: "Call for surrender",
            description: "Offer the enemy a last chance to stand down.",
            checked: false
          }
        ]
      }
    },
    progress: {
      current: progress.current ?? 2,
      targetCost: progress.targetCost ?? 3
    }
  };
}

class RenderTestActor implements ActorFlagLike {
  #storedValue: unknown;
  #canOwnerToggle: boolean;

  system = {
    attributes: {
      inspiration: false
    },
    details: {
      level: 3
    }
  };

  constructor(storedValue: unknown, canOwnerToggle = false) {
    this.#storedValue = storedValue;
    this.#canOwnerToggle = canOwnerToggle;
  }

  getFlag(scope: string, key: string): unknown {
    void scope;
    void key;
    return this.#storedValue;
  }

  setFlag(scope: string, key: string, value: unknown): Promise<unknown> {
    void scope;
    void key;
    this.#storedValue = value;
    return Promise.resolve(this.#storedValue);
  }

  testUserPermission(user: unknown, permission: string): boolean {
    void user;
    return permission === "OWNER" && this.#canOwnerToggle;
  }
}

afterEach(() => {
  Object.defineProperty(globalThis, "game", {
    value: originalGame,
    configurable: true,
    writable: true
  });

  Object.defineProperty(globalThis, "foundry", {
    value: originalFoundry,
    configurable: true,
    writable: true
  });
});

function setGameFixture(settings: StandardMilestonesSettingsData, isGM: boolean): void {
  Object.defineProperty(globalThis, "game", {
    value: {
      user: {
        isGM
      },
      settings: {
        get: (_scope: string, key: string): unknown => {
          switch (key) {
            case SETTINGS_SHARED_TOP_MATTER_KEY:
              return settings.topMatter;
            case SETTINGS_DEFAULT_MILESTONES_KEY:
              return settings.sections;
            case SETTINGS_LEVEL_COSTS_KEY:
              return settings.levelCosts;
            default:
              return undefined;
          }
        }
      }
    },
    configurable: true,
    writable: true
  });

  Object.defineProperty(globalThis, "foundry", {
    value: undefined,
    configurable: true,
    writable: true
  });
}

async function renderPanelFixture(options: {
  isGM: boolean;
  actorState?: ActorMilestonesState;
  isEditable?: boolean;
  isOwner?: boolean;
  canOwnerToggle?: boolean;
}): Promise<HTMLElement> {
  const settings = createSettingsFixture();
  setGameFixture(settings, options.isGM);

  const actor = new RenderTestActor(
    options.actorState ?? createActorStateFixture(),
    options.canOwnerToggle ?? false
  );
  const root = document.createElement("section");
  root.innerHTML = '<section data-player-milestones-tab="panel"></section>';

  await renderMilestonesTab(
    {
      actor,
      isEditable: options.isEditable ?? false,
      isOwner: options.isOwner ?? false
    },
    root
  );

  const panel = root.querySelector<HTMLElement>('[data-player-milestones-tab="panel"]');
  if (!panel) {
    throw new Error("Expected the milestones panel to exist.");
  }

  return panel;
}

describe("milestones tab rendering behavior", () => {
  it("gates custom milestone management controls behind the GM-only flag", async () => {
    // Arrange
    const actorState = createActorStateFixture();

    // Act
    const playerPanel = await renderPanelFixture({
      isGM: false,
      actorState,
      canOwnerToggle: false
    });
    const gmPanel = await renderPanelFixture({
      isGM: true,
      actorState
    });

    // Assert
    expect(playerPanel.querySelector('[data-action="add-custom-item"]')).toBeNull();
    expect(playerPanel.querySelector('[data-action="edit-custom-item"]')).toBeNull();
    expect(playerPanel.querySelector('[data-action="remove-custom-item"]')).toBeNull();
    expect(gmPanel.querySelector('[data-action="add-custom-item"]')).not.toBeNull();
    expect(gmPanel.querySelector('[data-action="edit-custom-item"]')).not.toBeNull();
    expect(gmPanel.querySelector('[data-action="remove-custom-item"]')).not.toBeNull();
  });

  it("disables milestone checkboxes when the viewer cannot update progress", async () => {
    // Arrange
    const actorState = createActorStateFixture();

    // Act
    const panel = await renderPanelFixture({
      isGM: false,
      actorState,
      isEditable: false,
      isOwner: false,
      canOwnerToggle: false
    });
    const milestoneCheckboxes = Array.from(
      panel.querySelectorAll<HTMLInputElement>('[data-milestone-checkbox="true"]')
    );

    // Assert
    expect(milestoneCheckboxes.length).toBeGreaterThan(0);
    expect(milestoneCheckboxes.every((checkbox) => checkbox.disabled)).toBe(true);
    expect(panel.querySelector<HTMLButtonElement>('[data-action="level-up"]')?.disabled).toBe(true);
  });

  it("shows custom item descriptions even in the read-only non-GM view", async () => {
    // Arrange
    const actorState = createActorStateFixture();

    // Act
    const panel = await renderPanelFixture({
      isGM: false,
      actorState,
      canOwnerToggle: false
    });
    const descriptions = Array.from(
      panel.querySelectorAll<HTMLElement>(".player-milestones-tab__description")
    );

    // Assert
    expect(descriptions.map((description) => description.textContent?.trim())).toContain(
      "Offer the enemy a last chance to stand down."
    );
  });

  it("renders a next-level progress tracker with the actor's current and target values", async () => {
    // Arrange
    const actorState = createActorStateFixture({
      current: 2,
      targetCost: 3
    });

    // Act
    const panel = await renderPanelFixture({
      isGM: false,
      actorState,
      canOwnerToggle: true
    });
    const progressTracker = panel.querySelector<HTMLElement>('[data-milestones-progress="true"]');
    const normalizedProgressText = progressTracker?.textContent?.replace(/\s+/g, " ").trim();

    // Assert
    expect(panel.querySelector("h3")?.textContent).toBe("Personal Milestones");
    expect(progressTracker).not.toBeNull();
    expect(normalizedProgressText).toContain("2 / 3");
    expect(panel.querySelector('[data-action="level-up"]')).not.toBeNull();
  });

  it("makes the current progress editable only for GMs and shows a ready-to-level indicator", async () => {
    // Arrange
    const readyState = createActorStateFixture({
      current: 3,
      targetCost: 3
    });

    // Act
    const gmPanel = await renderPanelFixture({
      isGM: true,
      actorState: readyState
    });
    const playerPanel = await renderPanelFixture({
      isGM: false,
      actorState: readyState,
      canOwnerToggle: true
    });

    // Assert
    expect(gmPanel.querySelector('[data-progress-current-input="true"]')).not.toBeNull();
    expect(playerPanel.querySelector('[data-progress-current-input="true"]')).toBeNull();
    expect(gmPanel.textContent).toContain("Ready to level up");
  });
});
