import { MODULE_ID } from "../constants";
import {
  getStandardMilestonesSettings,
  type StandardMilestonesSettingsData
} from "../settings/standardMilestones";
import { beginExclusiveCustomItemEdit, discardCustomItemEdit } from "./customItemEditMode";
import {
  ACTOR_MILESTONES_FLAG_KEY,
  adjustMilestoneProgress,
  applyLevelCostToProgress,
  buildMilestonesTabData,
  normalizeActorMilestonesState,
  removeCustomMilestone,
  saveActorMilestonesState,
  setMilestoneChecked,
  setMilestoneProgressCurrent,
  upsertCustomMilestone,
  type ActorFlagLike,
  type ActorMilestonesState,
  type MilestonesTabItemData
} from "./actorMilestones";

interface SheetApplicationLike extends Record<string, unknown> {
  actor?: unknown;
  object?: unknown;
  document?: unknown;
}

interface MilestonesTemplateSection extends Record<string, unknown> {
  id: string;
  name: string;
  hasItems: boolean;
  canManageCustomItems: boolean;
  canToggleMilestones: boolean;
  items: MilestonesTabItemData[];
}

interface MilestonesTemplateProgress extends Record<string, unknown> {
  current: number;
  targetCost: number;
  isReady: boolean;
  canEditCurrent: boolean;
  canLevelUp: boolean;
}

interface MilestonesTemplateContext extends Record<string, unknown> {
  topMatterHtml: string;
  progress: MilestonesTemplateProgress;
  hasSections: boolean;
  sections: MilestonesTemplateSection[];
}

interface FormActionElement extends Element {
  dataset: DOMStringMap;
}

interface UpdateableActorLike extends ActorFlagLike {
  system?: unknown;
  update?: (data: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Renders the live actor-backed milestones tab into the already-injected panel element.
 */
export async function renderMilestonesTab(
  application: unknown,
  root: ParentNode
): Promise<void> {
  const panel = root.querySelector<HTMLElement>('[data-player-milestones-tab="panel"]');
  if (!panel) {
    return;
  }

  const actor = resolveActor(application);
  if (!actor) {
    panel.innerHTML = '<p class="player-milestones-empty-state">Milestones are only available on character actors.</p>';
    return;
  }

  const settings = getStandardMilestonesSettings();
  const rawState = actor.getFlag(MODULE_ID, ACTOR_MILESTONES_FLAG_KEY);
  const normalizedState = normalizeActorMilestonesState(rawState, settings);
  const stateForRender = initializeProgressState(rawState, normalizedState, actor, settings);
  const tabData = buildMilestonesTabData(settings, stateForRender);
  const canManageCustomItems = canCurrentUserManageCustomItems();
  const canToggleMilestones = canCurrentUserToggleMilestones(application, actor);
  const canUseLevelUp =
    canToggleMilestones && tabData.progress.current >= tabData.progress.targetCost;
  const context: MilestonesTemplateContext = {
    topMatterHtml: await enrichTopMatterHtml(tabData.topMatter),
    progress: {
      current: tabData.progress.current,
      targetCost: tabData.progress.targetCost,
      isReady: tabData.progress.current >= tabData.progress.targetCost,
      canEditCurrent: canManageCustomItems,
      canLevelUp: canUseLevelUp
    },
    hasSections: tabData.sections.length > 0,
    sections: tabData.sections.map((section) => ({
      ...section,
      hasItems: section.items.length > 0,
      canManageCustomItems,
      canToggleMilestones
    }))
  };

  panel.innerHTML = await renderMilestonesTemplate(context);
  syncCustomActionButtonStates(panel);
  bindMilestonesTabEvents(panel, actor, application, root);

  if (JSON.stringify(rawState ?? null) !== JSON.stringify(stateForRender)) {
    void saveActorMilestonesState(actor, stateForRender);
  }
}

function bindMilestonesTabEvents(
  panel: HTMLElement,
  actor: ActorFlagLike,
  application: unknown,
  root: ParentNode
): void {
  if (panel.dataset.playerMilestonesBound === "true") {
    return;
  }

  panel.dataset.playerMilestonesBound = "true";

  panel.addEventListener("change", (event) => {
    void onPanelChange(event, actor, application, root);
  });
  panel.addEventListener("input", (event) => {
    onPanelInput(event);
  });
  panel.addEventListener("click", (event) => {
    void onPanelClick(event, actor, application, root);
  });
  panel.addEventListener("keydown", (event) => {
    onPanelKeyDown(event);
  });
}

async function onPanelChange(
  event: Event,
  actor: ActorFlagLike,
  application: unknown,
  root: ParentNode
): Promise<void> {
  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }

  const input = event.target;

  if (input.dataset.progressCurrentInput === "true") {
    if (!canCurrentUserManageCustomItems()) {
      return;
    }

    await updateActorMilestones(actor, application, root, (state) =>
      setMilestoneProgressCurrent(state, Number(input.value))
    );
    return;
  }

  if (input.dataset.milestoneCheckbox !== "true") {
    return;
  }

  if (!canCurrentUserToggleMilestones(application, actor)) {
    input.checked = !input.checked;
    return;
  }

  const sectionId = input.dataset.sectionId ?? "";
  const itemId = input.dataset.itemId ?? "";

  if (sectionId === "" || itemId === "") {
    return;
  }

  await updateActorMilestones(actor, application, root, (state) => {
    const checkedState = setMilestoneChecked(state, {
      sectionId,
      itemId,
      checked: input.checked,
      isCustom: input.dataset.customItem === "true"
    });

    return adjustMilestoneProgress(checkedState, input.checked ? 1 : -1);
  });

  if (input.checked) {
    await grantActorInspirationIfMissing(actor);
  }
}

function onPanelInput(event: Event): void {
  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }

