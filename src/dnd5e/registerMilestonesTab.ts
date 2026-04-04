import { renderMilestonesTab } from "./renderMilestonesTab";
import { injectMilestonesTab } from "./sheetTabDom";

/**
 * Registers the sheet-render hook that adds the `M` milestones tab.
 *
 * `renderApplicationV2` is a generic Foundry hook that fires whenever any modern v13-style
 * window finishes rendering. We use it instead of subclassing the dnd5e sheet directly,
 * which keeps the module lightweight and reduces coupling to system internals.
 *
 * The trade-off is that we must guard carefully so we only touch likely dnd5e character sheets.
 */
export function registerMilestonesSheetIntegration(): void {
  Hooks.on("renderApplicationV2", (application, element) => {
    if (!isLikelyDnd5eCharacterSheet(application, element)) {
      return;
    }

    if (injectMilestonesTab(element)) {
      void renderMilestonesTab(application, element);
      return;
    }

    // dnd5e sometimes finishes building its tab container on the next frame,
    // so we retry once after the browser has had a chance to settle the DOM.
    requestAnimationFrame(() => {
      if (injectMilestonesTab(element)) {
        void renderMilestonesTab(application, element);
      }
    });
  });
}

interface ApplicationLike {
  constructor?: {
    name?: string;
  };
  id?: string | null;
  options?: {
    classes?: string[];
  } | null;
}

/**
 * Uses non-brittle heuristics to decide whether the rendered app looks like a
 * DnD5e character sheet that supports tab injection.
 *
 * Foundry gives this hook every rendered `ApplicationV2`, not a strongly typed
 * `CharacterSheet` instance, so in module code it is common to inspect constructor
 * names, option classes, and rendered DOM markers to narrow the target safely.
 */
function isLikelyDnd5eCharacterSheet(application: ApplicationLike, element: HTMLElement): boolean {
  const constructorName = application.constructor?.name?.toLowerCase() ?? "";
  const applicationId = application.id?.toLowerCase() ?? "";
  const optionClasses = application.options?.classes?.join(" ").toLowerCase() ?? "";
  const elementClasses = element.className.toLowerCase();

  const looksLikeCharacterSheet = constructorName.includes("character") || elementClasses.includes("character");
  const looksLikeDnd5e =
    constructorName.includes("dnd5e") ||
    applicationId.includes("dnd5e") ||
    optionClasses.includes("dnd5e") ||
    elementClasses.includes("dnd5e");
  const hasTabNavigation = Boolean(
    element.querySelector(".tabs-right, nav.sheet-tabs, .sheet-tabs.tabs, [data-container-id='tabs']")
  );

  return looksLikeCharacterSheet && looksLikeDnd5e && hasTabNavigation;
}
