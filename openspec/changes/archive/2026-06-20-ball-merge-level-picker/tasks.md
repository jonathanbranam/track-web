## 1. Level Definitions Module

- [x] 1.1 Create `client-games/src/games/ball-merge/levels.ts` and define the `Segment` and `LevelDef` TypeScript interfaces (`id`, `name`, `difficulty?`, `segments`, `topY`, `dropY`, `dropMinX`, `dropMaxX`)
- [x] 1.2 Add the `box` level definition to `levels.ts` using the existing hardcoded geometry constants as the baseline segment coordinates
- [x] 1.3 Add the `bowl` level — U-shaped; straight upper walls angling into a rounded base approximated by ~6 angled segments; balls roll to center
- [x] 1.4 Add the `vase` level — narrow neck at the overflow line (~120px interior), widening belly (~260px), narrow base; difficulty `'hard'`
- [x] 1.5 Add the `cauldron` level — wide base, narrowing waist, slight flare at the rim; difficulty `'hard'`
- [x] 1.6 Add the `test-tube` level — narrow and tall (~140px interior width), semicircular base approximated by segments; difficulty `'danger'`
- [x] 1.7 Add the `diamond` level — pointed base, widest at midpoint, straight slanted walls; difficulty `'danger'`
- [x] 1.8 Add the `hex` level — hexagonal / sharp-angled geometric interior, no curves; difficulty `'hard'`
- [x] 1.9 Add the `pit` level — very wide and shallow; overflow line is low so the container fills quickly; no difficulty label
- [x] 1.10 Export a `LEVELS` array and a `findLevel(id: string): LevelDef` helper (falls back to `box` if id unknown)

## 2. Scene Geometry Refactor

- [x] 2.1 Remove the hardcoded `MARGIN_X`, `WALL_T`, `FLOOR_Y`, `TOP_Y`, and `DROP_Y` constants from `BallMergeScene.ts`; replace with a module-level `activeLevelDef: LevelDef` field initialized from `game.registry`
- [x] 2.2 Rewrite `buildContainer()` to iterate over `activeLevelDef.segments`, converting each segment to a thin rotated static Matter.js rectangle (midpoint, Euclidean length, slope angle) for physics
- [x] 2.3 Replace the three `this.add.rectangle()` visual calls with a single `Graphics` path that traces the segment polyline for rendering
- [x] 2.4 Update `create()` to read `game.registry.get('levelId')`, call `findLevel()`, store as `activeLevelDef`, then call the refactored `buildContainer()`
- [x] 2.5 Update `doRestart()` to re-read `game.registry.get('levelId')`, call `findLevel()`, destroy and rebuild the container graphics and physics bodies with the new level
- [x] 2.6 Update `movePreview()` to clamp using `activeLevelDef.dropMinX` / `activeLevelDef.dropMaxX` instead of the removed `MARGIN_X` constant
- [x] 2.7 Update the overflow check in `update()` to use `activeLevelDef.topY` instead of the removed `TOP_Y` constant
- [x] 2.8 Update the `preview` image initial position and `DROP_Y` references to use `activeLevelDef.dropY`

## 3. React Component — Level State and Score Wiring

- [x] 3.1 Add `selectedLevelId` state to `BallMergeGame.tsx` (initial value `'box'`) and a `showPicker` boolean state (initial value `true`)
- [x] 3.2 In `onGameReady`, write the initial `selectedLevelId` to `game.registry` immediately after the game is created
- [x] 3.3 Replace the hardcoded `LEVEL = 'box'` constant with `selectedLevelId` in the `submitScore` call on game-over and on quit
- [x] 3.4 Replace the hardcoded `LEVEL` in `fetchLeaderboard` calls (game-over and mid-game HUD) with `selectedLevelId`
- [x] 3.5 Update the `restart` callback to write `selectedLevelId` to `game.registry` before emitting the `'restart'` event
- [x] 3.6 Add a "Change Level" button to the game-over overlay that sets `showPicker` to `true` (returning to the picker without destroying the Phaser game)
- [x] 3.7 When the player confirms a level in the picker after game-over, write the new level id to `game.registry`, emit `'restart'`, and set `showPicker` to `false`

## 4. Level Picker UI Component

- [x] 4.1 Create `client-games/src/games/ball-merge/LevelPicker.tsx` — full-screen overlay rendered when `showPicker` is true, positioned above the Phaser canvas
- [x] 4.2 Render one card per level from the `LEVELS` array; each card shows the level name and, if present, a difficulty badge (amber "Hard" for `'hard'`, red "Danger" for `'danger'`)
- [x] 4.3 Highlight the currently selected card; tapping a card updates local selection without immediately starting the game
- [x] 4.4 Add a "Play" button that confirms the selection: calls the `onConfirm(levelId)` prop, which sets `selectedLevelId` in the parent and dismisses the picker
- [x] 4.5 Verify the picker is dismissed (Phaser canvas shown) only after confirmation, not on card tap

## 5. Shape Tuning and Physics QA

- [X] 5.1 Run the game locally and visually inspect each level's container geometry; adjust segment coordinates as needed so walls are flush with no visible gaps
- [x] 5.2 Verify balls do not escape or clip through walls on any level during normal play
- [x] 5.3 Verify the drop zone clamp prevents the held ball from being positioned outside the container opening on each level
- [x] 5.4 Verify the overflow detection fires correctly on each level (no false positives from mid-drop balls, no missed overflows)
- [x] 5.5 Check `test-tube` and `vase` with a size-6 ball (radius 75) — confirm it fits through the opening or document the intended constraint
- [x] 5.6 Check `diamond` and `hex` corner behavior — if a ball wedges in an acute corner, add a small chamfer segment to that corner

## 6. Build and Docs

- [x] 6.1 Run `npm run build:watch` (client-games build) and confirm zero TypeScript errors
- [x] 6.2 Run `npx vitest run` and confirm `logic.test.ts` still passes (logic module unchanged, but verify no regressions)
- [x] 6.3 Check `llm-context.md` — if it describes the Ball Merge game or its level structure, add a note that the `level` field in score submissions now reflects the player-selected container shape (not always `'box'`)
