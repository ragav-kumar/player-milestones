import { describe, expect, it } from "vitest";

import { beginExclusiveCustomItemEdit } from "../src/dnd5e/customItemEditMode";

describe("custom item edit mode", () => {
  it("allows only one custom row to be edited at a time and discards unsaved values on the previous row", () => {
    const panel = document.createElement("section");
    panel.innerHTML = `
      <div data-custom-item-row="true" data-item-id="alpha" data-editing="false">
        <div class="player-milestones-tab__custom-editor">
          <input type="text" value="Alpha title" data-custom-title-input="true" />
          <input type="text" value="Alpha description" data-custom-description-input="true" />
        </div>
      </div>
      <div data-custom-item-row="true" data-item-id="beta" data-editing="false">
        <div class="player-milestones-tab__custom-editor">
          <input type="text" value="Beta title" data-custom-title-input="true" />
          <input type="text" value="Beta description" data-custom-description-input="true" />
        </div>
      </div>
    `;

    const firstRow = panel.querySelector<HTMLElement>('[data-item-id="alpha"]');
    const secondRow = panel.querySelector<HTMLElement>('[data-item-id="beta"]');

    if (!firstRow || !secondRow) {
      throw new Error("Expected both custom item rows to exist.");
    }

    beginExclusiveCustomItemEdit(panel, firstRow);
    expect(firstRow.dataset.editing).toBe("true");
    expect(secondRow.dataset.editing).toBe("false");

    const firstTitleInput = firstRow.querySelector<HTMLInputElement>('[data-custom-title-input="true"]');
    const firstDescriptionInput = firstRow.querySelector<HTMLInputElement>(
      '[data-custom-description-input="true"]'
    );

    if (!firstTitleInput || !firstDescriptionInput) {
      throw new Error("Expected first-row editor inputs to exist.");
    }

    firstTitleInput.value = "Unsaved title";
    firstDescriptionInput.value = "Unsaved description";

    beginExclusiveCustomItemEdit(panel, secondRow);

    expect(firstRow.dataset.editing).toBe("false");
    expect(secondRow.dataset.editing).toBe("true");
    expect(firstTitleInput.value).toBe("Alpha title");
    expect(firstDescriptionInput.value).toBe("Alpha description");
  });
});
