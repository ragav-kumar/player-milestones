import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("milestones tab template", () => {
  it("does not nest a custom-item add form inside the actor sheet form", () => {
    const templatePath = resolve(import.meta.dirname, "../templates/milestones-tab.hbs");
    const template = readFileSync(templatePath, "utf8");

    expect(template).not.toContain('<form class="player-milestones-tab__custom-add"');
    expect(template).toContain('data-action="add-custom-item"');
  });

  it("gates custom milestone management controls behind the GM-only flag", () => {
    const templatePath = resolve(import.meta.dirname, "../templates/milestones-tab.hbs");
    const template = readFileSync(templatePath, "utf8");

    expect(template).toContain("{{#if canManageCustomItems}}");
    expect(template).toContain('data-action="save-custom-item"');
    expect(template).toContain('data-action="remove-custom-item"');
  });

  it("disables milestone checkboxes when the viewer cannot update progress", () => {
    const templatePath = resolve(import.meta.dirname, "../templates/milestones-tab.hbs");
    const template = readFileSync(templatePath, "utf8");

    expect(template).toContain("{{#unless ../canToggleMilestones}}disabled{{/unless}}");
  });

  it("uses title and description fields plus icon actions for custom milestones", () => {
    const templatePath = resolve(import.meta.dirname, "../templates/milestones-tab.hbs");
    const template = readFileSync(templatePath, "utf8");

    expect(template).toContain('data-custom-add-title-input="true"');
    expect(template).toContain('data-custom-add-description-input="true"');
    expect(template).toContain('data-action="edit-custom-item"');
    expect(template).toContain('fa-solid fa-plus');
    expect(template).toContain('fa-solid fa-pen-to-square');
    expect(template).toContain('fa-solid fa-floppy-disk');
    expect(template).toContain('fa-solid fa-trash');
  });

  it("marks title and description inputs so Enter can trigger the closest save or add action", () => {
    const templatePath = resolve(import.meta.dirname, "../templates/milestones-tab.hbs");
    const template = readFileSync(templatePath, "utf8");

    expect(template).toContain('data-enter-action="add-custom-item"');
    expect(template).toContain('data-enter-action="save-custom-item"');
  });

  it("includes a cancel action so custom item edits can be discarded explicitly", () => {
    const templatePath = resolve(import.meta.dirname, "../templates/milestones-tab.hbs");
    const template = readFileSync(templatePath, "utf8");

    expect(template).toContain('data-action="cancel-custom-item"');
    expect(template).toContain('fa-solid fa-xmark');
  });

  it("renders item copy inside a dedicated wrapper so long titles and descriptions can wrap safely", () => {
    const templatePath = resolve(import.meta.dirname, "../templates/milestones-tab.hbs");
    const template = readFileSync(templatePath, "utf8");

    expect(template).toContain('class="player-milestones-tab__item-copy"');
  });

  it("marks checked milestones with a dedicated state class so they can be visually dimmed", () => {
    const templatePath = resolve(import.meta.dirname, "../templates/milestones-tab.hbs");
    const template = readFileSync(templatePath, "utf8");

    expect(template).toContain("player-milestones-tab__item--checked");
    expect(template).toContain("{{#if checked}}");
  });

  it("includes styling that visually dims checked milestones", () => {
    const stylesheetPath = resolve(import.meta.dirname, "../src/styles/player-milestones.css");
    const stylesheet = readFileSync(stylesheetPath, "utf8");

    expect(stylesheet).toContain(".player-milestones-tab__item--checked");
    expect(stylesheet).toContain("opacity:");
  });
});
