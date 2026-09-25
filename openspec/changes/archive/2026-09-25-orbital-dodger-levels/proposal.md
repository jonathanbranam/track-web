## Why

Every Orbital Dodger layout is generated at random, so the designer cannot build a specific situation, keep it, and hand it to play-testers to compare. Levels are the next step in finding the game: a fixed arrangement of planets, stars and start point that everyone plays the same way. The game is in pre-production. Everyone who can reach it is on the dev team and trusted, so authoring can happen inside the game itself on a real phone, with no separate tool or permission tier.

## What Changes

- **Saved levels**, stored on the server and shared by every player, using the same pattern as the saved tuning configs. Anyone can **create**, **rename**, **save over** and **delete** a level. A level holds geometry only: a start position, planets (position, radius, color and an optional ring-height override) and stars. It is fully separate from tuning configs. The level in play and the config in play are chosen independently.
- **A level picker is shown whenever the game starts.** Choosing a level is required before a run begins. The picker lists **Random level**, **Create new**, and every saved level, each with Play and Edit. The last level played is pre-selected but never auto-started.
- **Random level** is today's game, unchanged: a generated layout, stars that respawn, no completion, and "New Layout" on the end screen.
- **Level editor**, an overlay over the frozen scene:
  - **Create new** opens it on a freshly generated random layout.
  - Add, move and remove planets. Edit each planet's radius, color and ring height (automatic, or a set height).
  - Add, move and remove stars.
  - Move the start position. Warn, without blocking, when a planet is inside the usual start clearance.
  - **Start in orbit**: attach the start to a planet's ring at a chosen angle and direction.
  - Ring previews reflect the current tuning config, and a ring that the config drops is labeled with the reason.
  - Test-play the unsaved level, and save it as a new level or over the one being edited.
  - A level with no stars cannot be saved.
  - **Save as level** from a Random run keeps its current layout as a new level.
- **The editor opens** from Create new or Edit in the picker, from Edit on a saved level's end screen, and from Save as level on a Random end screen. There is no mid-run entry: quit first. Test runs submit no score, and their end screen returns to the editor.
- **Authored levels play differently from Random**:
  - The ship begins at the level's start position, not the field center. Random still starts at the center.
  - Stars do not respawn, and the HUD shows how many remain.
  - Collecting every star ends the run as **Level Complete**, a new end reason.
  - The end screen offers Retry, Levels and Edit, not New Layout.
- **Starting in orbit**: the run begins locked on the ring and circling. The first press only starts the run and does not break the lock. Later presses break orbit as usual. If the active config provides no ring for that planet (orbit capture off, or the ring is dropped), the ship starts on the ring's radius moving at circular-orbit speed, in free flight.
- **Per-planet ring height**: a planet's ring height override replaces the height derived from its radius. Every other ring rule still applies, including the speed-cap raise, the influence-zone fit and clearance from other planets. Planet mass stays derived from radius.
- **Scores for an authored level are submitted under `level-<id>`** as the leaderboard level. Random stays on `classic`. Scoring itself is unchanged; a completion bonus is deferred.
- Choosing a tuning config before the first press **regenerates the layout only on Random**. On an authored level the geometry is kept.
- **Planet count** in the tuning config applies only to generated layouts: Random, and the seed for Create new.

## Capabilities

### New Capabilities
- `games-orbital-dodger-levels`: saved levels (storage, CRUD, validation), the level picker, the level editor, start-in-orbit, and level completion.

### Modified Capabilities
- `games-orbital-dodger`:
  - "Procedurally generated planet layout": applies to Random and to seeding Create new.
  - "Proximity-weighted scoring and star pickups": no star respawn on authored levels.
  - "HUD, run control, and end-of-run flow": Level Complete; restart controls depend on the kind of level; the level picker is reachable.
  - "Leaderboard submission": the level id replaces the fixed `classic` level for authored levels.
  - "Run waits for the first press": the start position comes from the level, and the first press of an in-orbit start does not break orbit.
  - "Orbit capture rings": per-planet ring height override.
  - "Per-browser config selection": regeneration before the first press applies only to Random. This requirement is added by `orbital-dodger-tuning-configs`.

**Sequencing:** `orbital-dodger-tuning-configs` added the "Per-browser config selection" requirement that this change modifies. It was archived before these delta specs were written, so they are authored against the spec that includes it.

## Impact

- **Backend**:
  - New table `game_od_levels` (migration `0040`, after the configs migration `0039`), stored as a JSON `layout` column. Includes a repository and its interface.
  - CRUD routes under `/api/games/orbital-dodger/levels`, with server-side validation of the layout shape and of level names (same rules as config names).
  - Uses the existing `/api/games/*` session auth.
  - `TABLE_NAMES` in `src/db.ts` gets the new table.
- **Client** (`client-games/src/games/orbital-dodger/`):
  - `physics.ts`: `Planet` gains an optional `ringHeight`, and `orbitRings` honors it. Adds a level type, conversion between a level and runtime planets and stars, and the start-in-orbit placement.
  - `OrbitalDodgerScene.ts`: a level to load instead of `generatePlanets`; start position and start lock; no star respawn plus a completion event; an edit mode that freezes the simulation and hit-tests and drags planets, stars and the start; per-planet texture re-bake on resize.
  - `OrbitalDodgerGame.tsx`: the level picker, the editor overlay and inspector, the Level Complete end reason, the restart controls, and the leaderboard level.
  - New components for the picker and the editor. `client-games/src/api.ts` gets level API calls.
- **Tests**:
  - `physics.test.ts`: ring override, start-in-orbit placement and its fallback, completion.
  - A backend route and repository test for levels.
- **Docs**:
  - `openapi.yaml`: level routes.
  - `llm-context.md`: levels, the picker, and the fact that levels and configs are separate.
  - `docs/games/planning.md`: deferred items, namely completion scoring, leaderboard reset or versioning when a level is saved over, and level ↔ config binding.
- **Leaderboard**: no server change. The score route accepts any level string up to 50 characters. Existing play-test scores will be cleared later.
