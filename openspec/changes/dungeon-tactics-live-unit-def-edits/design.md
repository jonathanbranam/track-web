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

### D1: One shared `applyDefChange(changedArchetypes)` path for both live-edit and Reload
`applyEditedDefs(defs)` today (a) snapshots each archetype's prior max HP, (b) `setDef`s the new defs, (c) reconciles every unit's current HP by the delta floored at 1, (d) redraws/rerenders. We generalize it to also produce a **changed-archetype set** — a structural diff of the incoming def vs the current store per archetype (comparing `maxHp`, `movement.range`, and the full `attack` block) — and route that set through one shared step:

1. HP reconcile for archetypes whose `maxHp` changed (floored at 1, as today);
2. NPC re-plan for the changed **NPC** archetypes only (D3);
3. redraw + rerender.

Both edit sources feed this path: the debounced editor commit (changed set = diff of pending defs vs store) and **Reload** (changed set = diff of pre- vs post-fetch store, D5a). Because HP reconcile compares against the store's *current* value, repeated debounced calls are idempotent (a no-change call yields an empty set) and successive edits compose.

- Alternative — per-field `setMaxHp`/`setMoveRange` from the editor: rejected. It duplicates the reconcile logic and spreads HP math across two paths; the whole-map apply already exists and was the path Save used.

### D2: Debounce in the editor — 500 ms trailing, flush on blur / Save / close; selects commit immediately
The debounce lives in `ScenarioEditor.tsx` (a `useRef` timer + a ref holding the latest pending `defs`). Each numeric `onChange`:
1. updates local React `defs` (immediate input feedback — the field never lags), and
2. schedules a trailing-edge commit that calls `applyEditedDefs(pendingDefs)` after **500 ms** of quiet.

