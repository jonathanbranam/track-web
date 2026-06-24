## Why

While tuning Dungeon Tactics Solo, the game designer needs to try different unit balance values (max HP, movement) without editing source code and rebuilding. Today `moveRange(unit)` and max HP are hardcoded per archetype, so every balance experiment is a code change. An in-app "Admin" mode lets the designer adjust these live during a session and immediately feel the effect on the board.

## What Changes

- Add an **Admin** toggle button anchored in the upper-right of the Dungeon Tactics Solo screen. It is off by default and reflects its on/off state visually.
- When Admin is **off**, gameplay is unchanged.
- When Admin is **on**, the unit info popup gains inline editing for two stats: **max HP** and **movement (move range)**. Attack damage and other stats remain read-only for now.
- Edits apply **per archetype** (`unitType`): changing the value shown in a melee unit's popup updates max HP / movement for all melee units; ranger, rogue, magic-user, short-range, and long-range archetypes each have their own values.
- Edited values feed the engine's stat helpers (`moveRange`, and a new max-HP source) so walk ranges, HP bars/clamping, and the popup display all reflect the override immediately.
- Overrides are **session-only**: they live in memory and reset when the game/page reloads. Persistence will be added later by a separate change.

## Capabilities

### New Capabilities
- `dungeon-tactics-admin-mode`: The Admin toggle, the admin-mode on/off state, and the in-popup editing of per-archetype max HP and movement values (session-scoped overrides) that drive the engine's stat helpers.

### Modified Capabilities
<!-- None. The existing dungeon-tactics-unit-selection popup display requirements still hold; admin mode adds an editing affordance on top rather than changing those requirements. -->

## Impact

- **App**: `dungeon-tactics-solo` (`client-games/src/games/dungeon-tactics-solo/`)
- **Stat helpers**: `pc.ts` — `moveRange()` (and any HP clamping that assumes a flat max of 3) must read from the per-archetype override source instead of returning constants.
- **Types**: `types.ts` — introduce a per-archetype stat-override shape (max HP + move range keyed by `unitType`); no new persisted fields on `Unit`.
- **Scene/UI**: `DungeonTacticsScene.ts` — the in-Phaser info popup gains editable max HP / movement controls gated on admin mode; a new upper-right Admin toggle control and its on/off state.
- **No backend, API, or DB changes** — overrides are entirely client-side and in-memory.
- **No deploy-config changes** (no new app or subdomain).
