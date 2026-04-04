# Player Milestones Specification

> This document is the behavioral source of truth for the `player-milestones` module.
>
> **AI edit policy:** `specfication.md` is human-owned and must not be modified by AI. If a requested change would alter this specification, the AI should ask the human to update the spec first instead of editing this file.

## 1. Scope

The module provides a **personal milestones workflow for DnD5e player characters** in Foundry VTT. The idea is that, in addition to whatever rules the GM is using, players also need to attain a certain number of personal growth milestones. This is used to encourage player to explore their toolkit, engage in roleplay, and dive deeper into their understanding of their characters and the setting.

It has two user-facing surfaces:

1. a **shared world settings editor** for configuring milestone defaults, and
2. a **milestones tab on supported DnD5e character sheets** for tracking each character’s progress.

## 2. Shared Settings Behaviour

### 2.1 Access
- A **GM-only** settings submenu for the module is available from Foundry’s configuration UI.
- Opening that submenu shows a dedicated **Player Milestones settings window**.

### 2.2 Shared content managed there
The shared settings window defines content that applies to **all player characters in the world**:

- **Top matter**: shared explanatory rich text shown near the top of every milestones tab.
- **Default milestone sections**: an ordered list of named sections.
- **Milestones within each section**: an ordered list of entries, each with a title and optional description.
- **Level costs**: the milestone cost required for each level from **1 through 19**.

### 2.3 Editing behavior
- The GM can **add, remove, and reorder** sections.
- The GM can **add, remove, and reorder** milestones within a section.
- Empty rows are not treated as meaningful saved milestones.
- Saving the form updates the world’s shared defaults for all characters.
- A **Reset Defaults** action restores the default level-cost table.

### 2.4 Default level-cost table
Unless changed by the GM, the default cost to reach the next level is:

- **3 milestones** for levels **1–3**
- **4 milestones** for levels **4–10**
- **5 milestones** for levels **11–19**

---

## 3. Character Sheet Tab Behavior

### 3.1 Availability
- The module adds a **milestones tab** to supported **DnD5e character sheets**.
- The tab is represented by an **icon-only tab button** with the tooltip and accessible label **“Personal Milestones”**.
- If the rendered application is not a supported character actor sheet, the milestones content should not behave as a normal character tracker.

### 3.2 Initial panel state
When opened on a supported character sheet, the tab shows:

- the heading **“Personal Milestones”**,
- a **progress tracker** for the next level,
- the shared top matter, if any exists,
- the configured shared milestone sections and items,
- any actor-specific custom milestone items.

### 3.3 Empty states
- If no shared sections have been configured, the tab shows an empty-state message indicating that **no shared milestone sections are configured yet**.
- If a section exists but contains no items, that section shows an empty-state message indicating that **no milestones are defined for the section yet**.
- If milestones content is rendered without a usable character actor, the panel shows that **milestones are only available on character actors**.

---

## 4. Progress Tracker Behavior

### 4.1 Display
- The tab shows progress in **`current / target`** form.
- A **Level up** button is always visible. The button is disabled if current &lt; target.
- When `current` is greater than or equal to `target`, the tab shows a **“Ready to level up”** indicator.

### 4.2 Editing permissions
- A **GM** can directly edit the current progress value.
- Non-GM users see the current value as read-only.

### 4.3 Level-cost resolution
- The target milestone cost is based on the actor’s current level and the shared level-cost table.
- If the actor’s level is above the configured range, the highest configured level cost is used.

### 4.4 Level-up action
Using **Level up** has the following effects:
- Recalculate the target cost from the actor’s current level
- Tracker resets to **`0 / new target`**

---

## 5. Milestone Item Behavior

### 5.1 Shared milestone items
- Shared milestone items come from the world settings and appear for every player character.
- Each shared item shows:
  - a checkbox,
  - a title,
  - an optional description.

### 5.2 Custom milestone items
- Each section may also contain **custom, actor-specific milestone items**.
- Custom items also display a checkbox, title, and optional description.
- Custom items belong only to the current actor and do not become shared defaults.

### 5.3 Permission rules
- **GMs** can add, edit, and remove custom milestone items.
- **GMs and actor owners** can toggle milestone checkboxes and use the **Level up** button.
- Viewers without the needed ownership rights see milestone checkboxes and the **Level up** button as **disabled**.
- Non-GM viewers can still read the text of default and custom milestone items, including their descriptions.

### 5.4 Editing rules for custom items
- Only **one custom item row** may be in edit mode at a time.
- Starting to edit a different row closes the previous edit row.
- Cancelling or abandoning an edit restores the row to its last rendered values.
- Pressing **Enter** in a custom-item input triggers the matching add/save action.
- A custom item must have a non-empty title and description to be added or saved.
- If title or description are empty, then the add or save button is disabled, and pressing enter is ignored.

---

## 6. Progress and Rewards Rules

- Checking a milestone increases the current progress by **1**.
- Unchecking a milestone decreases the current progress by **1**.
- Current progress is never allowed to drop below **0**.
- When a milestone is checked and the actor does not already have **Inspiration**, the actor gains Inspiration.
- Rechecking or further interaction should not repeatedly grant Inspiration when it is already present.

---

## 7. Persistence and Synchronization Rules

### 7.1 Shared versus per-character data
- Shared settings are **world-wide defaults**.
- Each actor keeps their own:
  - checked milestone state,
  - custom milestone items,
  - current progress and target cost.

### 7.2 Sync behavior when shared defaults change
- **Renaming** a shared section or shared milestone does **not** erase existing progress for the same logical entry.
- **Reordering** shared sections or milestones does **not** erase existing progress.
- Newly added shared milestones appear as **unchecked** for actors.
- Shared sections or milestone entries that are removed from the defaults no longer remain in actor milestone state.

---

## 8. Non-Goals for the Current Product

The current module behavior does **not** include:

- automatic character-level advancement,
- non-character milestone tracking,
- player-managed creation or deletion of custom milestone items without GM permissions,
- any requirement for localization.
