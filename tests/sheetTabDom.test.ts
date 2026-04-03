import { describe, expect, it } from "vitest";

import { injectMilestonesTab } from "../src/dnd5e/sheetTabDom";

/**
 * These tests cover the DOM helper that inserts the placeholder sheet tab.
 * They intentionally exist before the implementation so we can use a red/green loop.
 */
describe("injectMilestonesTab", () => {
  it("adds an M tab with the requested tooltip and placeholder content", () => {
    const root = document.createElement("section");
    root.innerHTML = `
      <nav class="sheet-tabs tabs" data-group="primary">
        <a class="item active" data-tab="details">Details</a>
      </nav>
      <section class="sheet-body">
        <div class="tab active" data-group="primary" data-tab="details">Details panel</div>
      </section>
    `;

    injectMilestonesTab(root);

    const tabButton = root.querySelector<HTMLElement>('nav [data-tab="milestones"]');
    const tabPanel = root.querySelector<HTMLElement>('.tab[data-tab="milestones"]');

    expect(tabButton?.textContent?.trim()).toBe("M");
    expect(tabButton?.getAttribute("title")).toBe("personal milestones");
    expect(tabPanel?.textContent).toContain("Milestones content will be added here later.");
  });

  it("does not create duplicate milestones tabs on repeated renders", () => {
    const root = document.createElement("section");
    root.innerHTML = `
      <nav class="sheet-tabs tabs" data-group="primary">
        <a class="item active" data-tab="details">Details</a>
      </nav>
      <section class="sheet-body">
        <div class="tab active" data-group="primary" data-tab="details">Details panel</div>
      </section>
    `;

    injectMilestonesTab(root);
    injectMilestonesTab(root);

    const allButtons = root.querySelectorAll('[data-player-milestones-tab="button"]');
    const allPanels = root.querySelectorAll('[data-player-milestones-tab="panel"]');

    expect(allButtons).toHaveLength(1);
    expect(allPanels).toHaveLength(1);
  });
});