  const row = event.target.closest<HTMLElement>("[data-custom-add-row='true'], [data-custom-item-row='true']");
  if (!row) {
    return;
  }

  syncCustomActionButtonState(row);
}

function onPanelKeyDown(event: KeyboardEvent): void {
  if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
    return;
  }

  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }

  const action = event.target.dataset.enterAction;
  if (action !== "add-custom-item" && action !== "save-custom-item") {
    return;
  }

  event.preventDefault();

  const rowSelector =
    action === "add-custom-item" ? "[data-custom-add-row='true']" : "[data-custom-item-row='true']";
  const row = event.target.closest<HTMLElement>(rowSelector);
  const actionButton = row?.querySelector<HTMLElement>(`[data-action='${action}']`);

  if (!actionButton) {
    return;
  }

  if (actionButton instanceof HTMLButtonElement && actionButton.disabled) {
    return;
  }

  actionButton.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
}

async function onPanelClick(
  event: Event,
  actor: ActorFlagLike,
  application: unknown,
  root: ParentNode
): Promise<void> {
  if (!(event.target instanceof Element)) {
    return;
  }

  const actionElement = event.target.closest<FormActionElement>("[data-action]");
  if (!actionElement) {
    return;
  }

  const action = actionElement.dataset.action ?? "";
  const isCustomManagementAction =
    action === "add-custom-item" ||
    action === "edit-custom-item" ||
    action === "save-custom-item" ||
    action === "cancel-custom-item" ||
    action === "remove-custom-item";

  if (isCustomManagementAction && !canCurrentUserManageCustomItems()) {
    event.preventDefault();
    return;
  }

  if (action === "level-up") {
    event.preventDefault();

    if (!canCurrentUserToggleMilestones(application, actor)) {
      return;
    }

    const settings = getStandardMilestonesSettings();
    const currentState = normalizeActorMilestonesState(
      actor.getFlag(MODULE_ID, ACTOR_MILESTONES_FLAG_KEY),
      settings
    );
    if (currentState.progress.current < currentState.progress.targetCost) {
      return;
    }

    const nextTargetCost = resolveLevelCostFromActor(actor, settings);

    await updateActorMilestones(actor, application, root, (state) =>
      applyLevelCostToProgress(state, nextTargetCost)
    );
    return;
  }

  if (action === "edit-custom-item") {
    event.preventDefault();

    const row = actionElement.closest<HTMLElement>("[data-custom-item-row='true']");
    if (!row) {
      return;
    }

    beginExclusiveCustomItemEdit(root, row);
    syncCustomActionButtonStates(root);
    return;
  }

  if (action === "add-custom-item") {
    event.preventDefault();

    const row = actionElement.closest<HTMLElement>("[data-custom-add-row='true']");
    const titleInput = row?.querySelector<HTMLInputElement>("[data-custom-add-title-input='true']");
    const descriptionInput = row?.querySelector<HTMLInputElement>(
      "[data-custom-add-description-input='true']"
    );
    const sectionId = row?.dataset.sectionId ?? "";
    const title = titleInput?.value ?? "";
    const description = descriptionInput?.value ?? "";

    if (sectionId === "" || title.trim() === "" || description.trim() === "") {
      return;
    }

    await updateActorMilestones(actor, application, root, (state) =>
      upsertCustomMilestone(state, {
        sectionId,
        title,
        description
      })
    );
    return;
  }

  if (action === "save-custom-item") {
    event.preventDefault();

    const row = actionElement.closest<HTMLElement>("[data-custom-item-row='true']");
    const titleInput = row?.querySelector<HTMLInputElement>("[data-custom-title-input='true']");
    const descriptionInput = row?.querySelector<HTMLInputElement>(
      "[data-custom-description-input='true']"
    );
    const sectionId = row?.dataset.sectionId ?? "";
    const itemId = row?.dataset.itemId ?? "";
    const title = titleInput?.value ?? "";
    const description = descriptionInput?.value ?? "";

    if (sectionId === "" || itemId === "" || title.trim() === "" || description.trim() === "") {
      return;
    }

    await updateActorMilestones(actor, application, root, (state) =>
      upsertCustomMilestone(state, {
        sectionId,
        itemId,
        title,
        description
      })
    );
    return;
  }

  if (action === "cancel-custom-item") {
    event.preventDefault();

    const row = actionElement.closest<HTMLElement>("[data-custom-item-row='true']");
    if (!row) {
      return;
    }

    discardCustomItemEdit(row);
    syncCustomActionButtonState(row);
    return;
  }

  if (action === "remove-custom-item") {
    event.preventDefault();

    const row = actionElement.closest<HTMLElement>("[data-custom-item-row='true']");
    const sectionId = row?.dataset.sectionId ?? "";
    const itemId = row?.dataset.itemId ?? "";

    if (sectionId === "" || itemId === "") {
      return;
    }

    await updateActorMilestones(actor, application, root, (state) =>
      removeCustomMilestone(state, {
        sectionId,
        itemId
      })
    );
  }
}

