## Context

Dungeon Tactics Solo (`client-games/src/games/dungeon-tactics-solo/`) is a Phaser game driven
by a React controller. `DungeonTacticsGame.tsx` owns the `GameState` (`stateRef`), wires Phaser
input events (`unit-tapped`, `popup-attack-toggle`, `hud-undo`, …) to state mutations, and calls
`scene.redraw(state)` after each. `DungeonTacticsScene.ts` renders the board and a fixed in-canvas
HUD (rendered by a dedicated UI camera so it ignores board pan/zoom). The HUD is rebuilt from state
on every `drawHud()`; buttons are graphics + a `Phaser.Geom.Rectangle` hit region tested in the
pointer handler, which then `game.events.emit(...)`.

Unit stats are derived, not stored: `moveRange(unit)` and `attackDamage(unit)` in `pc.ts` return
constants keyed off `unit.unitType`; max HP is a literal `3` (see `drawUnitPopup` `const maxHp = 3`
and `drawHpPips`). Only current `hp` is stored on `Unit`. The info popup is drawn purely with Phaser
graphics/text — there are no HTML form inputs.

This change adds an Admin toggle and, while on, per-archetype editing of max HP and movement in the
popup. Per the proposal, overrides are session-only; persistence is a separate future change.

## Goals / Non-Goals

**Goals:**
- Upper-right Admin toggle that enables designer capabilities; off by default; fixed to the HUD.
- While admin is on, edit **max HP** and **movement** for the selected unit's archetype in the popup.
- Edits apply per `unitType` and immediately drive the engine (walk-tile computation, HP display/clamp).
- Keep the engine's behavior identical when admin is off.
- Session-scoped overrides with zero new persistence surface.

**Non-Goals:**
- Persisting overrides across reloads (future change).
- Editing attack damage or any stat other than max HP and movement.
- Editing individual units independently of their archetype.
- Any backend, API, DB, or deploy-config change.

## Decisions

### 1. Overrides live in a single session-scoped module, keyed by `unitType`
Add a small module (e.g. `statOverrides.ts`) holding two mutable maps — `maxHp[unitType]` and
`moveRange[unitType]` — seeded with today's defaults (move: `melee`/`rogue` → 4, else 3; maxHp: 3 for
all). It exposes `getMoveRange(unitType)`, `getMaxHp(unitType)`, `setMoveRange(unitType, n)`,
`setMaxHp(unitType, n)`, and a `resetOverrides()` for tests. `moveRange(unit)` in `pc.ts` becomes a thin
delegate to `getMoveRange(unit.unitType)`, so every existing caller (`validMoveDests`, `remainingMove`,
NPC planning, the popup) picks up overrides with no signature changes.

- **Why not store overrides in `GameState`?** `moveRange(unit)` is called across `pc.ts`/`npc.ts` without
  state; threading state (or an overrides arg) through every call site is a large refactor, and designer
  tuning values are not game state — they should not be captured by the undo stack or match reset.
- **Why module-level mutable state is acceptable here:** it is explicitly session-only. Reset-on-reload is
  free (the module re-initializes on page load), satisfying the "reload discards overrides" requirement.
  The module is the seam the future persistence change will hook into.

### 2. Admin mode is scene-local UI state, not game state
The scene holds `private adminMode = false`. The Admin hit region toggles it and re-runs `drawHud()`.
Admin mode does not touch `GameState`, is not undoable, and does not need to round-trip through the
controller. The toggle is drawn in `drawHud()` near the existing top-right Reset button, with an
active/highlighted fill when on (mirroring the Attack button's active style).

### 3. Editing uses on-canvas steppers, not text inputs
Because the popup is pure Phaser (no DOM, and the app runs in a non-secure LAN context where focus/keyboard
inputs are awkward on iOS), each editable stat renders as a `−  value  +` stepper. The two stepper buttons
get hit regions recorded on `popupHit` (extended with `hpMinus/hpPlus/moveMinus/movePlus`). Steppers only
appear while `adminMode` is on; otherwise the popup shows the same read-only stat lines as today.
Bounds are clamped to sensible integers: **max HP 1–9**, **movement 0–12**.

### 4. Stat edits emit one event to the controller; the controller is the single mutation point
Tapping a stepper emits `admin-stat-edit { stat: 'maxHp' | 'move', unitType, delta: +1 | -1 }`. The
controller applies it via the override module and then redraws:
- **Movement:** call `setMoveRange`; no `GameState` change is needed (walk tiles are recomputed from
  `validMoveDests` on the next `redraw`).
- **Max HP:** call `setMaxHp`, then shift every affected unit's current `hp` by the *effective*
  delta (`newMax − oldMax`, post-clamp) in both directions: raising raises current `hp`
  (3/3 → 4/4, 1/3 → 2/4), lowering lowers it (4/4 → 3/3, 2/4 → 1/3), with current `hp` floored at
  1 so lowering max HP can never kill a unit (`max(1, hp + effectiveDelta)`). Then redraw. This is
  the only `GameState` mutation in this feature.

Routing both through the controller keeps the existing "controller owns state mutations + redraw" pattern
intact, even though movement alone could be handled in-scene.

### 5. On-board HP pips honor the override max
`drawHpPips` currently assumes `maxHp = 3`. Update it (and the popup's `maxHp`) to read
`getMaxHp(unit.unitType)` so the board and popup stay consistent with edited values.

## Risks / Trade-offs

- **Global mutable engine state** (overrides module) in an otherwise functional engine → Mitigation:
  confine to one documented module flagged session-only/temporary; expose `resetOverrides()` so tests stay
  deterministic; it is the intended hook for the future persistence change.
- **Match reset (`hud-reset`) rebuilds units at default HP via `initialState`** while overrides persist for
  the session → Mitigation: keep overrides across reset (session-scoped per spec) and clamp/seed unit HP
  to `getMaxHp` during init so a reset match still respects edited max HP.
- **Pip rendering with large max HP** (e.g. maxHp 9 draws 9 pips) could crowd the small unit sprite →
  Mitigation: cap the editable max at 9; revisit pip layout only if it looks bad in verification.
- **NPC archetypes are editable too** (short-range/long-range) — intended ("all units"), but raising NPC
  movement makes the AI stronger; acceptable for a designer tuning tool.

## Migration Plan

Pure client-side feature. Ship via the normal `client-games` Vite build; no DB migration, no Caddy/deploy
changes. Rollback is a straight revert of the change — no persisted data to clean up.

## Open Questions

- Final stepper bounds (HP 1–9, move 0–12 are proposed defaults) — confirm during verification.
- Whether the Admin toggle should also gate future designer capabilities behind the same flag (assumed yes;
  this change only wires the first capability).