Flush (cancel timer + apply immediately) happens on: numeric input **blur**, **Save** (before persisting), and editor **close/unmount** (so the last sub-500 ms edit isn't dropped). Discrete controls (the shape / penetration `<select>`s) commit **immediately** with no debounce — there are no intermediate values to coalesce.

- Rationale: 500 ms trailing comfortably covers a "stopped typing" pause without reconciling mid-entry; flush-on-blur keeps tabbing between fields responsive; coalescing also *reduces* the floor-at-1 lossiness because intermediate values never reconcile.
- Alternatives: commit-on-blur only (rejected — feels modal, not "live" while typing); no debounce (rejected — janky, lossy per keystroke); store-side debounce (rejected — the store is a plain module with no React lifecycle to flush on close).

### D3: NPC re-plan is granular — only units whose archetype's def changed
A def change re-plans **only the NPC units whose `unitType` is in the changed-archetype set**, leaving every other NPC's telegraphed plan untouched. The recompute runs when that set contains an `NpcType`, `phase === 'player'`, and no NPC playback is animating (`animatingRef.current` false); otherwise the store still mutates and the next natural `computeNpcPlans` (turn transition / placement-done) reflects it — nothing is left permanently stale.

- Why granular: the designer tunes one archetype at a time; re-planning unrelated enemies would churn their telegraphs and confuse the player. PC-only edits (e.g. a melee PC's damage) change no enemy telegraph and trigger no recompute.
- Why gated on `player` + not-animating: telegraphed plans are only meaningful in the player phase; recomputing mid-playback would fight the running animation.
- Alternative — recompute *all* NPC plans on any NPC edit: simpler (no planner change) and globally consistent, but it restyles every enemy's telegraph on each keystroke-commit; rejected in favor of stable, surgical updates.

### D3a: Parameterize `computeNpcPlans(state, replanIds?)` to honor granularity
`computeNpcPlans` is a **sequential, coupled** planner: it threads a `workingUnits` list so each NPC paths around the *planned destinations* of the NPCs processed before it (npc.ts:113–177). A unit therefore can't be re-planned in true isolation — its path depends on the others. The refactor keeps the single loop and, per NPC in the existing order:
- if `replanIds` is undefined (the default — all current callers), recompute as today;
- else if the NPC's id ∈ `replanIds`, recompute its action;
- else **reuse** its action from `state.npcPlans`.

Either branch pushes the unit's (new or reused) destination into `workingUnits`, so later units still path around earlier ones and collision-avoidance holds. Existing callers (placement-done, turn transition) pass no `replanIds` and get byte-identical behavior.

- Threading rule (unchanged from the full planner): a unit paths around the **planned destinations of units before it** in the order and the **current positions of units after it**. So a *re-planned* unit plans against the same board a full re-plan would give it — for a single changed archetype its plan is identical to full. The sole divergence: *unchanged* units are reused verbatim and never re-path around a changed unit's new destination (in either order). Intentional — it keeps unrelated telegraphs stable — and every real turn still does a full no-arg re-plan, so it never persists.
- Deeper edge: with two changed archetypes separated by an unchanged unit in the order, a later changed unit may path around that unchanged unit's now-stale destination. Negligible for the real workflow (tuning one archetype at a time); a full re-plan is always one turn away.

### D4: Clamp live values to engine-valid ranges at commit time
The live-apply path must not push values the backend would later reject (`setDef` does no clamping today). At commit, clamp each field to the engine bounds the steppers used and the Zod write schema enforces — max HP `[1,9]`, move `[0,12]`, and non-negative integers for damage / min-range / max-range — before calling `applyEditedDefs`. Local React state may briefly hold a raw/empty input for editing feel, but what reaches the store (and therefore Save) is always valid, so live state and a subsequent persist can't diverge.

- Alternative — clamp only on Save: rejected; the *running match* would then briefly run on invalid stats (e.g. maxHp 0), and a mid-edit Reset could snapshot them.

### D5: Save is persist-only
`onSave` flushes any pending debounce, then calls the **bulk** `putUnitDefs(slug, scenario, defs)` and reports status — it no longer calls `applyEditedDefs` (the store already reflects the edits live).

### D5a: Reload hot-swaps defs and re-plans changed NPCs (no board reset)
Today `reloadStore` calls `initialState()`, which **restarts the whole match**. With live-apply, Reload should mean "undo my unsaved def edits and keep playing," symmetric with picking a scenario (which hot-swaps the store without a reset). So `onReload`:

1. cancels the pending debounce and drops pending defs;
2. snapshots the current store defs, then runs `loadFromServer()` to re-fetch the active scenario (the post-reload store);
3. **diffs** old vs new defs per archetype (the same structural compare as D1);
4. routes the changed-archetype set through the shared `applyDefChange` path — HP reconcile (floored at 1) for changed `maxHp`, granular NPC re-plan (D3), redraw.

Reset (not Reload) remains the way to restart the match.

- Behavior change: Reload no longer restarts the match — recorded here so the spec captures it. If the load fails, the store is left as-is (bundled fallback) and no diff/re-plan runs.
- Alternative — keep the `initialState()` reset: rejected. It makes "discard unsaved edits" also destroy in-progress match state, and the diff/re-plan is moot. We deliberately separate "restore saved defs into the live match" (Reload) from "replay from the start" (Reset).

### D6: Remove admin mode wholesale
Delete the `adminMode` state, Admin HUD button + tap handler, the admin branch of the unit popup (extra height + stepper rows) and `drawStatStepper`/stepper helpers in `DungeonTacticsScene.ts`; the `admin-stat-edit` listener in `DungeonTacticsGame.tsx`; `defStore.persistDef`; `api.putUnitDef` (single); and the backend `PUT /api/games/:slug/scenarios/:scenario/unit-defs/:archetype` route, its OpenAPI path, and its tests. The unit popup is permanently read-only. The repository's per-archetype upsert stays (the bulk PUT still upserts per archetype internally).

## Risks / Trade-offs

- **Floor-at-1 HP reconciliation is lossy across down-then-up edits** (e.g. a 2/4 unit dropped to max 1 floors to 1/1, then raised to max 4 becomes 4/4). → Pre-existing admin-mode behavior, explicitly retained; the debounce *reduces* exposure by not reconciling intermediate keystrokes. Documented, not fixed here.
- **Debounced commit racing with Reset / turn transitions.** → Save flushes and Reload cancels the timer; `applyEditedDefs` reads `stateRef.current` at flush time, so a commit always composes against whatever state is current rather than a stale snapshot.
- **Editing an NPC mid-playback.** → Re-plan is gated on `!animatingRef.current`; the store still updates and the next `computeNpcPlans` reflects it, so nothing is left stale.
- **Granular re-plan diverges from a full global re-plan** (an unchanged unit earlier in the planning order won't re-path around a changed unit later). → Intentional per D3a; keeps unrelated telegraphs stable. Every real turn still does a full no-arg `computeNpcPlans`, so the divergence never persists past the current planning frame.
- **Sticky editor `defs` vs. store after activate/reload.** → On scenario activate and on Reload the editor already re-reads `getCurrentDefs()`; we keep that so local state and store stay in sync after a non-edit store swap.

## Migration Plan

Pure code change — **no schema or stored-data migration** (only an HTTP route and client/scene code are removed). Deploy: build `client-games` and the server; the removed single-archetype endpoint 404s after deploy, but nothing calls it once the client ships. Rollback: revert the change; the bulk write, scenario CRUD, and store seam are untouched. The superseded `dungeon-tactics-remove-admin-mode` change has already been abandoned (directory deleted) so the two don't edit the same spec.

## Open Questions

- **Debounce duration:** set to 500 ms. Tunable later if it feels sluggish on a real device (HTTP LAN), but no blocker.
- **Panel-close flush:** resolved — editor close flushes the pending sub-500 ms edit (commits it), not discard.
