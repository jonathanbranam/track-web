## Why

Orbital Dodger's tuning panel exists only in development builds, and whatever it is set to is lost on reload. The only way to keep a tuned feel is to export it and paste it over `DEFAULT_TUNING` in source, then deploy. Tuning has to happen on a real phone against the production site (the LAN dev URL isn't a secure context, and the game plays differently on a laptop), so the panel needs to ship in production. Several feels also need to be kept side by side and compared, so they need to be saved, named, and shared.

## What Changes

- The tuning panel ships in **production builds** too, not only in development. It stays behind the same ⚙ button and is closed by default.
- **Saved tuning configs**, stored on the server and shared by every player. Anyone can **create** a config from the current panel values, **rename** it, **save** the current values over it, and **delete** it.
- A **Default** config always exists and is what a new player gets. Saving over it first asks for confirmation: *"This will replace the default config for all players."* It cannot be deleted or renamed.
- A **config dropdown** in the panel chooses which config to play. The choice is remembered per browser and used for later games. If the remembered config no longer exists, the game loads the Default and forgets the old choice.
- Changes made in the panel still apply live and can now be **unsaved**. The panel shows when they differ from the selected config and offers to revert.
- The Default config starts out as the shipped `DEFAULT_TUNING`. Stored values are layered over the shipped values, so a tuning key added later gets its shipped value in every existing config.
- Export still works, and **Reset to defaults** now means the shipped values.

## Capabilities

### New Capabilities
<!-- none: configs are part of the game's own capability -->

### Modified Capabilities
- `games-orbital-dodger`: the requirement "Development-only tuning controls" is replaced by "Tuning controls" (in every build, with no production exclusion). New requirements are added for saved tuning configs, the protected Default config, and the per-browser config selection with its fallback to Default.

## Impact

- **Backend**: new table `game_od_configs` (migration `0039`, with the Default row seeded), a repository with its interface, and CRUD routes under `/api/games/orbital-dodger/configs`. They use the existing `/api/games/*` session auth. `TABLE_NAMES` in `src/db.ts` gets the new table.
- **Client** (`client-games/src/games/orbital-dodger/`): `TuningPanel.tsx` loses its dev-only framing and gains config management. `OrbitalDodgerGame.tsx` loads the configs, resolves the selection, and applies it to the scene. The `import.meta.env.DEV` gate on the panel is removed; the `__orbitalScene` automation handle stays dev-only. `client-games/src/api.ts` gets config API calls.
- **Docs**: `openapi.yaml` (new routes) and `llm-context.md` (the panel is no longer dev-only, and configs are shared). `docs/games/planning.md` gets a note on leaderboard integrity.
- **Leaderboard**: not changed. Every config still submits to the single `classic` leaderboard (see design.md, Risks).
