## Why

Dungeon Tactics Solo currently has two editing paths onto the same unit-definition store: the **Unit editor** panel (whose edits only reach the in-memory store on **Save**) and the in-HUD **Admin** toggle (whose in-popup max-HP/movement steppers apply **live** and persist immediately). This is confusing and redundant. We want one editor with the better live-tuning feel: definition edits should affect the running match the instant they are made, while the backend is touched only on explicit **Save** and discarded only on explicit **Reload**. NPC behavior should also stay honest — editing an NPC's def must re-run its planning so the telegraphed intent reflects the new stats immediately.

## What Changes

- **Live-apply edits:** Editing any field in the Unit editor SHALL mutate the in-memory def store immediately, so the running match reflects the change with no Save and no reload. This is a behavior change from today, where the editor's edits are buffered in local React state and only applied to the store on Save.
- **Save persists only:** The **Save** button SHALL only persist the active scenario's current defs to the backend. It is no longer the moment edits first take effect (they already took effect live).
- **Reload discards live edits, into the running match:** The **Reload** button SHALL re-fetch the active scenario, replace the in-memory store, and discard unsaved live edits — applied **into the running match** (HP reconciled, affected NPCs re-planned), not by restarting the board. This is a behavior change from today, where Reload restarts the whole match via `initialState()`; restarting remains the job of **Reset**.
- **NPC re-plans on def change, granularly:** When the active defs change — by **edit** or by **Reload** — only the NPC units whose archetype's def actually changed SHALL immediately re-run planning, so their telegraphed plans (move/attack reach) reflect the new def without waiting for the next turn and without disturbing other enemies' telegraphs. Re-planning only the changed units requires a small refactor to the NPC planner (`computeNpcPlans`).
- **Retain HP reconciliation:** Each live edit SHALL reconcile current HP by the max-HP delta (a 3/3 → 4/4, a 1/3 → 2/4 on raise; 4/4 → 3/3 on lower), floored at 1 so lowering max HP can never kill a unit — preserving the current Admin-mode behavior.
- **BREAKING (designer-tooling):** Remove the **Admin** toggle and all admin-mode editing. The in-popup max-HP/movement steppers, the `admin-stat-edit` event, and the immediate single-archetype persist they performed are gone; unit tuning happens exclusively through the Unit editor. The unit info popup permanently presents stats as read-only.
- Remove the now-orphaned single-archetype write path (client `persistDef` + `api.putUnitDef`, and the backend `PUT .../scenarios/:scenario/unit-defs/:archetype` endpoint), which was only reachable from admin mode. The bulk `PUT .../unit-defs` (used by Save) remains.

## Capabilities

### New Capabilities

_None._ (This change reshapes existing editing behavior and removes a capability; no new spec file is introduced.)

### Modified Capabilities

- `persisted-unit-defs`: The editor's apply model changes from **apply-on-save** to **apply-live**:
  - The "Edits in the in-game editor panel apply to the active scenario and persist" requirement is reworded so edits mutate the in-memory store immediately on each change (with HP reconciliation, floored at 1), and **Save** only persists to the backend.
  - A new requirement is added: editing an **NPC** archetype's def re-runs that NPC's planning immediately so the telegraphed plan reflects the change.
  - The "Reload control" requirement is clarified to discard unsaved **live** edits (not just buffered, unapplied edits) and restore the last-saved scenario.
  - The write-API requirement is narrowed to drop the single-archetype `PUT .../scenarios/:scenario/unit-defs/:archetype` endpoint (orphaned with admin mode removed); the bulk write, create, set-default, and all read/storage/seed/active-scenario requirements are unchanged.
- `dungeon-tactics-admin-mode`: **Removed in full.** Every requirement (the Admin toggle, read-only-when-off, in-popup editing, per-archetype application, immediate engine effect, and HP reconciliation) is deleted — the HP-reconciliation behavior is retained but now lives under `persisted-unit-defs`'s editor flow.

## Impact

- **Client (`client-games/src/games/dungeon-tactics-solo/`):**
  - `ScenarioEditor.tsx` — field edits call the live-apply path on every change instead of buffering in local state; **Save** becomes persist-only; **Reload** unchanged in intent.
  - `DungeonTacticsGame.tsx` — a shared `applyDefChange(changedArchetypes)` path drives live store mutation + HP reconcile + granular NPC re-plan, fed by both the editor commit and `reloadStore`; `reloadStore` becomes a hot def-swap (diff + re-plan) instead of an `initialState()` restart; remove the `admin-stat-edit` listener.
  - `npc.ts` — `computeNpcPlans` gains an optional `replanIds` parameter so only changed NPC units are re-planned while unchanged ones keep their existing telegraph (no-arg callers unchanged).
  - `DungeonTacticsScene.ts` — remove the Admin HUD button, its tap handler, the admin branch of the unit popup (extra height + stepper rows) and `drawStatStepper`/stepper helpers.
  - `defStore.ts` — remove `persistDef` (orphaned single-archetype persist).
- **Client API (`client-games/src/api.ts`):** remove `putUnitDef` (single-archetype).
- **Backend (`src/routes/games.ts`):** remove the single-archetype `PUT` route; **`src/routes/games.unit-defs.test.ts`** drop/adjust its cases; **`openapi.yaml`** remove the `.../unit-defs/{archetype}` path.
- **Specs:** delete `openspec/specs/dungeon-tactics-admin-mode/`; update `openspec/specs/persisted-unit-defs/spec.md`.
- **Retained:** repository per-archetype upsert (`repositories/sqlite/gameUnitDefs.ts`), bulk PUT, scenario CRUD, and the engine read seam (`getMaxHp`/`getMoveRange`/`setMaxHp`/`setMoveRange`/`setDef`). `computeNpcPlans`'s existing no-arg behavior is preserved; only the new optional `replanIds` path is added.
- **Supersedes `dungeon-tactics-remove-admin-mode`:** that proposal-only change removed admin mode without the live-edit reshape. It has been abandoned (directory deleted); this change wholly encompasses and owns the admin-mode removal.
- **No data migration:** only HTTP routes and client/scene code are removed; no schema or stored-data changes.
