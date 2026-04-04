import { describe, expect, it } from "vitest";

import {
  beginExclusiveCustomItemEdit,
  discardCustomItemEdit
} from "../src/dnd5e/customItemEditMode";

describe("custom item edit mode", () => {
  it("allows only one custom row to be edited at a time and discards unsaved values on the previous row", () => {
    // Arrange
    const panel = document.createElement("section");
    panel.innerHTML = `
      <div data-custom-add-row="true">
        <input type="text" value="Draft title" data-custom-add-title-input="true" />
        <input type="text" value="Draft description" data-custom-add-description-input="true" />
      </div>
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

    const firstTitleInput = firstRow.querySelector<HTMLInputElement>('[data-custom-title-input="true"]');
    const firstDescriptionInput = firstRow.querySelector<HTMLInputElement>(
      '[data-custom-description-input="true"]'
    );

    if (!firstTitleInput || !firstDescriptionInput) {
      throw new Error("Expected first-row editor inputs to exist.");
    }

    // Act
    beginExclusiveCustomItemEdit(panel, firstRow);
    firstTitleInput.value = "Unsaved title";
    firstDescriptionInput.value = "Unsaved description";
    beginExclusiveCustomItemEdit(panel, secondRow);

    const addTitleInput = panel.querySelector<HTMLInputElement>('[data-custom-add-title-input="true"]');
    const addDescriptionInput = panel.querySelector<HTMLInputElement>(
      '[data-custom-add-description-input="true"]'
    );

    // Assert
    expect(firstRow.dataset.editing).toBe("false");
    expect(secondRow.dataset.editing).toBe("true");
    expect(firstTitleInput.value).toBe("Alpha title");
    expect(firstDescriptionInput.value).toBe("Alpha description");
    expect(addTitleInput?.value).toBe("Draft title");
    expect(addDescriptionInput?.value).toBe("Draft description");
  });

  it("restores the last rendered values when a custom edit is cancelled", () => {
    // Arrange
    const row = document.createElement("div");
    row.dataset.customItemRow = "true";
    row.dataset.editing = "true";
    row.innerHTML = `
      <input type="text" value="Saved title" data-custom-title-input="true" />
      <input type="text" value="Saved description" data-custom-description-input="true" />
    `;

    const titleInput = row.querySelector<HTMLInputElement>('[data-custom-title-input="true"]');
    const descriptionInput = row.querySelector<HTMLInputElement>(
      '[data-custom-description-input="true"]'
    );

    if (!titleInput || !descriptionInput) {
      throw new Error("Expected custom editor inputs to exist.");
    }

    titleInput.value = "Unsaved title";
    descriptionInput.value = "Unsaved description";

    // Act
    discardCustomItemEdit(row);

    // Assert
    expect(row.dataset.editing).toBe("false");
    expect(titleInput.value).toBe("Saved title");
    expect(descriptionInput.value).toBe("Saved description");
  });
});
