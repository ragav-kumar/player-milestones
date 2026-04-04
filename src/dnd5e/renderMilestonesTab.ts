import { MODULE_ID } from "../constants";
import { getStandardMilestonesSettings } from "../settings/standardMilestones";
import {
  ACTOR_MILESTONES_FLAG_KEY,
  buildMilestonesTabData,
  normalizeActorMilestonesState,
  removeCustomMilestone,
  saveActorMilestonesState,
  setMilestoneChecked,
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
  items: MilestonesTabItemData[];
}

interface MilestonesTemplateContext extends Record<string, unknown> {
  topMatterHtml: string;
  hasSections: boolean;
  sections: MilestonesTemplateSection[];
}

interface FormActionElement extends Element {
  dataset: DOMStringMap;
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
  const tabData = buildMilestonesTabData(settings, normalizedState);
  const context: MilestonesTemplateContext = {
    topMatterHtml: await enrichTopMatterHtml(tabData.topMatter),
    hasSections: tabData.sections.length > 0,
    sections: tabData.sections.map((section) => ({
      ...section,
      hasItems: section.items.length > 0
    }))
  };

  panel.innerHTML = await renderMilestonesTemplate(context);
  bindMilestonesTabEvents(panel, actor, application, root);

  if (JSON.stringify(rawState ?? null) !== JSON.stringify(normalizedState)) {
    void saveActorMilestonesState(actor, normalizedState);
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
  panel.addEventListener("submit", (event) => {
    void onPanelSubmit(event, actor, application, root);
  });
  panel.addEventListener("click", (event) => {
    void onPanelClick(event, actor, application, root);
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
  if (input.dataset.milestoneCheckbox !== "true") {
    return;
  }

  const sectionId = input.dataset.sectionId ?? "";
  const itemId = input.dataset.itemId ?? "";

  if (sectionId === "" || itemId === "") {
    return;
  }

  await updateActorMilestones(actor, application, root, (state) =>
    setMilestoneChecked(state, {
      sectionId,
      itemId,
      checked: input.checked,
      isCustom: input.dataset.customItem === "true"
    })
  );
}

async function onPanelSubmit(
  event: Event,
  actor: ActorFlagLike,
  application: unknown,
  root: ParentNode
): Promise<void> {
  if (!(event.target instanceof HTMLFormElement)) {
    return;
  }

  if (event.target.dataset.customAddForm !== "true") {
    return;
  }

  event.preventDefault();

  const sectionId = event.target.dataset.sectionId ?? "";
  const rawLabel = new FormData(event.target).get("customLabel");
  const label = typeof rawLabel === "string" ? rawLabel : "";

  if (sectionId === "" || label.trim() === "") {
    return;
  }

  await updateActorMilestones(actor, application, root, (state) =>
    upsertCustomMilestone(state, {
      sectionId,
      label
    })
  );
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
  if (action === "save-custom-item") {
    event.preventDefault();

    const row = actionElement.closest<HTMLElement>("[data-custom-item-row='true']");
    const input = row?.querySelector<HTMLInputElement>("[data-custom-label-input='true']");
    const sectionId = row?.dataset.sectionId ?? "";
    const itemId = row?.dataset.itemId ?? "";
    const label = input?.value ?? "";

    if (sectionId === "" || itemId === "" || label.trim() === "") {
      return;
    }

    await updateActorMilestones(actor, application, root, (state) =>
      upsertCustomMilestone(state, {
        sectionId,
        itemId,
        label
      })
    );
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

  const maybeTextEditor = (globalThis as typeof globalThis & {
    TextEditor?: {
      enrichHTML?: (content: string, options?: object) => Promise<string> | string;
    };
  }).TextEditor;

  const enrichHTML = maybeTextEditor?.enrichHTML;
  if (typeof enrichHTML !== "function") {
    return value;
  }

  const enriched = await enrichHTML(value, { async: true });
  return typeof enriched === "string" ? enriched : value;
}

async function renderMilestonesTemplate(context: MilestonesTemplateContext): Promise<string> {
  const renderTemplateFn = (globalThis as typeof globalThis & {
    renderTemplate?: (path: string, data: object) => Promise<string>;
  }).renderTemplate;

  if (typeof renderTemplateFn === "function") {
    return renderTemplateFn(`modules/${MODULE_ID}/templates/milestones-tab.hbs`, context);
  }

  return renderMilestonesFallback(context);
}

function renderMilestonesFallback(context: MilestonesTemplateContext): string {
  const topMatterHtml =
    context.topMatterHtml !== ""
      ? `<div class="player-milestones-tab__top-matter">${context.topMatterHtml}</div>`
      : "";

  if (!context.hasSections) {
    return `${topMatterHtml}<p class="player-milestones-empty-state">No shared milestone sections are configured yet.</p>`;
  }

  const sectionsHtml = context.sections
    .map((section) => {
      const itemsHtml = section.items
        .map((item) => renderItemFallback(section.id, item))
        .join("");
      const emptyState = section.hasItems
        ? ""
        : '<p class="player-milestones-empty-state">No milestones are defined for this section yet.</p>';

      return `
        <section class="player-milestones-tab__section" data-section-id="${escapeHtml(section.id)}">
          <header class="player-milestones-tab__section-header">
            <h3>${escapeHtml(section.name)}</h3>
          </header>
          <div class="player-milestones-tab__items">${itemsHtml || emptyState}</div>
          <form class="player-milestones-tab__custom-add" data-custom-add-form="true" data-section-id="${escapeHtml(section.id)}">
            <input type="text" name="customLabel" placeholder="Add a custom item for this character" />
            <button type="submit">Add</button>
          </form>
        </section>
      `;
    })
    .join("");

  return `${topMatterHtml}<div class="player-milestones-tab__sections">${sectionsHtml}</div>`;
}

function renderItemFallback(sectionId: string, item: MilestonesTabItemData): string {
  const checkedAttribute = item.checked ? " checked" : "";

  if (item.isCustom) {
    return `
      <div class="player-milestones-tab__item player-milestones-tab__item--custom" data-custom-item-row="true" data-section-id="${escapeHtml(sectionId)}" data-item-id="${escapeHtml(item.id)}">
        <label class="player-milestones-tab__checkbox-label">
          <input type="checkbox" data-milestone-checkbox="true" data-section-id="${escapeHtml(sectionId)}" data-item-id="${escapeHtml(item.id)}" data-custom-item="true"${checkedAttribute} />
          <span>Custom</span>
        </label>
        <input type="text" value="${escapeHtml(item.label)}" data-custom-label-input="true" />
        <div class="player-milestones-tab__item-actions">
          <button type="button" data-action="save-custom-item">Save</button>
          <button type="button" data-action="remove-custom-item">Remove</button>
        </div>
      </div>
    `;
  }

  const descriptionHtml =
    item.description.trim() !== ""
      ? `<p class="player-milestones-tab__description">${escapeHtml(item.description)}</p>`
      : "";

  return `
    <label class="player-milestones-tab__item">
      <input type="checkbox" data-milestone-checkbox="true" data-section-id="${escapeHtml(sectionId)}" data-item-id="${escapeHtml(item.id)}" data-custom-item="false"${checkedAttribute} />
      <span>
        <strong>${escapeHtml(item.label)}</strong>
        ${descriptionHtml}
      </span>
    </label>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
