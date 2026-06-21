## 1. Routing and App Shell

- [x] 1.1 Add `/game/prototypes` route in `App.tsx` pointing to `PrototypesPickerPage` (before the existing `/game/:slug` route)
- [x] 1.2 Add `/game/prototypes/:protoSlug` route in `App.tsx` pointing to a new `PrototypesPrototypePage`
- [x] 1.3 Update the `inGame` regex in `AppShell` from `/^\/game\/[^/]+$/` to `/^\/game\//` so prototype sub-routes also hide the nav bar

## 2. Prototype Sub-Registry and Picker

- [x] 2.1 Create `src/games/prototypes/registry.ts` exporting `PrototypeEntry[]` with `slug`, `name`, `description`, and `mount` fields
- [x] 2.2 Replace `src/games/prototypes/PrototypesGame.tsx` with `PrototypesPickerPage.tsx` — renders game-page chrome (back link, title "Prototypes") and a card list from the prototype registry
- [x] 2.3 Create `src/pages/PrototypesPrototypePage.tsx` — reads `:protoSlug`, looks up entry in prototype registry, mounts the component (or redirects to `/game/prototypes` on unknown slug) with game-page chrome showing the prototype name
- [x] 2.4 Add `tilt-tester` entry to the prototype registry pointing to the existing `TiltTester` component

## 3. Games Registry Update

- [x] 3.1 In `src/games/registry.ts`, move the `prototypes` entry to the end of the array and remove its `mount` property

## 4. GridModel — Pure TypeScript Game State

- [x] 4.1 Create `src/games/prototypes/grid-rendering/GridModel.ts` with types: `TerrainType`, `Direction`, `Cell`, `Unit`, `PcPlan`, `PlanningPhase`, `TurnPhase`, `GameState`, `PcAction`, `NpcAction`
- [x] 4.2 Implement `INITIAL_MAP` constant: 4×4 `Cell[][]` with terrain assignments and structure flags per the fixed map in the design
- [x] 4.3 Implement `initialState(): GameState` placing 4 NPCs (rows 0–1) and 2 PCs (row 3, cols 0 and 3)
- [x] 4.4 Implement planning-phase model functions: `selectUnit`, `cancelSelection`, `beginPlanMove`, `beginPlanAttack`, `setPlanMove`, `setPlanAttack`, `clearPlan`
- [x] 4.5 Implement `validMoveDests(state, unitId)` — returns orthogonal neighbors that are empty (no structure, PC, or NPC)
- [x] 4.6 Implement `attackSquares(state, unitId)` — returns 4 orthogonal squares around the PC's planned destination (or current position if no move planned)
- [x] 4.7 Implement `endPlayerTurn(state)` — transitions to `pc-playback`, eagerly computes `PcAction[]` in `planOrder` sequence
- [x] 4.8 Implement `resolvePcAction(state, action)` — applies one PC action; re-checks destination occupancy at resolution time; applies attack from actual post-move position
- [x] 4.9 Implement `beginNpcPlayback(state)` — transitions to `npc-playback`, eagerly computes `NpcAction[]` (exit if on row 3, else move down, else try left/right, else attack PC, else stay)
- [x] 4.10 Implement `resolveNpcAction(state, action)` — applies one NPC action, returns updated state
- [x] 4.11 Implement `endRound(state)` — clears all plans, `planOrder`, resets to `player` phase

## 5. GridScene — Phaser Scene

- [x] 5.1 Create `src/games/prototypes/grid-rendering/GridScene.ts` as a `Phaser.Scene`; accept initial `GameState` via scene data
- [x] 5.2 Implement `drawTiles()` — render each cell as a filled rectangle with terrain color; render structures as a distinct shape inside the tile
- [x] 5.3 Implement `drawUnits()` — render PCs as filled circles (player color + stroke) and NPCs as filled polygons (enemy color + stroke) using `Phaser.GameObjects.Graphics`
- [x] 5.4 Implement `drawPlanningOverlay()` — draw move arrows, ghost PCs (reduced alpha), attack direction chevrons; call `clearPlanningOverlay()` when phase transitions out of `player`
- [x] 5.5 Implement tile highlight layer — colored border overlay on valid move destinations (during `selecting-move`) and attack squares (during `selecting-attack`)
- [x] 5.6 Implement tap detection — on pointer up with travel < 5px emit `'unit-tapped' { unitId }` if a unit tile was tapped, or `'cell-tapped' { col, row }` otherwise
- [x] 5.7 Implement drag detection — on pointer move with travel ≥ 5px pan the camera (`camera.scrollX/Y`)
- [x] 5.8 Implement scroll-wheel zoom — `this.input.on('wheel', ...)`, adjust `camera.zoom`, clamp to `[0.5, 2.0]`
- [x] 5.9 Implement pinch-to-zoom — track two active pointers, compute distance delta on each pointer move, scale camera zoom proportionally
- [x] 5.10 Expose `redraw(state: GameState)` method on the scene for React to call after state changes
- [x] 5.11 Expose `animatePcAction(action, onComplete)` — plays move tween (~400ms) and/or attack flash (~250ms) for a `PcAction`, calls `onComplete` when done
- [x] 5.12 Expose `animateNpcAction(action, onComplete)` — plays move tween (~400ms), exit tween (off-bottom, ~400ms), or attack flash (~300ms) for an `NpcAction`, calls `onComplete` when done

## 6. GridRenderingGame — React Wrapper and HUD

- [x] 6.1 Create `src/games/prototypes/grid-rendering/GridRenderingGame.tsx` using the existing `PhaserGame` component; initialize `GameState` with `initialState()` and store in a `useRef`
- [x] 6.2 Wire `onGameReady` callback: store a ref to the `GridScene` instance for later method calls; register `'unit-tapped'` and `'cell-tapped'` listeners on `game.events`
- [x] 6.3 Implement player-phase HUD overlay: action menu ("Move", "Attack", "Cancel") visible when a PC is selected; "Done" button always visible during `player` phase
- [x] 6.4 Handle `'unit-tapped'` event — if PC tapped during player phase, call `selectUnit` and re-render HUD
- [x] 6.5 Handle `'cell-tapped'` event — if `selecting-move`, call `setPlanMove` and update scene overlay; if `selecting-attack`, call `setPlanAttack` and update scene overlay
- [x] 6.6 Implement "Move" button handler — call `beginPlanMove`, trigger scene to show move highlights
- [x] 6.7 Implement "Attack" button handler — call `beginPlanAttack`, trigger scene to show attack highlights
- [x] 6.8 Implement "Cancel" button handler — call `cancelSelection`, clear scene highlights
- [x] 6.9 Implement "Done" button handler — call `endPlayerTurn`, receive `PcAction[]`, start PC playback loop (block input by hiding HUD)
- [x] 6.10 Implement PC playback loop — call `scene.animatePcAction` for each action in sequence; after each completes call `resolvePcAction` and `scene.redraw`; after all PC actions call `beginNpcPlayback` to receive `NpcAction[]` and start NPC playback loop
- [x] 6.11 Implement NPC playback loop — call `scene.animateNpcAction` for each action in sequence; after each call `resolveNpcAction` and `scene.redraw`; after all NPC actions call `endRound` and restore player-phase HUD

## 7. Prototype Registry Entry

- [x] 7.1 Add `grid-rendering` entry to `src/games/prototypes/registry.ts` with name "Grid Rendering", a short description, and a lazy import of `GridRenderingGame`

## 8. Build Verification

- [x] 8.1 Run `npm run build` from the repo root and confirm zero TypeScript errors across all affected packages