function syncCustomActionButtonStates(root: ParentNode): void {
  root
    .querySelectorAll<HTMLElement>("[data-custom-add-row='true'], [data-custom-item-row='true']")
    .forEach((row) => {
      syncCustomActionButtonState(row);
    });
}

function syncCustomActionButtonState(row: HTMLElement): void {
  const titleInput = row.querySelector<HTMLInputElement>(
    "[data-custom-add-title-input='true'], [data-custom-title-input='true']"
  );
  const descriptionInput = row.querySelector<HTMLInputElement>(
    "[data-custom-add-description-input='true'], [data-custom-description-input='true']"
  );
  const actionButton = row.querySelector<HTMLButtonElement>(
    "[data-action='add-custom-item'], [data-action='save-custom-item']"
  );

  if (!actionButton) {
    return;
  }

  actionButton.disabled = !hasNonEmptyValue(titleInput?.value) || !hasNonEmptyValue(descriptionInput?.value);
}

async function updateActorMilestones(
  actor: ActorFlagLike,
  application: unknown,
  root: ParentNode,
  updater: (state: ActorMilestonesState) => ActorMilestonesState
): Promise<void> {
  const settings = getStandardMilestonesSettings();
  const current = normalizeActorMilestonesState(
    actor.getFlag(MODULE_ID, ACTOR_MILESTONES_FLAG_KEY),
    settings
  );
  const next = normalizeActorMilestonesState(updater(current), settings);

  await saveActorMilestonesState(actor, next);
  await renderMilestonesTab(application, root);
}

