# Tasks

## 1. Fork and scaffold

- [x] 1.1 Copy `client-games/src/games/orbital-dodger/` to `client-games/src/games/space-golf/`; delete `configs.ts`, `configs.test.ts`, `LevelEditor.tsx`, `LevelPicker.tsx`, `levels.ts`, `levels.test.ts` (keep `layout.ts`, the tuning-panel inset); rename the scene/game files to `SpaceGolfScene.ts` / `SpaceGolfGame.tsx`; verify `grep -r "orbital-dodger" client-games/src/games/space-golf` returns no imports
- [x] 1.2 Register `space-golf` ("Space Golf", single-player, direct mount) in `client-games/src/games/registry.ts` with a placeholder component; verify the card appears in the catalog and Orbital Dodger still loads

## 2. Physics core (trimmed from Dodger)

- [x] 2.1 Trim `physics.ts` to gravity, influence zones, reach, rings (`circularSpeed`, `ringFor`), `advanceOrbit`, and x-only wrap displacement; remove thrust, fuel, shields, score rate, generation; define the new `Tuning` and `DEFAULT_TUNING` per design §15; verify the trimmed `physics.test.ts` passes (`npx vitest run client-games/src/games/space-golf`)
- [x] 2.2 Add tests for x-only wrap (a planet across the side seam pulls through it; nothing wraps vertically) and wormhole gravity; verify they pass

## 3. Levels data and validation

- [x] 3.1 Define `Level` types (id, name, height, sides, tee, planets, stars, wormhole, pieces: wind / asteroids / radiation, optional forecastLength) and `validateLevel`; test well-formed and malformed examples (overlap, star in planet, ringless tee planet, wormhole outside, height out of range); verify tests pass
- [x] 3.2 Author a first draft of the four levels (First Tee, Tailwind, The Belt, Hot Zone) per design §8; verify a test asserts ≥ 4 levels, unique ids, every piece type and both side modes present, and every level passes `validateLevel`

## 4. Shot simulation

- [x] 4.1 Implement `launchState` and `simulateShot` (fixed dt 1/120, path + events + outcome, `maxLength` truncation) with gravity, side bounce/wrap, planet bounce with damage (§5), stars, wormhole, crossing-based capture with launch-ring block (§4), out-of-bounds, adrift, destroyed; verify tests for: determinism (identical results twice), truncated run is an exact prefix of the full run, prograde direction from opposite release points, power → speed clamp, slow arrival locks, fast arrival flies by, weak shot falls back to its own ring, head-on vs skim damage, sub-threshold contact is free, side wall bounce, side wrap, out of bounds top/bottom, adrift at the time cap, destroyed at the step hull hits 0
- [x] 4.2 Add course pieces to the simulation — solar wind acceleration, asteroid drag + per-unit damage, radiation per-second damage — flight-only; verify tests for wind curving the path vs no-wind, asteroids slowing and longer paths costing more, radiation damage halving at double speed

## 5. Run rules and scoring

- [x] 5.1 Implement `LevelRun` and `applyShot` (§10); verify tests: lock moves the lie and keeps stars; out of bounds keeps lie, +2 strokes total, hull penalty, stars reverted; adrift same without penalty; wormhole completes; destroyed; cancelled aim adds nothing
- [x] 5.2 Implement `scoreBreakdown` per the spec formula with floor at 0; verify the spec's 165 vs 585 scenario and the all-stars bonus as tests

## 6. Solver guard

- [x] 6.1 Implement `solver.ts` (BFS over lies, 72 angles × 12 powers, depth ≤ 8, reports min strokes); verify a test that every shipped level is solvable, and that runs in a few seconds; iterate on level layouts from 3.2 until it passes

## 7. Aim model and storage

- [x] 7.1 Implement `aim.ts` (timed/planned, pause, drag → power, deadzone cancel, marker hit-test on the ring, fire intents) per design §7; verify tests for each mode × pause combination, cancel, and that timed release uses the supplied current angle
- [x] 7.2 Implement `storage.ts` (settings, tuning overrides layered on defaults, last level with stale fallback; all try/catch); verify tests with a stubbed and a throwing `localStorage`

## 8. Phaser scene

- [x] 8.1 Read `kb/phaser-mobile-input.md` and apply its two patterns: scene `this.input` for aim/marker/look drags (with the missed-`pointerup` recovery from Dodger), `input: { windowEvents: false }` in the game config; verify by code review against the kb
- [x] 8.2 Render the course: world 400 × height, camera bounds, starfield, planets with rings, stars, wormhole, wind streaks, asteroid scatter, radiation zones, wrap ghosts on wrap levels; verify by screenshots of all four levels (saved to `/tmp/track-verify/`)
- [x] 8.3 Resting orbit + aim: idle orbit via `advanceOrbit`, aim model wiring, forecast drawing (arc, highlighted stars, bounce damage ticks, zone-tinted segments, lock ring + marker, wormhole highlight, OB marker, cut at forecast length), recompute only on input change; verify in the browser in all four mode combinations
- [x] 8.4 Flight replay: planned wind-up to marker, cursor replay with interpolation, events applied on pass (star pops, damage flash + number), outcome resolution through `applyShot`, camera follow and ease back to the lie, destroyed explosion; verify a fired shot visibly follows its forecast and HUD counts update
- [x] 8.5 Look mode (drag scrolls, no aim) and wheel scrolling at rest; verify scouting to the top of a tall level and returning

## 9. React host and UI

- [x] 9.1 `SpaceGolfGame.tsx`: picker → play → summary flow, HUD (level name, strokes, stars n/total, hull bar), overlay buttons Restart / Levels / Settings / Look / Fire (planned only, enabled with power), `game.events` bridge; verify Restart at rest and mid-flight, and Levels quits without submitting
- [x] 9.2 `LevelPicker.tsx` with last-level preselect; `LevelSummary.tsx` with score terms, total, leaderboard (`components/Leaderboard`), Next / Replay / Levels, course-complete on the last level; `submitScore('space-golf','classic', level.id, total)` on completion only; verify completing First Tee submits and shows its leaderboard (on a second instance per `docs/dev-second-instance.md`, not the dev DB)
- [x] 9.3 `SettingsPanel.tsx` (release timed/planned, pause on/off, persisted) and `TuningPanel.tsx` (trimmed from Dodger's: grouped sliders for §15 keys, Reset, persisted, applies next shot); verify settings survive reload and tuning changes move the forecast
- [ ] 9.4 Test on an iPhone over the LAN: aim in each mode, overlay buttons respond, Look scroll works; note any issues in `docs/games/space-golf/open-questions.md`

## 10. Docs

- [x] 10.1 Update `docs/games/space-golf/` (README decisions, tech.md "where the code came from" and module map, open-questions resolved/remaining) and add Space Golf follow-ups (editor + server levels, bumpers, wormhole pairs, enemy ships, moving planets, fast-forward, course totals, flip direction) to `docs/games/planning.md`; verify files read correctly
- [x] 10.2 Update `llm-context.md` games section with a Space Golf paragraph (slug, rules summary, score submission with `level = <level id>`, localStorage keys); verify no API routes were added so `openapi.yaml` needs no change

## 11. Integration checks

- [x] 11.1 Run `npm test`; verify all existing and new tests pass (including Orbital Dodger's, unchanged)
- [x] 11.2 Run `npm run build:games`; verify zero TypeScript errors and that Phaser is still external in the output
- [ ] 11.3 Play all four levels end to end on a second instance: each is completable, a stars-heavy route outscores a direct route, destruction only happens on deliberately violent shots; record tuning/level adjustments made
