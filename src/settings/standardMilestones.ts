import {
  MODULE_ID,
  SETTINGS_DEFAULT_MILESTONES_KEY,
  SETTINGS_LEVEL_COSTS_KEY,
  SETTINGS_SHARED_TOP_MATTER_KEY
} from "../constants";

/**
 * Single shared milestone entry shown beneath a section heading.
 */
export interface StandardMilestone {
  id: string;
  name: string;
  description: string;
}

/**
 * Shared milestone section containing an ordered list of milestone entries.
 */
export interface StandardMilestoneSection {
  id: string;
  name: string;
  milestones: StandardMilestone[];
}

/**
 * World-scoped defaults edited by the module settings window.
 */
export interface StandardMilestonesSettingsData {
  topMatter: string;
  sections: StandardMilestoneSection[];
  levelCosts: Record<string, number>;
}

export type ReorderDirection = "up" | "down";

const MIN_LEVEL = 1;
const MAX_LEVEL = 19;

/**
 * Returns the default milestone cost for a specific level band.
 */
function defaultCostForLevel(level: number): number {
  if (level <= 3) {
    return 3;
  }

  if (level <= 10) {
    return 4;
  }

  return 5;
}

/**
 * Creates the default cost mapping for levels 1 through 19.
 */
export function createDefaultLevelCosts(): Record<string, number> {
  const defaults: Record<string, number> = {};

  for (let level = MIN_LEVEL; level <= MAX_LEVEL; level += 1) {
    defaults[String(level)] = defaultCostForLevel(level);
  }

  return defaults;
}

/**
 * Creates the default editable settings object used by both the app UI and persistence layer.
 */
export function createDefaultStandardMilestonesSettings(): StandardMilestonesSettingsData {
  return {
    topMatter: "",
    sections: [],
    levelCosts: createDefaultLevelCosts()
  };
}

/**
 * Reads the world-scoped shared milestone settings from Foundry and normalizes them.
 */
export function getStandardMilestonesSettings(): StandardMilestonesSettingsData {
  const settings = game.settings;
  if (!settings) {
    return createDefaultStandardMilestonesSettings();
  }

  const getSetting = settings.get.bind(settings) as (namespace: string, key: string) => unknown;

  return normalizeStandardMilestonesSettings({
    topMatter: getSetting(MODULE_ID, SETTINGS_SHARED_TOP_MATTER_KEY),
    sections: getSetting(MODULE_ID, SETTINGS_DEFAULT_MILESTONES_KEY),
    levelCosts: getSetting(MODULE_ID, SETTINGS_LEVEL_COSTS_KEY)
  });
}

/**
 * Saves the normalized shared milestone settings back into Foundry's world settings store.
 */
export async function saveStandardMilestonesSettings(
  settings: StandardMilestonesSettingsData
): Promise<void> {
  const settingsStorage = game.settings;
  if (!settingsStorage) {
    return;
  }

  const normalized = normalizeStandardMilestonesSettings(settings);
  const setSetting = settingsStorage.set.bind(settingsStorage) as (
    namespace: string,
    key: string,
    value: unknown
  ) => Promise<unknown>;

  await setSetting(MODULE_ID, SETTINGS_SHARED_TOP_MATTER_KEY, normalized.topMatter);
  await setSetting(MODULE_ID, SETTINGS_DEFAULT_MILESTONES_KEY, normalized.sections);
  await setSetting(MODULE_ID, SETTINGS_LEVEL_COSTS_KEY, normalized.levelCosts);
}

/**
 * Ensures arbitrarily stored data becomes a safe, editable milestone settings object.
 */
export function normalizeStandardMilestonesSettings(
  value: unknown
): StandardMilestonesSettingsData {
  const defaults = createDefaultStandardMilestonesSettings();
  const source = asRecord(value);

  return {
    topMatter: typeof source?.topMatter === "string" ? source.topMatter : defaults.topMatter,
    sections: normalizeSections(source?.sections),
    levelCosts: normalizeLevelCosts(source?.levelCosts)
  };
}

/**
 * Adds a new blank section to the end of the ordered section list.
 */
export function addStandardMilestoneSection(
  sections: readonly StandardMilestoneSection[]
): StandardMilestoneSection[] {
  return [...sections, createEmptySection()];
}

/**
 * Removes the section at the given index, returning a fresh ordered copy.
 */
export function removeStandardMilestoneSection(
  sections: readonly StandardMilestoneSection[],
  sectionIndex: number
): StandardMilestoneSection[] {
  if (!isValidIndex(sections, sectionIndex)) {
    return [...sections];
  }

  return sections.filter((_, index) => index !== sectionIndex);
}

/**
 * Moves an entire section one step up or down in the ordered list.
 */
export function moveStandardMilestoneSection(
  sections: readonly StandardMilestoneSection[],
  sectionIndex: number,
  direction: ReorderDirection
): StandardMilestoneSection[] {
  return moveArrayEntry(sections, sectionIndex, direction);
}

