import { MODULE_ID } from "../constants";
import type {
  StandardMilestoneSection,
  StandardMilestonesSettingsData
} from "../settings/standardMilestones";

export const ACTOR_MILESTONES_FLAG_KEY = "milestonesState";

export interface ActorMilestoneCustomItem {
  id: string;
  title: string;
  description: string;
  checked: boolean;
}

export interface ActorMilestoneSectionState {
  checked: Record<string, boolean>;
  customItems: ActorMilestoneCustomItem[];
}

export interface ActorMilestonesProgressState {
  current: number;
  targetCost: number;
}

export interface ActorMilestonesState {
  sections: Record<string, ActorMilestoneSectionState>;
  progress: ActorMilestonesProgressState;
}

export interface MilestonesTabItemData {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  isCustom: boolean;
}

export interface MilestonesTabSectionData {
  id: string;
  name: string;
  items: MilestonesTabItemData[];
}

export interface MilestonesTabData {
  topMatter: string;
  progress: ActorMilestonesProgressState;
  sections: MilestonesTabSectionData[];
}

export interface SetMilestoneCheckedInput {
  sectionId: string;
  itemId: string;
  checked: boolean;
  isCustom: boolean;
}

export interface UpsertCustomMilestoneInput {
  sectionId: string;
  itemId?: string;
  title: string;
  description?: string;
}

export interface RemoveCustomMilestoneInput {
  sectionId: string;
  itemId: string;
}

export interface ActorFlagLike {
  getFlag(scope: string, key: string): unknown;
  setFlag(scope: string, key: string, value: unknown): Promise<unknown>;
}

/**
 * Normalizes the raw actor flag payload so the milestones tab can safely merge it with
 * the current shared settings definition.
 */
export function normalizeActorMilestonesState(
  value: unknown,
  settings: StandardMilestonesSettingsData
): ActorMilestonesState {
  const source = asRecord(value);
  const sourceSections = asRecord(source?.sections);
  const sections = Object.fromEntries(
    settings.sections.map((section) => [section.id, normalizeSectionState(sourceSections?.[section.id], section)])
  );

  return {
    sections,
    progress: normalizeProgressState(source?.progress, settings)
  };
}

/**
 * Builds the template-friendly tab data by layering actor progress on top of the current
 * world-scoped milestone settings.
 */
export function buildMilestonesTabData(
  settings: StandardMilestonesSettingsData,
  state: ActorMilestonesState
): MilestonesTabData {
  return {
    topMatter: settings.topMatter,
    progress: cloneProgressState(state.progress, getDefaultTargetCost(settings)),
    sections: settings.sections.map((section) => buildSectionData(section, state.sections[section.id]))
  };
}

/**
 * Adjusts the current milestone progress counter by a positive or negative delta.
 */
export function adjustMilestoneProgress(
  state: ActorMilestonesState,
  delta: number
): ActorMilestonesState {
  const progress = cloneProgressState(state.progress);
  const nextCurrent = Math.max(0, progress.current + normalizeInteger(delta, 0));

  return {
    ...state,
    progress: {
      ...progress,
      current: nextCurrent
    }
  };
}

/**
 * Sets the current progress counter directly, clamping it to a non-negative integer.
 */
export function setMilestoneProgressCurrent(
  state: ActorMilestonesState,
  current: number
): ActorMilestonesState {
  const progress = cloneProgressState(state.progress);

  return {
    ...state,
    progress: {
      ...progress,
      current: normalizeInteger(current, 0, { minimum: 0 })
    }
  };
}

/**
 * Applies a newly resolved level cost to the tracker, resetting current progress to zero each
 * time the Level up workflow is used.
 */
export function applyLevelCostToProgress(
  state: ActorMilestonesState,
  targetCost: number
): ActorMilestonesState {
  const progress = cloneProgressState(state.progress);
  const normalizedTargetCost = normalizeInteger(targetCost, progress.targetCost || 1, { minimum: 1 });

  return {
    ...state,
    progress: {
      current: 0,
      targetCost: normalizedTargetCost
    }
  };
}

/**
 * Sets the checked state of either a shared milestone item or a custom actor-only item.
 */
export function setMilestoneChecked(
  state: ActorMilestonesState,
  input: SetMilestoneCheckedInput
): ActorMilestonesState {
  const section = getOrCreateSectionState(state.sections[input.sectionId]);

  if (input.isCustom) {
    return {
      sections: {
        ...state.sections,
        [input.sectionId]: {
          ...section,
          customItems: section.customItems.map((item) =>
            item.id === input.itemId ? { ...item, checked: input.checked } : item
          )
        }
      },
      progress: cloneProgressState(state.progress)
    };
  }

  const nextChecked = { ...section.checked };
  nextChecked[input.itemId] = input.checked;

  return {
    sections: {
      ...state.sections,
      [input.sectionId]: {
        ...section,
        checked: nextChecked
      }
    },
    progress: cloneProgressState(state.progress)
  };
}

/**
 * Adds a new custom milestone or updates the label of an existing one.
 */
