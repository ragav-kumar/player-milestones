/**
 * Keeps custom milestone row editing state mutually exclusive within one rendered tab panel.
 * When a new row enters edit mode, any other edited row is closed and its unsaved input values
 * are reset back to the last rendered state.
 */
export function beginExclusiveCustomItemEdit(root: ParentNode, nextRow: HTMLElement): void {
  root.querySelectorAll<HTMLElement>("[data-custom-item-row='true']").forEach((row) => {
    if (row === nextRow) {
      row.dataset.editing = "true";
      return;
    }

    discardCustomItemEdit(row);
  });
}

/**
 * Closes one custom milestone editor and restores its unsaved inputs to their last rendered values.
 */
export function discardCustomItemEdit(row: HTMLElement): void {
  row.dataset.editing = "false";

  row.querySelectorAll<HTMLInputElement>("[data-custom-title-input='true'], [data-custom-description-input='true']")
    .forEach((input) => {
      input.value = input.defaultValue;
    });
}