export async function grantActorInspirationIfMissing(actor: unknown): Promise<void> {
  const updateableActor = actor as UpdateableActorLike;
  if (typeof updateableActor.update !== "function" || actorHasInspiration(updateableActor)) {
    return;
  }

  await updateableActor.update({
    "system.attributes.inspiration": true
  });
}

function resolveActor(application: unknown): ActorFlagLike | null {
  const sheet = application as SheetApplicationLike;
  const candidates = [sheet.actor, sheet.object, sheet.document];

  for (const candidate of candidates) {
    if (isActorFlagLike(candidate)) {
      return candidate;
    }
  }

  return null;
}

function isActorFlagLike(value: unknown): value is ActorFlagLike {
  const record = value as Partial<ActorFlagLike> | null;
  return typeof record?.getFlag === "function" && typeof record?.setFlag === "function";
}

async function enrichTopMatterHtml(value: string): Promise<string> {
  if (value.trim() === "") {
    return "";
  }

  if (typeof foundry === "undefined") {
    return value;
  }

  const enriched = await foundry.applications.ux.TextEditor.implementation.enrichHTML(value);
  return typeof enriched === "string" ? enriched : value;
}

async function renderMilestonesTemplate(context: MilestonesTemplateContext): Promise<string> {
  if (typeof foundry === "undefined") {
    return renderMilestonesFallback(context);
  }

  return foundry.applications.handlebars.renderTemplate(
    `modules/${MODULE_ID}/templates/milestones-tab.hbs`,
    context
  );
}

function initializeProgressState(
  rawState: unknown,
  normalizedState: ActorMilestonesState,
  actor: ActorFlagLike,
  settings: StandardMilestonesSettingsData
): ActorMilestonesState {
  const rawRecord = asRecord(rawState);
  const rawProgress = asRecord(rawRecord?.progress);
  const storedTargetCost = readNumericValue(rawProgress?.targetCost);

  if (storedTargetCost !== null && storedTargetCost >= 1) {
    return normalizedState;
  }

  return {
    ...normalizedState,
    progress: {
      current: normalizedState.progress?.current ?? 0,
      targetCost: resolveLevelCostFromActor(actor, settings)
    }
  };
}

function resolveLevelCostFromActor(
  actor: unknown,
  settings: StandardMilestonesSettingsData
): number {
  const configuredLevels = Object.keys(settings.levelCosts)
    .map((level) => Number(level))
    .filter((level) => Number.isFinite(level) && level >= 1);
  const maxConfiguredLevel = configuredLevels.length > 0 ? Math.max(...configuredLevels) : 1;
  const clampedLevel = Math.min(maxConfiguredLevel, Math.max(1, resolveActorLevel(actor)));

  return Math.max(1, readNumericValue(settings.levelCosts[String(clampedLevel)]) ?? 1);
}

function resolveActorLevel(actor: unknown): number {
  const actorRecord = asRecord(actor);
  const system = asRecord(actorRecord?.system);
  const details = asRecord(system?.details);
  const detailLevel = readNumericValue(details?.level);

  if (detailLevel !== null && detailLevel >= 1) {
    return detailLevel;
  }

  const classes = asRecord(system?.classes);
  const totalClassLevels = Object.values(classes ?? {}).reduce<number>((sum, entry) => {
    const classRecord = asRecord(entry);
    const directLevel = readNumericValue(classRecord?.levels);
    const nestedLevel = readNumericValue(asRecord(classRecord?.system)?.levels);

    return sum + Math.max(0, directLevel ?? nestedLevel ?? 0);
  }, 0);

  return totalClassLevels >= 1 ? totalClassLevels : 1;
}

