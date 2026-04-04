import { describe, expect, it } from "vitest";

import { injectMilestonesTab } from "../src/dnd5e/sheetTabDom";

/**
 * These tests cover the DOM helper that inserts the milestones sheet tab shell.
 * They are good red/green tests because they exercise observable DOM behavior,
 * not static template or stylesheet strings.
 */
describe("injectMilestonesTab", () => {
  it("adds a trophy-icon tab with the requested tooltip and placeholder content", () => {
    // Arrange
    const root = document.createElement("section");
    root.innerHTML = `
      <nav class="sheet-tabs tabs" data-group="primary">
        <a class="item active" data-tab="details">Details</a>
      </nav>
      <section class="sheet-body">
        <div class="tab active" data-group="primary" data-tab="details">Details panel</div>
      </section>
    `;

    // Act
    injectMilestonesTab(root);

    const tabButton = root.querySelector<HTMLElement>('nav [data-tab="milestones"]');
    const tabPanel = root.querySelector<HTMLElement>('.tab[data-tab="milestones"]');

    // Assert
    expect(tabButton?.querySelector("i.fa-solid.fa-trophy")).not.toBeNull();
    expect(tabButton?.getAttribute("title")).toBe("Personal Milestones");
    expect(tabButton?.getAttribute("aria-label")).toBe("Personal Milestones");
    expect(tabPanel?.textContent).toContain("Loading personal milestones...");
  });

  it("supports the dnd5e v5 sidebar tab layout", () => {
    // Arrange
    const root = document.createElement("section");
    root.innerHTML = `
      <aside class="tabs tabs-right" data-group="primary">
        <a class="item active" data-tab="details">Details</a>
      </aside>
      <div class="tab-body" data-container-id="tabs">
        <section class="tab active" data-group="primary" data-tab="details">Details panel</section>
      </div>
    `;

    // Act
    const injected = injectMilestonesTab(root);

    const tabButton = root.querySelector<HTMLElement>('.tabs-right [data-tab="milestones"]');
    const tabPanel = root.querySelector<HTMLElement>('.tab-body .tab[data-tab="milestones"]');

    // Assert
    expect(injected).toBe(true);
    expect(tabButton?.querySelector("i.fa-solid.fa-trophy")).not.toBeNull();
    expect(tabButton?.getAttribute("title")).toBe("Personal Milestones");
    expect(tabPanel?.textContent).toContain("Loading personal milestones...");
  });

  it("prefers the inner tabs container when the sheet also has outer content wrappers", () => {
    // Arrange
    const root = document.createElement("section");
    root.innerHTML = `
      <section class="sheet-content">
        <aside class="tabs tabs-right" data-group="primary">
          <a class="item active" data-tab="details">Details</a>
        </aside>
        <section class="sheet-body">
          <div class="character-sidebar">Sidebar content</div>
          <div class="tab-body" data-container-id="tabs">
            <section class="tab active" data-group="primary" data-tab="details">Details panel</section>
          </div>
        </section>
      </section>
    `;

    // Act
    injectMilestonesTab(root);

    const tabsContainer = root.querySelector<HTMLElement>('[data-container-id="tabs"]');
    const directPanelParent = root.querySelector<HTMLElement>('[data-player-milestones-tab="panel"]')?.parentElement;

    // Assert
    expect(directPanelParent).toBe(tabsContainer);
    expect(root.querySelector('.sheet-body > [data-player-milestones-tab="panel"]')).toBeNull();
  });

  it("does not create duplicate milestones tabs on repeated renders", () => {
    // Arrange
    const root = document.createElement("section");
    root.innerHTML = `
      <nav class="sheet-tabs tabs" data-group="primary">
        <a class="item active" data-tab="details">Details</a>
      </nav>
      <section class="sheet-body">
        <div class="tab active" data-group="primary" data-tab="details">Details panel</div>
      </section>
    `;

    // Act
    injectMilestonesTab(root);
    injectMilestonesTab(root);

    const allButtons = root.querySelectorAll('[data-player-milestones-tab="button"]');
    const allPanels = root.querySelectorAll('[data-player-milestones-tab="panel"]');

    // Assert
    expect(allButtons).toHaveLength(1);
    expect(allPanels).toHaveLength(1);
  });
});
