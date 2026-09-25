## Context

See `proposal.md` for why, and the two spec files for the behavior. The current state that shapes the approach:

- **Scene**: `OrbitalDodgerScene` owns geometry. `newLayout()` calls `generatePlanets` and bakes one canvas texture per planet. `retry()` puts the ship at the center with a small random velocity and calls `spawnStarSet`. The star refill is inline in `simulate()`. `create()` calls `newLayout()` straight away.
- **Host**: `OrbitalDodgerGame` loads configs before booting Phaser (8 s limit) and hands the tuning over through the registry (`INITIAL_TUNING_KEY`). It talks to the scene through `game.events` (`retry`, `new-layout`) and a `sceneRef` (`applyTuning`, `quit`). `applyTuning` regenerates when awaiting launch.
- **Configs**: the configs pattern is the template. It has `game_od_configs` (migration `0039`), `IOrbitalConfigRepository` plus a SQLite implementation, `routes/orbitalConfigs.ts` mounted at `/api/games/orbital-dodger`, pure client helpers in `configs.ts`, and `listOdConfigs` and related calls in `api.ts`.
- **Rings**: `orbitRings` derives each ring's height from `orbitHeight · r / PLANET_MAX_R` and drops rings silently.
- **Input**: pointer input already follows `kb/phaser-mobile-input.md`. Canvas input is handled by the scene's `this.input`, the game config sets `input: { windowEvents: false }`, and `pointerupoutside` is handled.

## Goals / Non-Goals

**Goals:**
- One scene handles Random, saved levels, test runs and editing. The mode is state, not a separate scene.
- Level geometry is a small versioned JSON document that the server validates. A malformed level must never reach the scene.
- The editor's draft is owned in one place, so dirty tracking, save and test-play all read the same thing.
- Physics changes stay pure and unit-tested: the ring override, ring diagnosis and the start state.

**Non-Goals:**
- Undo and redo, multi-select, snapping, copy and paste.
- Per-level tuning, or binding a level to a config.
- Leaderboard versioning or reset when a level is saved over.
- Completion scoring (bonus, fuel conversion). Scoring is unchanged.
- Ownership, locking or merging of concurrent edits. The last save wins.

## Decisions

### 1. Stored layout document (v1)

```ts
type LevelStart =
  | { kind: 'point'; x: number; y: number }
  | { kind: 'orbit'; planet: number; angleDeg: number; dir: 1 | -1 }  // planet = index into planets

interface LevelLayout {
  v: 1
  start: LevelStart
  planets: { x: number; y: number; r: number; color: number; ringHeight?: number }[]  // color = palette index
  stars: { x: number; y: number }[]
}
```

- **Color is a palette index**, not a hex value. Generated planets already use `PALETTES[i % 5]`, so the index keeps authored and generated planets looking the same, keeps the inspector to a five-swatch picker, and keeps validation trivial. *Alternative:* free hex colors. Rejected as more UI for no play-testing value.
- **The orbit start references a planet by index** in stored form. In memory, the editor gives each planet a stable id so that deleting or reordering can't misdirect the reference. The id is converted to an index on save and back on load. Deleting the orbited planet converts the start to a point start (see the spec).
- **`v: 1`** lets a later shape (for example per-level initial velocity) be migrated on read without a DB migration.

### 2. Server validates geometry. Configs stay opaque.

Configs are stored opaquely because an unknown key just falls back to a default. Geometry has no safe fallback: a NaN position or an out-of-range orbit index breaks the scene. So `routes/orbitalLevels.ts` validates `layout` with zod:
- finite numbers
- positions within 0..400 × 0..720
- radius 12–90
- `ringHeight` 20–200 (never below `MIN_RING_HEIGHT`)
- 1–30 stars and 0–12 planets
- `start.planet < planets.length`
- total size of 16 KB or less

Name rules reuse the config `nameSchema`. The client mirrors the same checks in `levels.ts`, so the editor can explain a refusal before sending. The field size and limits are duplicated between server and client. The server can't import `client-games`, so each side carries a short comment pointing at the other, and each side's tests pin the limits.

### 3. Storage mirrors configs