/**
 * Adds a blank milestone row to a specific section.
 */
export function addStandardMilestoneItem(
  sections: readonly StandardMilestoneSection[],
  sectionIndex: number
): StandardMilestoneSection[] {
  if (!isValidIndex(sections, sectionIndex)) {
    return [...sections];
  }

  return sections.map((section, index) => {
    if (index !== sectionIndex) {
      return cloneSection(section);
    }

    return {
      ...cloneSection(section),
      milestones: [...section.milestones, createEmptyMilestone()]
    };
  });
}

/**
 * Removes a milestone row from a specific section.
 */
export function removeStandardMilestoneItem(
  sections: readonly StandardMilestoneSection[],
  sectionIndex: number,
  milestoneIndex: number
): StandardMilestoneSection[] {
  if (!isValidIndex(sections, sectionIndex)) {
    return [...sections];
  }

  return sections.map((section, index) => {
    if (index !== sectionIndex) {
      return cloneSection(section);
    }

    if (!isValidIndex(section.milestones, milestoneIndex)) {
      return cloneSection(section);
    }

    return {
      ...cloneSection(section),
      milestones: section.milestones.filter((_, itemIndex) => itemIndex !== milestoneIndex)
    };
  });
}

/**
 * Moves a milestone row within one section one step up or down.
 */
export function moveStandardMilestoneItem(
  sections: readonly StandardMilestoneSection[],
  sectionIndex: number,
  milestoneIndex: number,
  direction: ReorderDirection
): StandardMilestoneSection[] {
  if (!isValidIndex(sections, sectionIndex)) {
    return [...sections];
  }

  return sections.map((section, index) => {
    if (index !== sectionIndex) {
      return cloneSection(section);
    }

    return {
      ...cloneSection(section),
      milestones: moveArrayEntry(section.milestones, milestoneIndex, direction)
    };
  });
}

/**
 * Converts plain form post data into the nested shared milestone settings structure.
 */
export function serializeStandardMilestonesFormData(
  formData: FormData,
  options: { keepEmptyRows?: boolean } = {}
): StandardMilestonesSettingsData {
  const topMatterValue = formData.get("topMatter");
  const topMatter = typeof topMatterValue === "string" ? topMatterValue : "";
  const defaultLevelCosts = createDefaultLevelCosts();
  const sectionMap = new Map<number, MutableSectionDraft>();
  const levelCosts: Record<string, number> = { ...defaultLevelCosts };

  formData.forEach((rawValue, rawKey) => {
    if (typeof rawValue !== "string") {
      return;
    }

    const sectionMatch = /^sections\.(\d+)\.(id|name)$/.exec(rawKey);
    if (sectionMatch) {
      const sectionIndex = Number(sectionMatch[1]);
      const section = getOrCreateSectionDraft(sectionMap, sectionIndex);

      switch (sectionMatch[2]) {
        case "id":
          section.id = rawValue;
          break;
        case "name":
          section.name = rawValue;
          break;
        default:
          break;
      }

      return;
    }

    const milestoneMatch = /^sections\.(\d+)\.milestones\.(\d+)\.(id|name|description)$/.exec(rawKey);
    if (milestoneMatch) {
      const sectionIndex = Number(milestoneMatch[1]);
      const milestoneIndex = Number(milestoneMatch[2]);
      const section = getOrCreateSectionDraft(sectionMap, sectionIndex);
      const milestone = getOrCreateMilestoneDraft(section, milestoneIndex);

      switch (milestoneMatch[3]) {
        case "id":
          milestone.id = rawValue;
          break;
        case "name":
          milestone.name = rawValue;
          break;
        case "description":
          milestone.description = rawValue;
          break;
        default:
          break;
      }

      return;
    }

    const levelMatch = /^levelCosts\.(\d+)$/.exec(rawKey);
    if (levelMatch) {
      const level = Number(levelMatch[1]);

      if (level >= MIN_LEVEL && level <= MAX_LEVEL) {
        levelCosts[String(level)] = normalizeLevelCostValue(rawValue, defaultCostForLevel(level));
      }
    }
  });

  const sections = Array.from(sectionMap.entries())
    .sort(([leftIndex], [rightIndex]) => leftIndex - rightIndex)
    .map(([, draft]) => ({
      id: nonEmptyString(draft.id) ?? createStableId("section"),
      name: typeof draft.name === "string" ? draft.name : "",
      milestones: Array.from(draft.milestones.entries())
        .sort(([leftIndex], [rightIndex]) => leftIndex - rightIndex)
        .map(([, milestone]) => ({
          id: nonEmptyString(milestone.id) ?? createStableId("milestone"),
          name: typeof milestone.name === "string" ? milestone.name : "",
          description: typeof milestone.description === "string" ? milestone.description : ""
        }))
        .filter(
          (milestone) =>
            options.keepEmptyRows === true ||
            milestone.name.trim() !== "" ||
            milestone.description.trim() !== ""
        )
    }))
    .filter(
      (section) =>
        options.keepEmptyRows === true || section.name.trim() !== "" || section.milestones.length > 0
    );

  return normalizeStandardMilestonesSettings({
    topMatter,
    sections,
    levelCosts
  });
}

