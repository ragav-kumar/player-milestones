import { injectMilestonesTab } from "./sheetTabDom";

/**
 * Registers the sheet-render hook that adds the placeholder `M` milestones tab.
 * The guard intentionally stays conservative so the scaffold only touches likely
 * DnD5e character sheets and avoids unrelated ApplicationV2 windows.
 */
export function registerMilestonesSheetIntegration(): void {
  Hooks.on("renderApplicationV2", (application, element) => {
    if (!isLikelyDnd5eCharacterSheet(application, element)) {
      return;
    }

    injectMilestonesTab(element);
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
  const hasTabNavigation = Boolean(element.querySelector("nav.sheet-tabs, .sheet-tabs.tabs"));

  return looksLikeCharacterSheet && looksLikeDnd5e && hasTabNavigation;
}