export function upsertCustomMilestone(
  state: ActorMilestonesState,
  input: UpsertCustomMilestoneInput
): ActorMilestonesState {
  const title = input.title.trim();
  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (title === "" || description === "") {
    return state;
  }

  const section = getOrCreateSectionState(state.sections[input.sectionId]);
  const itemId = nonEmptyString(input.itemId) ?? createStableId("custom");
  const existingIndex = section.customItems.findIndex((item) => item.id === itemId);

  const customItems = [...section.customItems];
  if (existingIndex >= 0) {
    const existing = customItems[existingIndex];
    if (existing) {
      customItems[existingIndex] = { ...existing, title, description };
    }
  } else {
    customItems.push({
      id: itemId,
      title,
      description,
      checked: false
    });
  }

  return {
    sections: {
      ...state.sections,
      [input.sectionId]: {
        ...section,
        customItems
      }
    },
    progress: cloneProgressState(state.progress)
  };
}

/**
 * Removes a custom actor-only milestone item from one section.
 */
export function removeCustomMilestone(
  state: ActorMilestonesState,
  input: RemoveCustomMilestoneInput
): ActorMilestonesState {
  const section = state.sections[input.sectionId];
  if (!section) {
    return state;
  }

  return {
    sections: {
      ...state.sections,
      [input.sectionId]: {
        ...section,
        customItems: section.customItems.filter((item) => item.id !== input.itemId)
      }
    },
    progress: cloneProgressState(state.progress)
  };
}

/**
 * Reads the actor's persisted milestone flag and normalizes it against the current settings.
 */
export function getActorMilestonesState(
  actor: ActorFlagLike,
  settings: StandardMilestonesSettingsData
): ActorMilestonesState {
  return normalizeActorMilestonesState(actor.getFlag(MODULE_ID, ACTOR_MILESTONES_FLAG_KEY), settings);
}

/**
 * Saves the full actor-backed milestone state into the module's document flag space.
 */
export async function saveActorMilestonesState(
  actor: ActorFlagLike,
  state: ActorMilestonesState
): Promise<void> {
  await actor.setFlag(MODULE_ID, ACTOR_MILESTONES_FLAG_KEY, state);
}

function buildSectionData(
  section: StandardMilestoneSection,
  sectionState: ActorMilestoneSectionState | undefined
): MilestonesTabSectionData {
  const sharedItems = section.milestones.map((milestone) => ({
    id: milestone.id,
    label: milestone.name,
    description: milestone.description,
    checked: sectionState?.checked[milestone.id] === true,
    isCustom: false
  }));
  const customItems = (sectionState?.customItems ?? []).map((item) => ({
    id: item.id,
    label: item.title,
    description: item.description,
    checked: item.checked,
    isCustom: true
  }));

  return {
    id: section.id,
    name: section.name,
    items: [...sharedItems, ...customItems]
  };
}

function normalizeSectionState(
  value: unknown,
  section: StandardMilestoneSection
): ActorMilestoneSectionState {
  const record = asRecord(value);
  const checkedSource = asRecord(record?.checked);
  const checked: Record<string, boolean> = {};

  for (const milestone of section.milestones) {
    const persistedValue = checkedSource?.[milestone.id];
    if (typeof persistedValue === "boolean") {
      checked[milestone.id] = persistedValue;
    }
  }

  const rawCustomItems = Array.isArray(record?.customItems) ? record.customItems : [];
  const customItems = rawCustomItems
    .map((item) => normalizeCustomItem(item))
    .filter((item): item is ActorMilestoneCustomItem => item !== null);

  return {
    checked,
    customItems
  };
}

function normalizeProgressState(
  value: unknown,
  settings: StandardMilestonesSettingsData
): ActorMilestonesProgressState {
  const record = asRecord(value);

  return cloneProgressState(record ?? undefined, getDefaultTargetCost(settings));
}

function normalizeCustomItem(value: unknown): ActorMilestoneCustomItem | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const title =
    typeof record.title === "string"
      ? record.title.trim()
      : typeof record.label === "string"
        ? record.label.trim()
        : "";
  if (title === "") {
    return null;
  }

  return {
    id: nonEmptyString(record.id) ?? createStableId("custom"),
    title,
    description: typeof record.description === "string" ? record.description : "",
    checked: record.checked === true
  };
}

function getOrCreateSectionState(
  value: ActorMilestoneSectionState | undefined
): ActorMilestoneSectionState {
  return value
    ? {
        checked: { ...value.checked },
        customItems: value.customItems.map((item) => ({ ...item }))
      }
    : {
        checked: {},
        customItems: []
      };
}

function cloneProgressState(
  value: Partial<ActorMilestonesProgressState> | Record<string, unknown> | undefined,
  fallbackTargetCost = 1
): ActorMilestonesProgressState {
  const current = normalizeInteger(value?.current, 0, { minimum: 0 });
  const targetCost = normalizeInteger(value?.targetCost, fallbackTargetCost, { minimum: 1 });

  return {
    current,
    targetCost
  };
}

function getDefaultTargetCost(settings: StandardMilestonesSettingsData): number {
  return normalizeInteger(settings.levelCosts["1"], 1, { minimum: 1 });
}

function createStableId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}-${uuid ?? Math.random().toString(36).slice(2, 10)}`;
}

function normalizeInteger(
  value: unknown,
  fallback: number,
  options: { minimum?: number } = {}
): number {
  const numericValue = typeof value === "number" ? value : Number(value);
  const resolved = Number.isFinite(numericValue) ? Math.trunc(numericValue) : Math.trunc(fallback);
  const minimum = options.minimum ?? Number.MIN_SAFE_INTEGER;

  return Math.max(minimum, resolved);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}
