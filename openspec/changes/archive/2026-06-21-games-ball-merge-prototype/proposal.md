## Why

The ball-merge game is powered by Matter.js physics, and its feel depends heavily on tuning parameters like gravity, restitution, and friction — values that are currently hard-coded. A dedicated prototype with live sliders lets designers and developers experiment with these physics properties in real time before committing values to the real game.

## What Changes

- Add a "Ball Merge Physics" prototype at `/game/prototypes/ball-merge-physics`, accessible via the prototype picker introduced in `games-prototype-selector`.
- The prototype renders a simplified version of the ball merge container and ball-dropping mechanic (using the same Matter.js engine as the real game) but exposes a slider panel for real-time control of key physics properties: gravity scale, ball restitution (bounciness), ball friction, and air friction.
- Sliders update the live Matter.js world immediately; no restart is required.
- A reset button clears all balls and restores slider defaults.
- No scoring, merging, or game-over logic — this is purely a physics sandbox.

## Capabilities

### New Capabilities
- `games-ball-merge-physics-prototype`: A physics sandbox prototype at `/game/prototypes/ball-merge-physics`. Renders a ball-merge-style container with drop mechanics and a persistent slider panel. Sliders control gravity scale, restitution, friction, and air friction in real time. Includes a reset button. No game rules, scoring, or merging.

### Modified Capabilities
<!-- No existing spec-level requirements change. The prototype picker route is introduced by
     the games-prototype-selector change and requires no modification here. -->

## Impact

- `client-games/src/games/prototypes/ball-merge-physics/` — new prototype folder: `BallMergePhysicsGame.tsx` (React wrapper + slider UI), `BallMergePhysicsScene.ts` (Matter.js world setup and physics loop)
- `client-games/src/games/prototypes/PrototypesGame.tsx` — register new prototype in the picker list (this component is being introduced by `games-prototype-selector`)
- No API or backend changes; no new dependencies (Matter.js is already used by `games-ball-merge`)
