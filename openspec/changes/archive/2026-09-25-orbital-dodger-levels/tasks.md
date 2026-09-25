## 1. Backend: level storage and routes

- [x] 1.1 Add migration `0040_orbital_dodger_levels` to `src/db.ts`, creating `game_od_levels` (id, name, layout_json, updated_by, created_at, updated_at) with a `NOCASE` unique name index, and add the table to `TABLE_NAMES`. Verify a fresh test database migrates and the table exists and is empty.
- [x] 1.2 Add `IOrbitalLevelRepository` to `src/repositories/interfaces.ts` and a SQLite implementation (list, create, update name and/or layout, delete; errors `not-found` and `name-taken`), wired in `app.ts` like the config repository. Verify with `src/repositories/sqlite/orbitalLevels.test.ts`: CRUD, case-insensitive duplicate names, missing ids.
- [x] 1.3 Add `src/routes/orbitalLevels.ts` (`GET/POST /levels`, `PATCH/DELETE /levels/:id`) mounted at `/api/games/orbital-dodger`. It reuses the config name rules and validates the layout document with zod as in design §2: v1 shape, finite numbers, bounds, radius 12–90, ringHeight 20–200, 1–30 stars, 0–12 planets, orbit index in range, 16 KB cap. Refusals return a single readable `error`. Verify with `src/routes/orbitalLevels.test.ts`: happy paths, the zero-star refusal, an out-of-field planet, a bad orbit index, a duplicate name, 404s, and rejection without a session.

## 2. Physics: ring override, ring diagnosis, start state

- [x] 2.1 Add optional `ringHeight` to `Planet`. Split the per-planet body of `orbitRings` into an exported `ringFor` that returns a ring or a `dropped` reason (`capture-off`, `speed-cap`, `influence`, `blocked`). `orbitRings` keeps its behavior. Export `circularSpeed`. Verify in `physics.test.ts`: an override sets the ring radius, an override still raises under the speed cap, an override that crosses a planet is dropped as `blocked`, each other reason is reported, and the existing ring tests still pass.
- [x] 2.2 Create `levels.ts` with:
  - the `LevelLayout` and `LevelStart` types and the `OrbitalLevel` API type
  - conversion from a layout to runtime planets and stars (palette index to colors, `baseArea`) and back, using stable in-memory planet ids for the editor
  - client-side validation mirroring the server limits
  - `startState` (design §5)
  - `leaderboardLevel(play)`
  - last-level `localStorage` helpers following `configs.ts`
  - warning helpers: start clearance, planet overlap

  Verify with `levels.test.ts`:
  - a round trip keeps the geometry
  - validation matches the server cases
  - `startState` handles a point start (at rest), an orbit start with a ring (on the ring and locked), and an orbit start with no ring (tangent at circular speed, unlocked)
  - deleting the orbited planet converts the start to a point at the shown position
  - a stale stored level id is cleared

## 3. Scene: level sources, completion, orbit start

- [x] 3.1 Read `kb/phaser-mobile-input.md` before touching any input code, and confirm the existing Fix 1 and Fix 2 are kept.
- [x] 3.2 Add `loadLevel(source)` to `OrbitalDodgerScene`. `create()` no longer generates a layout: the scene idles showing only the background until a level loads. `retry()` builds the run from the source: Random uses generated stars and `startState` with a center point start (the random launch velocity is removed), while an authored level uses the level's stars and `startState`. Add `currentLayout()`. Verify in the browser (task 7.2) that Random starts at the center at rest, and a saved level starts at its point at rest.
- [x] 3.3 On authored sources, stop the star refill. Collecting the last star ends the run with reason `complete` through the existing `gameover` event. Emit a stars-remaining count alongside score. Verify by staging through `__orbitalScene` in dev that the last pickup emits `gameover` with `complete`, and that Random still refills.
- [x] 3.4 Implement the swallowed first press for locked starts (design §6). It is cleared by `pointerup`, `pointerupoutside` and the `isDown` self-correction. Verify by staging an orbit start: after the first press and drag the ship circles, fuel is unchanged and it stays locked, and the second press breaks orbit.
- [x] 3.5 Update `applyTuning`: while awaiting launch, Random regenerates and authored levels retry. In edit mode it only assigns and redraws. Verify that switching configs before launch on a saved level keeps the geometry and resets fuel and shields.

## 4. Scene: edit mode

