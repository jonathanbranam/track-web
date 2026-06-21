## 1. Phaser Scene — World and Level Setup

- [x] 1.1 Create `client-games/src/games/prototypes/ball-merge-physics/BallMergePhysicsScene.ts` with a Phaser scene class using the Matter.js physics plugin
- [x] 1.2 Accept the selected level (from `levels.ts`) as scene data and build the container walls as static Matter.js bodies on `create()`
- [x] 1.3 Define `PhysicsConfig` interface (`gravityY`, `restitution`, `friction`, `frictionAir`) and store defaults matching the design table (0.9, 0.3, 0.1, 0.01)
- [x] 1.4 Copy or inline the `drawBall` helper from `BallMergeScene.ts` and import `SIZES`/`sizeInfo`/`nextSize` from `logic.ts` so ball visuals match the real game

## 2. Drop Mechanic

- [x] 2.1 Draw a vertical aim indicator each frame at the current clamped aim X position
- [x] 2.2 Listen for `pointermove`/`touchmove` on the canvas to update aim X; clamp to the level's `dropMinX`/`dropMaxX`
- [x] 2.3 On `pointerdown`/tap, spawn a ball of a randomly chosen size (indices 0–4) at the clamped aim X at the top of the container with current `PhysicsConfig` properties applied

## 3. Merge Detection

- [x] 3.1 Subscribe to Matter.js `collisionstart` events; when two dynamic bodies share the same size tag and neither is already queued for removal, mark both for removal
- [x] 3.2 After marking, remove both bodies and spawn a `nextSize` ball at their midpoint; skip merge for Yoga Ball (size index 10)
- [x] 3.3 Confirm no score event is emitted on merge

## 4. Live Physics Update Bridge

- [x] 4.1 In the scene, subscribe to a `physics-update` event on `this.game.events`; the payload is `Partial<PhysicsConfig>`
- [x] 4.2 On gravity change, update `this.matter.world.gravity.y` immediately
- [x] 4.3 On restitution, friction, or frictionAir change, iterate `this.matter.world.getAllBodies()` and patch each dynamic body, then store the new config so future spawned balls inherit it

## 5. React Component — Layout and Phaser Host

- [x] 5.1 Create `client-games/src/games/prototypes/ball-merge-physics/BallMergePhysicsGame.tsx` as a flex-column wrapper: canvas container (`flex-1 min-h-0`) above the controls panel
- [x] 5.2 Mount the Phaser game with `Phaser.Scale.FIT` inside the canvas container so it resizes to leave room for the controls panel; pass the selected level as scene data
- [x] 5.3 On level change from the picker, destroy the existing Phaser game instance and remount with the new level while preserving current physics slider values

## 6. Controls Panel

- [x] 6.1 Render four labeled sliders (Gravity, Bounciness, Friction, Air Drag) with bounds, steps, and defaults from the design table; display the current value formatted to 3 significant figures beside each label
- [x] 6.2 On any slider change, emit a `physics-update` event on the Phaser game's event bus with the updated `Partial<PhysicsConfig>`
- [x] 6.3 Add a "Reset" button that restores all sliders to defaults, emits a full `PhysicsConfig` update, and removes all dynamic ball bodies from the scene
- [x] 6.4 Add a "Change Level" button that reopens the level picker overlay

## 7. Level Picker Overlay

- [x] 7.1 Build the level picker as a full-screen overlay rendered inside `BallMergePhysicsGame.tsx`; list all 8 levels from `levels.ts` with name and difficulty badge; make no API calls
- [x] 7.2 Show the picker automatically on first mount (before any simulation runs); close it when the user selects a level and start the simulation
- [x] 7.3 Reopen the picker when "Change Level" is tapped; selecting a new level resets the world (clears balls, rebuilds walls) while retaining current physics slider values

## 8. Prototype Registration

- [x] 8.1 Add an entry to `client-games/src/games/prototypes/registry.ts`: `{ slug: 'ball-merge-physics', name: 'Ball Merge Physics', description: '...', mount: lazy(() => import('./ball-merge-physics/BallMergePhysicsGame')) }`

## 9. Build Verification

- [x] 9.1 Run `npm run build:games` (or the equivalent Vite build for `client-games`) and confirm zero TypeScript errors
