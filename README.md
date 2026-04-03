# `player-milestones`

Personal-use Foundry VTT module scaffold for **Foundry v13** and **dnd5e v5.x**.

Current placeholder features:
- a module **settings page** entry
- a DnD5e character-sheet **`M` tab** with tooltip `personal milestones`

---

## One-time setup

### 1) Install dependencies

```bash
npm install
```

### 2) Create the local Foundry module link

This repo includes a helper script that creates a Windows junction from your local Foundry modules folder to this repo root:

```bash
npm run link:foundry
```

By default it targets:

```text
C:\Users\<you>\AppData\Local\FoundryVTT\Data\modules\player-milestones
```

You can override the location with either of these environment variables if needed:
- `FOUNDRY_DATA_PATH`
- `FOUNDRY_MODULES_PATH`

---

## Normal development workflow

### Start watch build

```bash
npm run dev
```

### Run checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

### Audit dependencies

```bash
npm audit
```

If appropriate, you may run:

```bash
npm audit fix
```

> Do **not** use `npm audit fix --force` unless you explicitly want a breaking change.

---

## Foundry testing flow

1. Start Foundry VTT
2. Open your local `dnd5e` world
3. Enable the `Player Milestones` module
4. Open a character sheet and verify:
   - the `M` tab appears
   - the tooltip says `personal milestones`
   - the tab content is still placeholder-only
5. Open module settings and confirm the placeholder settings page opens

---

## Project notes

- Source entrypoint: `src/module.ts`
- Junction helper: `scripts/link-foundry.mjs`
- Manifest: `module.json`
- Build output: `dist/`
- This project is **personal-use only** and optimized for local Foundry testing first