The storage copies the configs pattern end to end:
- **Migration `0040_orbital_dodger_levels`** creates `game_od_levels (id, name, layout_json, updated_by, created_at, updated_at)`, with a `NOCASE` unique index on name. It has no default row and no seed. `TABLE_NAMES` in `src/db.ts` gains the table.
- **Repository:** `IOrbitalLevelRepository` in `interfaces.ts`, with a SQLite implementation. It returns `{ ok, error: 'not-found' | 'name-taken' }` like the config repository.
- **Routes:** `GET/POST /levels` and `PATCH/DELETE /levels/:id` in a new `routes/orbitalLevels.ts`, mounted at the same `/api/games/orbital-dodger` prefix. The list includes each `layout`, since the payloads are small and the picker needs them. That avoids a per-level GET.
- **Auth:** the `/api/games/*` session guard covers these routes. There is no admin check, since every user is trusted (see the proposal).

### 4. Physics: ring override and ring diagnosis

- `Planet` gains an optional `ringHeight`. The ring height is `p.ringHeight ?? max(orbitHeight · r / PLANET_MAX_R, MIN_RING_HEIGHT)`. The raise-under-cap, influence-fit and clearance rules are unchanged.
- The per-planet body of `orbitRings` becomes `ringFor(i, …): OrbitRing | { dropped: 'capture-off' | 'speed-cap' | 'influence' | 'blocked' }`. `orbitRings` keeps its signature by filtering the results. The editor calls `ringFor` to explain a dropped ring. *Alternative:* a separate diagnosis function that repeats the checks. Rejected because the two copies would drift.
- `circularSpeed` is exported for the start fallback.

### 5. Start state is a pure function

`startState(layout, planets, rings, tuning) → { ship, lock | null }` lives in `levels.ts`:
- **Point start:** at rest at (x, y).
- **Orbit start with a ring:** `advanceOrbit({planetIdx, angle, dir}, ring, tuning, 0)` gives the ship on the rail and the lock.
- **Orbit start without a ring:** the ship sits at radius `r + height`, using the planet's ring height or the automatic one without the speed-cap raise, and at the level's angle. Its velocity is `circularSpeed` along the tangent in `dir`, with no lock.

Random uses the same function with a point start at the center, so every run in every mode begins at rest. The old random launch velocity is removed. This makes the start rules unit-testable without Phaser.

### 6. Swallowing the first press on an in-orbit start

The scene gets a `swallowPress` flag, set by `retry()` when the start is locked. In `press()`, while `awaitingLaunch && swallowPress`, the scene only clears `awaitingLaunch`. It does not set `pressOrigin` or `pointerTarget` and does not break the lock. `pointermove` ignores a held pointer while `swallowPress` is set. `releasePointer()` clears `swallowPress`, which covers both `pointerup` and `pointerupoutside`. The `isDown` self-correction in `update()` also clears it, so a dropped release can't leave the swallow latched and eat the next real press. Because no target is set, the existing rules already produce no thrust, no fuel burn and no capture change.

### 7. The scene takes a level source

```ts
type LevelSource =
  | { kind: 'random' }
  | { kind: 'authored'; layout: LevelLayout; test: boolean }
```

- `scene.loadLevel(src)` replaces the direct `newLayout()` call in `create()`. Until a level is loaded, the scene shows only the background (`running = false`) and waits behind the React picker. Phaser is **booted once** and stays booted while the picker, editor and runs switch, which avoids re-creating the WebGL context on a phone.
- `retry()` branches on the source: generated stars and a center point start for Random, the level's stars and `startState` for authored levels.
- In `simulate()`, the star refill runs only for Random. On an authored level the last pickup calls `endRun('complete')`. The scene's end reason becomes `LossReason | 'complete'`, and the physics `LossReason` is untouched. The `gameover` event carries it, so the host needs no new event.
- `applyTuning` while awaiting launch: Random calls `newLayout()` and authored levels call `retry()`. In edit mode the values are assigned and the frame redrawn.
- `currentLayout()` exports the live planets and stars with a center point start, for **Save as level**.

### 8. The editor: React owns the draft, the scene renders and hit-tests

```
 React LevelEditor                         Scene (editing = true)
 ┌────────────────────────┐  setDraft(d)  ┌──────────────────────────────┐
 │ draft (source of truth)│──────────────▶│ rebuild textures, redraw     │
 │ selection, tool, dirty │               │ pointerdown: hit-test        │
 │ inspector, save dialog │◀──────────────│   star > start > planet      │
 └────────────────────────┘  edit-select  │ drag: move locally, redraw   │
                             edit-move    │ pointerup: emit edit-move    │
                             edit-tap     │ empty tap: emit edit-tap(x,y)│
                                          └──────────────────────────────┘
```

