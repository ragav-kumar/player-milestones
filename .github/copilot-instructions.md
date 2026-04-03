# Copilot Instructions for `player-milestones`

## Project context
- Build a **Foundry VTT module** in **TypeScript**.
- Target stack: **Foundry VTT v13** and **dnd5e v5.x**.
- Preferred tooling: **npm + Vite + ESLint + Prettier**.
- Local testing will use a **Windows junction** into the local Foundry `Data/modules/player-milestones` folder.
- This project is **personal-use only**; the primary workflow is local Foundry testing, with eventual GitHub tagging for Forge use rather than full public release automation.

## Workflow rules
- Work on a **dedicated feature branch**; do not assume direct work on `main`/`master`.
- Make **small, reviewable changes** and keep files focused.
- After creating this instructions file, **stop and wait for explicit user confirmation** before generating any other project files.
- Do not claim success without verification evidence (`lint`, `typecheck`, `build`, or Foundry-side checks as appropriate).

## Coding standards
- Use **strict TypeScript** and ES modules.
- Prefer **named exports**, small helper modules, and clear separation of Foundry hooks, app classes, and UI integration.
- Avoid `any` and especially `as any` casts; configure ESLint to enforce this.
- Localization is **not required** for this project; plain English UI strings are acceptable.
- Include clear **doc comments** explaining the purpose of each module, class, hook, and key helper as part of the educational scaffold.
- Keep comments concise and useful; avoid redundant narration.
- Follow existing repo conventions if they appear later.

## Initial feature scope
Only scaffold the first pass for these placeholder features:
1. A **settings page/menu entry** for the module, with no real content yet.
2. A **DnD5e character-sheet tab** named `milestones`, showing visible label `M`, with tooltip text `personal milestones`, and no real content yet.

## Foundry-specific guidance
- Keep module bootstrapping in a clear entrypoint such as `src/module.ts`.
- Isolate DnD5e sheet integration in a dedicated file so future milestone UI work remains easy to extend.
- Prefer the **least brittle** hook/render integration for dnd5e v5 character sheets, with version-sensitive assumptions kept explicit.
- Keep placeholder UI minimal and stable before adding data storage or richer interactions.

## Quality bar
- Where practical, follow **red/green testing**: write a failing test first, confirm it fails, implement the minimal fix, then confirm the test passes.
- Before calling a step complete, verify the relevant commands succeed:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
- Track the `npm audit` report during setup and maintenance, and run `npm audit fix` when appropriate.
- Do **not** use `npm audit fix --force` unless the user explicitly approves a breaking change.

If Foundry behavior is involved, verify in-app that the module loads and the placeholder UI appears without console errors.