function renderMilestonesFallback(context: MilestonesTemplateContext): string {
  const headingHtml = "<h3>Personal Milestones</h3>";
  const topMatterHtml =
    context.topMatterHtml !== ""
      ? `<div class="player-milestones-tab__top-matter">${context.topMatterHtml}</div>`
      : "";
  const progressHtml = renderProgressFallback(context.progress);

  if (!context.hasSections) {
    return `${headingHtml}${topMatterHtml}${progressHtml}<p class="player-milestones-empty-state">No shared milestone sections are configured yet.</p>`;
  }

  const sectionsHtml = context.sections
    .map((section) => {
      const itemsHtml = section.items
        .map((item) =>
          renderItemFallback(
            section.id,
            item,
            section.canManageCustomItems,
            section.canToggleMilestones
          )
        )
        .join("");
      const emptyState = section.hasItems
        ? ""
        : '<p class="player-milestones-empty-state">No milestones are defined for this section yet.</p>';

      const addRowHtml = section.canManageCustomItems
        ? `
          <div class="player-milestones-tab__custom-add" data-custom-add-row="true" data-section-id="${escapeHtml(section.id)}">
            <div class="player-milestones-tab__custom-fields">
              <input
                type="text"
                data-custom-add-title-input="true"
                data-enter-action="add-custom-item"
                placeholder="Custom title"
              />
              <input
                type="text"
                data-custom-add-description-input="true"
                data-enter-action="add-custom-item"
                placeholder="Custom description"
              />
            </div>
            <button
              type="button"
              class="player-milestones-tab__icon-button"
              data-action="add-custom-item"
              title="Add custom item"
              aria-label="Add custom item"
              disabled
            >
              <i class="fa-solid fa-plus" aria-hidden="true"></i>
            </button>
          </div>
        `
        : "";

      return `
        <section class="player-milestones-tab__section" data-section-id="${escapeHtml(section.id)}">
          <header class="player-milestones-tab__section-header">
            <h3>${escapeHtml(section.name)}</h3>
          </header>
          <div class="player-milestones-tab__items">${itemsHtml || emptyState}</div>
          ${addRowHtml}
        </section>
      `;
    })
    .join("");

  return `${headingHtml}${topMatterHtml}${progressHtml}<div class="player-milestones-tab__sections">${sectionsHtml}</div>`;
}

