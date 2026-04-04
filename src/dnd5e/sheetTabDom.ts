import {
  MILESTONES_PLACEHOLDER_TEXT,
  MILESTONES_TAB_KEY,
  MILESTONES_TAB_LABEL,
  MILESTONES_TAB_TOOLTIP
} from "../constants";

/**
 * Injects the placeholder milestones tab into a rendered DnD5e character sheet.
 * The helper is idempotent so it is safe to call every time the sheet re-renders.
 *
 * The important Foundry/dnd5e detail here is that we are working with already-rendered DOM,
 * not a framework virtual tree. In dnd5e v5, the clickable tab list tends to live in a
 * sidebar-like `.tabs-right` container, while the tab panels are grouped under
 * `[data-container-id='tabs']`. Older fallback selectors are kept to reduce brittleness.
 *
 * @param root - The rendered sheet element that should receive the placeholder tab.
 * @returns `true` when the expected tab containers were found.
 */
export function injectMilestonesTab(root: ParentNode): boolean {
  const tabsNav = root.querySelector<HTMLElement>(".tabs-right, nav.sheet-tabs.tabs, nav.sheet-tabs, .sheet-tabs.tabs");
  const sheetBody = root.querySelector<HTMLElement>(
    "[data-container-id='tabs'], .tab-body, .sheet-body, section.sheet-body, .sheet-content"
  );

  if (!tabsNav || !sheetBody) {
    return false;
  }

  ensureTabButton(tabsNav);
  ensureTabPanel(sheetBody);

  return true;
}

/**
 * Adds the visible `M` tab button if the sheet does not already have one.
 */
function ensureTabButton(tabsNav: HTMLElement): void {
  if (tabsNav.querySelector('[data-player-milestones-tab="button"]')) {
    return;
  }

  const button = document.createElement("a");
  button.className = "item player-milestones-tab-button";

  // These data attributes are the contract Foundry's tab system looks for when
  // switching between tab groups inside an application.
  button.dataset.action = "tab";
  button.dataset.group = "primary";
  button.dataset.tab = MILESTONES_TAB_KEY;
  button.dataset.playerMilestonesTab = "button";
  button.setAttribute("title", MILESTONES_TAB_TOOLTIP);
  button.setAttribute("aria-label", MILESTONES_TAB_TOOLTIP);
  button.textContent = MILESTONES_TAB_LABEL;

  tabsNav.append(button);
}

/**
 * Adds the empty content panel that will eventually host milestone details.
 */
function ensureTabPanel(sheetBody: HTMLElement): void {
  if (sheetBody.querySelector('[data-player-milestones-tab="panel"]')) {
    return;
  }

  const panel = document.createElement("section");
  panel.className = "tab player-milestones-tab-panel";

  // The panel must mirror the active tab group's metadata so Foundry/dnd5e CSS and
  // tab switching logic treat it like a normal sheet section.
  panel.dataset.group = "primary";
  panel.dataset.tab = MILESTONES_TAB_KEY;
  panel.dataset.playerMilestonesTab = "panel";

  const message = document.createElement("p");
  message.className = "player-milestones-placeholder";
  message.textContent = MILESTONES_PLACEHOLDER_TEXT;

  panel.append(message);
  sheetBody.append(panel);
}
