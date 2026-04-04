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
});