- [x] 4.1 Add an `editing` state that freezes the simulation, plus `setDraft(draft)`, which rebuilds planet textures and redraws. Add `drawEdit`: rings from `ringFor` with wrap copies, the start marker (an orbit start sits on its ring with a direction arrow), the start-clearance circle turning red when intruded, and the selection highlight. Verify by entering edit mode mid-run that nothing moves and score and fuel are unchanged.
- [x] 4.2 Add `pressEdit` input on the scene's `this.input`:
  - hit-testing with padded areas, ties going to the smaller object (star, then start, then planet)
  - drag moves the object locally, clamped to the field
  - `edit-move` is emitted on release
  - `edit-select` is emitted on selection, and `edit-tap(x, y)` on an empty-space tap
  - dragging an orbit start slides it along its ring and updates the angle
  - steering paths are skipped while editing

  Verify on a phone-sized viewport in the second instance that a star, the start and a planet can each be grabbed and dragged, including a star sitting on a planet.

## 5. Client: API, picker, host flow

- [x] 5.1 Add level calls to `client-games/src/api.ts` (list with an AbortSignal, create, update, delete), matching the config calls' error handling. Verify by type-checking and by the picker loading against the second instance.
- [x] 5.2 Update `OrbitalDodgerGame.tsx`:
  - load configs and levels in parallel under the 8 s limit, with independent fallbacks
  - add the `screen` and `play` state (design §9)
  - boot Phaser once, and show the picker until a level is chosen
  - pass the `leaderboardLevel` result to submit and fetch, and skip submission for test runs
  - show the stars-remaining HUD on authored and test runs
  - add a `complete` heading and blurb ("Level Complete")
  - choose end-overlay controls by play kind: Retry and Levels always, New Layout and Save as level on Random, Edit on a saved level, Back to editor and Retry for a test run

  Verify in the browser with the scenarios in task 7.2.
- [x] 5.3 Add `LevelPicker.tsx`: Random level, Create new, then saved levels by name, each with Play and Edit. Pre-select the last level played; a stale id falls back to Random and is cleared. Show an unavailable message when levels failed to load. Verify with the picker scenarios in task 7.2, including a server stopped mid-load.

## 6. Client: level editor

- [x] 6.1 Add `LevelEditor.tsx`, which owns the draft:
  - toolbar tools: Select, + Planet, + Star
  - Test and Save buttons
  - a close button that confirms before discarding unsaved changes
  - scene events `edit-select`, `edit-move` and `edit-tap` update the draft, then `setDraft` is called

  Create new seeds the draft from `generatePlanets` with the current planet count, `spawnStarSet`, and a center point start. Save as level seeds it from `currentLayout()`. Verify that each entry point opens with the expected geometry and that the dirty confirm appears only when there are changes.
- [x] 6.2 Add the inspector bottom sheet:
  - for a planet: radius, color swatches, ring height (Auto or a value), Delete
  - for a star: Delete
  - for the start: Point or In orbit (planet, direction), with the angle set by dragging on the ring

  Opening it closes the tuning panel, and the reverse. Verify on a phone viewport that every field updates the canvas live.
- [x] 6.3 Add the warnings strip: start clearance, planet overlap, and a dropped ring with its reason under the live config. Warnings never block a save. Verify each warning appears and clears, and that a dropped-ring reason changes when orbit capture is toggled in the tuning panel.
- [x] 6.4 Add the save flow: save as new (name dialog), save over, rename and delete (with confirm), with server errors shown inline and the zero-star save blocked with a message on the client. Test-play runs the draft and comes back with it unchanged. Verify the save, rename, delete, duplicate-name and zero-star cases against the second instance, and that a test run posts no score (check the network tab).

## 7. Docs, build, verification

- [x] 7.1 Update `openapi.yaml` with the four level routes and the layout schema. Update `llm-context.md` (levels, the picker, levels are independent of configs, the `level-<id>` leaderboard level) and `docs/games/planning.md` (deferred: completion scoring, leaderboard versioning on save-over, level/config binding, per-level initial velocity, undo). Verify the YAML parses and the new paths are present.
- [x] 7.2 Run the browser verification on a second instance per `docs/dev-second-instance.md` (its own port, SQLite file and user; never the developer's running server). Screenshots go to `/tmp/track-verify/`. Walk through:
  - the picker
  - Random level
  - Create new
  - edit, test, save
  - playing the level to completion
  - an orbit start
  - switching configs before launch on a saved level
  - the end-overlay controls for each play kind
  - the levels-unavailable fallback
- [x] 7.3 Run `npm test` and confirm that all existing and new tests pass.
- [x] 7.4 Run `npm run build:games` and `npm run build:server` and confirm there are zero TypeScript errors.
- [x] 7.5 Run `openspec validate orbital-dodger-levels --strict`, then present the change and its verification to the user. Do not archive until the user confirms.
