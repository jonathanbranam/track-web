## Context

Dungeon Tactics Solo reads all unit stats through a single in-memory store seam (`defStore.ts`: `getDef`/`getMaxHp`/`getMoveRange`, mutated via `setDef`/`setMaxHp`/`setMoveRange`). Two editing surfaces feed that store today:

- **Unit editor** (`ScenarioEditor.tsx`): edits are buffered in local React `defs` state and only pushed to the store on **Save** (via `applyEditedDefs` in `DungeonTacticsGame.tsx`), which also persists.
- **Admin mode** (`DungeonTacticsScene.ts` HUD toggle + in-popup steppers): emits `admin-stat-edit`, which mutates the store **live** and persists the single archetype immediately via `defStore.persistDef` → `api.putUnitDef`.

This change collapses to one surface (the editor) with the live feel of admin mode: edits affect the running match immediately, **Save** is persist-only, **Reload** discards unsaved live edits. Admin mode and its single-archetype persist path are removed. The HP-reconciliation behavior (shift current HP by the max-HP delta, floored at 1) is retained, and NPC archetype edits must re-run NPC planning so the telegraphed intent stays honest.

The wrinkle live-apply introduces: a numeric `<input>` fires `onChange` per keystroke, so typing `12` passes through `1`. Applying every intermediate value would HP-reconcile and re-plan NPCs on each character — visibly janky and lossy (the floor-at-1 HP shift is not perfectly reversible). The core decision below is a debounce.

## Goals / Non-Goals

**Goals:**
- Editor field edits affect the running match with no Save and no reload.
- A debounced/coalesced commit so intermediate keystrokes don't each reconcile HP or re-plan.
- **Save** persists the active scenario's current defs only; **Reload** re-fetches and discards unsaved live edits.
- Editing an NPC archetype re-runs that NPC's planning immediately during the player phase.
- Retain admin-mode HP reconciliation (raise/lower current HP by the max delta, floored at 1).
- Remove admin mode (HUD toggle, popup steppers, `admin-stat-edit`, `persistDef`, single-archetype endpoint) entirely.

**Non-Goals:**
- Multi-user/concurrent editing, conflict resolution, or undo of edits (out of scope).
- Changing scenario create / set-default / active-selection behavior (unchanged).
- Persisting on anything other than the explicit **Save** click (no autosave).
- Reworking the floor-at-1 HP model itself — it is retained as-is, only relocated.

## Decisions

### D1: Live-apply reuses the existing `applyEditedDefs` seam, extended to re-plan
`applyEditedDefs(defs)` already (a) snapshots each archetype's prior max HP from the store, (b) `setDef`s the new defs, (c) reconciles every unit's current HP by the delta floored at 1, (d) redraws and rerenders. We keep this as the single live-apply entry point and **extend it** to recompute NPC plans (D3). Because HP reconciliation compares the new value against the store's *current* value, repeated debounced calls with the same target are idempotent (second call sees delta 0) and successive distinct edits compose correctly.

- Alternative — per-field `setMaxHp`/`setMoveRange` calls from the editor: rejected. It duplicates the reconcile logic the steppers used and spreads HP math across two code paths; the whole-map apply already exists and is the path Save used.

### D2: Debounce in the editor — 500 ms trailing, flush on blur / Save / close; selects commit immediately
The debounce lives in `ScenarioEditor.tsx` (a `useRef` timer + a ref holding the latest pending `defs`). Each numeric `onChange`:
1. updates local React `defs` (immediate input feedback — the field never lags), and
2. schedules a trailing-edge commit that calls `applyEditedDefs(pendingDefs)` after **500 ms** of quiet.