/**
 * Formats the level cost map into a simple template-friendly row list.
 */
export function createLevelCostRows(
  levelCosts: Record<string, number>
): Array<{ level: number; cost: number }> {
  const normalized = normalizeLevelCosts(levelCosts);

  return Array.from({ length: MAX_LEVEL }, (_, offset) => {
    const level = offset + MIN_LEVEL;

    return {
      level,
      cost: normalized[String(level)] ?? defaultCostForLevel(level)
    };
  });
}

interface MutableMilestoneDraft {
  id?: string;
  name?: string;
  description?: string;
}

interface MutableSectionDraft {
  id?: string;
  name?: string;
  milestones: Map<number, MutableMilestoneDraft>;
}

function normalizeSections(value: unknown): StandardMilestoneSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index) => normalizeSection(entry, index))
    .filter((section): section is StandardMilestoneSection => section !== null);
}

function normalizeSection(value: unknown, index: number): StandardMilestoneSection | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  const milestones = Array.isArray(record.milestones)
    ? record.milestones
        .map((entry, milestoneIndex) => normalizeMilestone(entry, milestoneIndex))
        .filter((milestone): milestone is StandardMilestone => milestone !== null)
    : [];

  return {
    id: nonEmptyString(record.id) ?? createStableId(`section-${index}`),
    name: typeof record.name === "string" ? record.name : "",
    milestones
  };
}

function normalizeMilestone(value: unknown, index: number): StandardMilestone | null {
  const record = asRecord(value);

  if (!record) {
    return null;
  }

  const name = typeof record.name === "string" ? record.name : "";
  const description = typeof record.description === "string" ? record.description : "";

  if (name.trim() === "" && description.trim() === "" && typeof record.id !== "string") {
    return null;
  }

  return {
    id: nonEmptyString(record.id) ?? createStableId(`milestone-${index}`),
    name,
    description
  };
}

function normalizeLevelCosts(value: unknown): Record<string, number> {
  const defaults = createDefaultLevelCosts();
  const record = asRecord(value);

  if (!record) {
    return defaults;
  }

  for (let level = MIN_LEVEL; level <= MAX_LEVEL; level += 1) {
    const fallback = defaults[String(level)] ?? defaultCostForLevel(level);
    defaults[String(level)] = normalizeLevelCostValue(record[String(level)], fallback);
  }

  return defaults;
}

function normalizeLevelCostValue(value: unknown, fallback: number): number {
  const candidate =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(candidate)) {
    return fallback;
  }

  const normalized = Math.trunc(candidate);
  return normalized >= 0 ? normalized : fallback;
}

function getOrCreateSectionDraft(
  drafts: Map<number, MutableSectionDraft>,
  sectionIndex: number
): MutableSectionDraft {
  const existing = drafts.get(sectionIndex);

  if (existing) {
    return existing;
  }

  const created: MutableSectionDraft = {
    milestones: new Map<number, MutableMilestoneDraft>()
  };
  drafts.set(sectionIndex, created);
  return created;
}

function getOrCreateMilestoneDraft(
  section: MutableSectionDraft,
  milestoneIndex: number
): MutableMilestoneDraft {
  const existing = section.milestones.get(milestoneIndex);

  if (existing) {
    return existing;
  }

  const created: MutableMilestoneDraft = {};
  section.milestones.set(milestoneIndex, created);
  return created;
}

function moveArrayEntry<T>(
  items: readonly T[],
  fromIndex: number,
  direction: ReorderDirection
): T[] {
  const targetIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;

  if (!isValidIndex(items, fromIndex) || !isValidIndex(items, targetIndex)) {
    return [...items];
  }

  const copy = [...items];
  const movedItem = copy[fromIndex];

  if (movedItem === undefined) {
    return copy;
  }

  copy.splice(fromIndex, 1);
  copy.splice(targetIndex, 0, movedItem);
  return copy;
}

function createEmptySection(): StandardMilestoneSection {
  return {
    id: createStableId("section"),
    name: "",
    milestones: []
  };
}

function createEmptyMilestone(): StandardMilestone {
  return {
    id: createStableId("milestone"),
    name: "",
    description: ""
  };
}

function cloneSection(section: StandardMilestoneSection): StandardMilestoneSection {
  return {
    ...section,
    milestones: [...section.milestones]
  };
}

function createStableId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${uuid ?? Math.random().toString(36).slice(2, 10)}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function isValidIndex<T>(items: readonly T[], index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index < items.length;
}
