## Context

The ball merge game (`client-games/src/games/ball-merge/`) uses Phaser with the Matter.js physics plugin (`physics.default: 'matter'`). Key physics constants are hard-coded in `BallMergeScene.ts` (gravity `0.9`, implicit restitution and friction on each body). The levels system (`levels.ts`) defines 8 container shapes as connected wall segments; these are already isolated from game logic and can be reused directly.

The prototype picker at `/game/prototypes` is introduced by the `games-prototype-selector` change. This prototype registers there as slug `ball-merge-physics`.

## Goals / Non-Goals

**Goals:**
- Reuse `levels.ts` and its 8 container shapes without modification
- Reuse the sports-ball visuals and `SIZES` / `sizeInfo` / `nextSize` from `logic.ts`
- Expose four physics knobs live (gravity, restitution, friction, air friction) with bounded sliders that always display the current value
- Show a level picker before the first drop; allow re-picking mid-session
- Drop mechanic with same-size merge (same pair detection as real game); no scoring
- Reset button clears all balls, retains current level and physics settings

**Non-Goals:**
- Scoring, game-over, overflow detection, or leaderboard logic
- Tilt/shake controls
- Persisting slider values across sessions

## Decisions

### Decision 1: Layout — always-visible controls panel below the canvas

The Phaser canvas is wrapped in a flex column: canvas container (flex-1, min-h-0) above a fixed-height controls panel (~180px). The canvas uses `Phaser.Scale.FIT` within its container, so it shrinks automatically to leave room for the controls. This keeps all four slider values permanently visible without requiring any toggle or overlay interaction, which matches the user's intent ("show the value for each physics control").

**Alternative considered**: Collapsible bottom drawer. Rejected — hides values and adds interaction cost.

### Decision 2: Physics parameters and bounds

| Parameter | Label | Min | Default | Max | Matter.js target |
|---|---|---|---|---|---|
| Gravity Y | Gravity | 0.1 | 0.9 | 3.0 | `world.gravity.y` |
| Restitution | Bounciness | 0.0 | 0.3 | 0.9 | `body.restitution` |
| Friction | Friction | 0.0 | 0.1 | 1.0 | `body.friction` |
| Air Friction | Air Drag | 0.001 | 0.01 | 0.2 | `body.frictionAir` |

Restitution is capped at 0.9 (not 1.0) because Matter.js multiplies restitution of colliding pairs; values at or above 1.0 cause energy gain and immediate instability.

Each slider label shows the parameter name and its current numeric value formatted to 3 significant figures (e.g. "Bounciness: 0.30").

**Step values**: gravity uses 0.05 steps; restitution 0.05; friction 0.05; air friction uses a range input with 0.001 step.

### Decision 3: Live update via Phaser game events

React emits a `physics-update` event on the Phaser `Game.events` bus with a `Partial<PhysicsConfig>` payload. The scene listener:
1. Updates `this.matter.world.gravity.y` for gravity changes.
2. Iterates `this.matter.world.getAllBodies()` and patches `restitution`, `friction`, and `frictionAir` on each dynamic body for the other three parameters.
3. Stores the latest config so newly spawned balls inherit it.

This means slider changes affect both existing and future balls immediately with no restart.

### Decision 4: Ball spawning and merging — reuse real-game assets

Balls use the full 11-size sports-ball set (`SIZES` from `logic.ts`). Spawn size is drawn randomly from indices 0–4 (same rule as the real game). Each ball is drawn with the `drawBall` helper extracted from `BallMergeScene.ts` — the drawing functions are copied into `BallMergePhysicsScene.ts` (or extracted to a shared module) so the visuals are identical to the real game.

Merging uses the same collision-pair detection pattern as `BallMergeScene.ts`: on a `collisionstart` event, if two bodies share the same size tag and neither is already queued for removal, they are removed and a new ball of `nextSize` is spawned at the midpoint. The Yoga Ball (size 10, the largest) does not merge — matching the real game. No score event is emitted.

### Decision 5: Simple level picker — no leaderboard

A full-screen overlay (same visual pattern as the existing `LevelPicker`) built inline in `BallMergePhysicsGame.tsx`. It lists all 8 levels from `LEVELS` in `levels.ts` with name and difficulty badge, but makes no API calls. It appears on first load and is re-opened via a "Change Level" button in the controls panel.

### Decision 6: Drop mechanic

- A horizontal aim line and drop-position indicator are drawn each frame by the scene.
- On `pointermove` / `touchmove` within the canvas, the scene updates the aim X.
- On `pointerdown` / `tap`, a ball is spawned at the aim position and current physics config.
- No drop cooldown, no "next ball" preview — drop as fast as desired (physics sandbox).
- Drop position is clamped to the level's `dropMinX`/`dropMaxX`.

### Decision 7: File layout

```
client-games/src/games/prototypes/ball-merge-physics/
  BallMergePhysicsGame.tsx   — React component: level picker, controls panel, Phaser host
  BallMergePhysicsScene.ts   — Phaser scene: Matter.js world, drop mechanic, event bridge
```

`PrototypesGame.tsx` (introduced by `games-prototype-selector`) gains one entry: `{ slug: 'ball-merge-physics', name: 'Ball Merge Physics', component: BallMergePhysicsGame }`.

## Risks / Trade-offs

**[Risk] Patching all bodies on every slider change is O(n) in ball count** → Acceptable for a prototype; typical sandbox sessions have < 100 balls. No mitigation needed.

**[Risk] Restitution patch mid-collision causes jitter if balls are already resting** → Mitigated by capping restitution at 0.9 and advising (via in-prototype label) that large jumps in bounciness while balls are settling can cause instability.

**[Risk] The `games-prototype-selector` change must be implemented first for the picker route to exist** → This prototype's registration line in `PrototypesGame.tsx` is a no-op if the picker change is not yet applied. The two changes can be developed in parallel and merged in order.

## Open Questions

- Should the air-friction slider use a linear or logarithmic scale? (The useful range 0.001–0.05 is compressed at the low end of a linear slider.) Defer to implementation — try linear first; add a note in `BallMergePhysicsScene.ts` if the UX feels poor.
- Should the controls panel show a mini diagram of the container shape for the selected level, or just the name? Name only for now; shape preview can be added later.