function renderProgressFallback(progress: MilestonesTemplateProgress): string {
  const currentValueHtml = progress.canEditCurrent
    ? `<input type="number" min="0" step="1" value="${progress.current}" data-progress-current-input="true" aria-label="Current milestone progress" />`
    : `<strong>${progress.current}</strong>`;
  const readyHtml = progress.isReady
    ? '<span class="player-milestones-tab__progress-ready">Ready to level up</span>'
    : "";
  const disabledAttribute = progress.canLevelUp ? "" : " disabled";

  return `
    <div class="player-milestones-tab__progress" data-milestones-progress="true">
      <div class="player-milestones-tab__progress-main">
        <span class="player-milestones-tab__progress-fraction">${currentValueHtml} / <strong>${progress.targetCost}</strong></span>
        <div class="player-milestones-tab__progress-actions">
          ${readyHtml}
          <button
            type="button"
            class="player-milestones-tab__button"
            data-action="level-up"${disabledAttribute}
          >
            Level up
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderItemFallback(
  sectionId: string,
  item: MilestonesTabItemData,
  canManageCustomItems: boolean,
  canToggleMilestones: boolean
): string {
  const checkedAttribute = item.checked ? " checked" : "";
  const disabledAttribute = canToggleMilestones ? "" : " disabled";
  const descriptionHtml =
    item.description.trim() !== ""
      ? `<p class="player-milestones-tab__description">${escapeHtml(item.description)}</p>`
      : "";

  if (item.isCustom) {
    if (!canManageCustomItems) {
      return `
        <label class="player-milestones-tab__item">
          <input type="checkbox" data-milestone-checkbox="true" data-section-id="${escapeHtml(sectionId)}" data-item-id="${escapeHtml(item.id)}" data-custom-item="true"${checkedAttribute}${disabledAttribute} />
          <span class="player-milestones-tab__item-copy">
            <strong>${escapeHtml(item.label)}</strong>
            ${descriptionHtml}
          </span>
        </label>
      `;
    }

    return `
      <div class="player-milestones-tab__item player-milestones-tab__item--custom" data-custom-item-row="true" data-section-id="${escapeHtml(sectionId)}" data-item-id="${escapeHtml(item.id)}" data-editing="false">
        <div class="player-milestones-tab__custom-display">
          <label class="player-milestones-tab__item">
            <input type="checkbox" data-milestone-checkbox="true" data-section-id="${escapeHtml(sectionId)}" data-item-id="${escapeHtml(item.id)}" data-custom-item="true"${checkedAttribute}${disabledAttribute} />
            <span class="player-milestones-tab__item-copy">
              <strong>${escapeHtml(item.label)}</strong>
              ${descriptionHtml}
            </span>
          </label>
          <div class="player-milestones-tab__item-actions">
            <button type="button" class="player-milestones-tab__icon-button" data-action="edit-custom-item" title="Edit custom item" aria-label="Edit custom item">
              <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
            </button>
            <button type="button" class="player-milestones-tab__icon-button player-milestones-tab__button--danger" data-action="remove-custom-item" title="Remove custom item" aria-label="Remove custom item">
              <i class="fa-solid fa-trash" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <div class="player-milestones-tab__custom-editor">
          <div class="player-milestones-tab__custom-fields">
            <input type="text" value="${escapeHtml(item.label)}" data-custom-title-input="true" data-enter-action="save-custom-item" placeholder="Custom title" />
            <input type="text" value="${escapeHtml(item.description)}" data-custom-description-input="true" data-enter-action="save-custom-item" placeholder="Custom description" />
          </div>
          <div class="player-milestones-tab__item-actions">
            <button type="button" class="player-milestones-tab__icon-button" data-action="save-custom-item" title="Save custom item" aria-label="Save custom item"${item.description.trim() === "" ? " disabled" : ""}>
              <i class="fa-solid fa-floppy-disk" aria-hidden="true"></i>
            </button>
            <button type="button" class="player-milestones-tab__icon-button" data-action="cancel-custom-item" title="Cancel edit" aria-label="Cancel edit">
              <i class="fa-solid fa-xmark" aria-hidden="true"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <label class="player-milestones-tab__item">
      <input type="checkbox" data-milestone-checkbox="true" data-section-id="${escapeHtml(sectionId)}" data-item-id="${escapeHtml(item.id)}" data-custom-item="false"${checkedAttribute}${disabledAttribute} />
      <span>
        <strong>${escapeHtml(item.label)}</strong>
        ${descriptionHtml}
      </span>
    </label>
  `;
}

function actorHasInspiration(actor: UpdateableActorLike): boolean {
  const system = asRecord(actor.system);
  const attributes = asRecord(system?.attributes);
  const inspiration = attributes?.inspiration;

  if (inspiration === true) {
    return true;
  }

  return asRecord(inspiration)?.value === true;
}

function canCurrentUserManageCustomItems(): boolean {
  return typeof game !== "undefined" && game.user?.isGM === true;
}

function canCurrentUserToggleMilestones(application: unknown, actor: ActorFlagLike): boolean {
  if (typeof game === "undefined") {
    return true;
  }

  if (game.user?.isGM === true) {
    return true;
  }

  const ownershipSource = application as { isEditable?: boolean; isOwner?: boolean };
  if (ownershipSource.isEditable === true || ownershipSource.isOwner === true) {
    return true;
  }

  const actorWithOwnership = actor as ActorFlagLike & {
    isOwner?: boolean;
    testUserPermission?: (user: unknown, permission: string) => boolean;
  };

  if (actorWithOwnership.isOwner === true) {
    return true;
  }

  if (typeof actorWithOwnership.testUserPermission !== "function" || !game.user) {
    return false;
  }

  return actorWithOwnership.testUserPermission(game.user, "OWNER");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function hasNonEmptyValue(value: string | undefined): boolean {
  return typeof value === "string" && value.trim() !== "";
}

function readNumericValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim() !== "") {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? Math.trunc(numericValue) : null;
  }

  const record = asRecord(value);
  if (!record) {
    return null;
  }

  return readNumericValue(record.value);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