- **One owner.** React holds the draft, so dirty tracking (a deep compare with the saved layout), save, test-play and the leave-without-saving confirm all read it. During a drag the scene moves its own copy for smooth feedback and reports the final position once, on `pointerup`, which keeps React re-renders off the drag path. *Alternative:* the scene owns the draft and React mirrors it. Rejected because the save and dirty logic would then live in Phaser code.
- **Adding objects.** The toolbar has *Select*, *+ Planet* and *+ Star* tools. With an add tool active, an empty-space tap adds the object at that point. Explicit tools avoid long-press, which fights iOS text selection and callouts.
- **Hit areas** are padded to about 20 px for stars and the start marker, and `r + 6` for planets. Ties go to the smaller object, so a star on a planet can still be grabbed. Drags are clamped to the field.
- **Textures** are rebuilt on every `setDraft`. That's at most 12 small canvases, and only happens on inspector changes, not per frame. Dragging only moves the existing images.
- **Edit-mode drawing:**
  - rings, and their wrap-mode copies, from `ringFor` under the live tuning
  - the start marker. An orbit start is drawn on its ring with a direction arrow. Dragging it slides along the ring and sets `angleDeg`.
  - a `START_CLEARANCE` circle around the start, red when a planet intrudes
  - a selection highlight
  - no forecast, since a start at rest has nothing to forecast
- **Warnings** (start clearance, planet overlap, dropped rings with their reason) are computed in React from pure helpers and shown in a strip above the toolbar. None of them block a save.
- **Input.** Canvas input for select, drag and add goes through the scene's `this.input` (Fix 1). The toolbar, inspector and dialogs are DOM over the canvas with `onClick`, which the existing `windowEvents: false` keeps working on iOS (Fix 2). While editing, `press()` and the steering paths are skipped entirely.

### 9. Host screen state

`OrbitalDodgerPlay` gains:
```ts
screen: 'picker' | 'playing' | 'editing'
play: { kind: 'random' } | { kind: 'level'; level: OrbitalLevel } | { kind: 'test'; draft: LevelLayout; editing: OrbitalLevel | null }
```
- **Startup** loads configs and levels in parallel, under the same 8 s limit, and each can fail on its own. If configs fail, play falls back to shipped defaults. If levels fail, the picker shows only Random and Create new.
- **Leaderboard level:** `classic` for Random, `level-<id>` for a saved level. A test run never calls `submitScore`.
- **The end overlay** picks its controls from `play.kind`, as set out in the specs.
- **Last level played** is kept in `localStorage` under `orbital-dodger:level-id`, using the configs pattern: guarded access, cleared when stale. Random is stored as `random`.
- **New components** are `LevelPicker.tsx`, `LevelEditor.tsx` (toolbar, inspector, warnings, save and rename dialog) and the pure `levels.ts`. Level CRUD calls are added to `api.ts`.
- **The tuning panel** stays reachable on every screen. The editor's bottom sheet and the panel both overlay the field on a phone, so opening one closes the other.

## Risks / Trade-offs

- [A level's leaderboard mixes scores from before and after a save over the level] → Accepted for play-testing. Scores will be cleared, and versioning is noted in `docs/games/planning.md`.
- [A ring height override that works under one config is dropped under another] → Accepted. The editor names the reason under the current config, and an orbit start falls back to free flight at orbit speed.
- [Last save wins when two people edit the same level] → Accepted for a small trusted team. `updated_by` and `updated_at` are recorded for forensics.
- [Server and client limits drift] → A comment on each side points at the other, and tests on each side pin the values.
- [The first press on an orbit start is swallowed but its release is lost] → `swallowPress` is cleared by `pointerup`, `pointerupoutside` and the `isDown` self-correction, and there is a scene test hook for it (see tasks).
- [The scene grows another mode] → Edit-mode input and drawing go in their own methods (`pressEdit`, `drawEdit`). `update()` early-returns into them, so the play paths are unchanged.

## Migration Plan

The change is additive. Migration `0040` creates an empty table and changes no existing data. Existing play-test scores under `classic` stay valid, because Random still uses `classic`. Rollback means reverting the client and server. The empty table can be left in place.