Flush (cancel timer + apply immediately) happens on: numeric input **blur**, **Save** (before persisting), and editor **close/unmount** (so the last sub-500 ms edit isn't dropped). Discrete controls (the shape / penetration `<select>`s) commit **immediately** with no debounce — there are no intermediate values to coalesce.

- Rationale: 500 ms trailing comfortably covers a "stopped typing" pause without reconciling mid-entry; flush-on-blur keeps tabbing between fields responsive; coalescing also *reduces* the floor-at-1 lossiness because intermediate values never reconcile.
- Alternatives: commit-on-blur only (rejected — feels modal, not "live" while typing); no debounce (rejected — janky, lossy per keystroke); store-side debounce (rejected — the store is a plain module with no React lifecycle to flush on close).

### D3: NPC re-plan trigger — recompute `computeNpcPlans` when an edited NPC archetype changes during the player phase
After a live-apply commit, if any changed archetype is an `NpcType` and `phase === 'player'` and no NPC playback is animating (`animatingRef.current` is false), recompute `stateRef.current.npcPlans = computeNpcPlans(stateRef.current)` so the telegraphed move/attack reach reflects the new def. This folds into `applyEditedDefs` after the HP reconcile, before redraw.

- Why gated on `player` + not-animating: telegraphed plans are only shown/meaningful in the player phase; recomputing mid-playback would fight the running animation. Outside those conditions the store is still mutated and the next natural `computeNpcPlans` (turn transition / placement-done) picks up the change — no plan is left permanently stale.
- Why detect NPC archetypes specifically: PC-only edits (e.g. a melee PC's damage) don't change enemy telegraphs, so we skip the recompute for them. The `defStore` archetype lists already separate `PcType` from `NpcType`.
- Alternative — always recompute on any edit: harmless but wasteful and muddies intent; gating documents *why* the recompute exists.

### D4: Clamp live values to engine-valid ranges at commit time
The live-apply path must not push values the backend would later reject (`setDef` does no clamping today). At commit, clamp each field to the engine bounds the steppers used and the Zod write schema enforces — max HP `[1,9]`, move `[0,12]`, and non-negative integers for damage / min-range / max-range — before calling `applyEditedDefs`. Local React state may briefly hold a raw/empty input for editing feel, but what reaches the store (and therefore Save) is always valid, so live state and a subsequent persist can't diverge.

- Alternative — clamp only on Save: rejected; the *running match* would then briefly run on invalid stats (e.g. maxHp 0), and a mid-edit Reset could snapshot them.

### D5: Save is persist-only; Reload cancels the debounce and re-fetches
`onSave` flushes any pending debounce, then calls the **bulk** `putUnitDefs(slug, scenario, defs)` and reports status — it no longer calls `applyEditedDefs` (the store already reflects the edits live). `onReload` cancels the pending timer, drops pending defs, and runs `reloadStore()` (the existing `loadFromServer` path), which replaces the store with persisted values and re-seeds the board — discarding unsaved live edits.

### D6: Remove admin mode wholesale
Delete the `adminMode` state, Admin HUD button + tap handler, the admin branch of the unit popup (extra height + stepper rows) and `drawStatStepper`/stepper helpers in `DungeonTacticsScene.ts`; the `admin-stat-edit` listener in `DungeonTacticsGame.tsx`; `defStore.persistDef`; `api.putUnitDef` (single); and the backend `PUT /api/games/:slug/scenarios/:scenario/unit-defs/:archetype` route, its OpenAPI path, and its tests. The unit popup is permanently read-only. The repository's per-archetype upsert stays (the bulk PUT still upserts per archetype internally).

## Risks / Trade-offs

- **Floor-at-1 HP reconciliation is lossy across down-then-up edits** (e.g. a 2/4 unit dropped to max 1 floors to 1/1, then raised to max 4 becomes 4/4). → Pre-existing admin-mode behavior, explicitly retained; the debounce *reduces* exposure by not reconciling intermediate keystrokes. Documented, not fixed here.
- **Debounced commit racing with Reset / turn transitions.** → Save flushes and Reload cancels the timer; `applyEditedDefs` reads `stateRef.current` at flush time, so a commit always composes against whatever state is current rather than a stale snapshot.
- **Editing an NPC mid-playback.** → Re-plan is gated on `!animatingRef.current`; the store still updates and the next `computeNpcPlans` reflects it, so nothing is left stale.
- **Sticky editor `defs` vs. store after activate/reload.** → On scenario activate and on Reload the editor already re-reads `getCurrentDefs()`; we keep that so local state and store stay in sync after a non-edit store swap.

## Migration Plan

Pure code change — **no schema or stored-data migration** (only an HTTP route and client/scene code are removed). Deploy: build `client-games` and the server; the removed single-archetype endpoint 404s after deploy, but nothing calls it once the client ships. Rollback: revert the change; the bulk write, scenario CRUD, and store seam are untouched. The superseded `dungeon-tactics-remove-admin-mode` change has already been abandoned (directory deleted) so the two don't edit the same spec.

## Open Questions

- **Debounce duration:** set to 500 ms. Tunable later if it feels sluggish on a real device (HTTP LAN), but no blocker.
- **Panel-close flush:** resolved — editor close flushes the pending sub-500 ms edit (commits it), not discard.
