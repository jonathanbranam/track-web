## Why

The merge game's aiming line is static, the player has no visibility into what ball comes after the current one, and there's no indication of which level is active — making gameplay feel flat and leaving players unable to orient or plan. These three small improvements increase visual polish, strategic depth, and situational clarity.

## What Changes

- **Animate the aiming line dashes**: The dashed vertical aim line currently renders as a static set of dashes. The dots should animate downward continuously, creating a flowing "falling" effect that reinforces the drop direction.
- **Show a "Next:" ball preview**: Add a small ball icon and label (e.g., `Next: ●`) at the top of the game area displaying the queued next ball. This requires generating the next ball at drop time (instead of after drop) and exposing it in the UI.
- **Show the active level name**: Display the current level's human-readable name (e.g., "Box", "Vase", "Cauldron") at the top of the screen so the player always knows which level is active.

## Capabilities

### New Capabilities

- `aim-line-animation`: Animating the dashed aim line dots so they flow downward continuously using Phaser's update loop and a time-based phase offset.
- `next-ball-preview`: Queuing and displaying the next ball (the one that will appear after the current drop) so the player can plan. Requires a `nextSize` field alongside `heldSize` and a "Next:" label in the HUD.
- `level-name-display`: Showing the active level's human-readable name in the React HUD so the player always knows which level is in play.

### Modified Capabilities

_(none — no existing spec requirements change)_

## Impact

- `client-games/src/games/ball-merge/BallMergeScene.ts` — `updateAimLine()` gains a phase offset driven by `this.time.now`; `readyNextBall()` gains a queue; Phaser HUD updated with a "NEXT" ball preview.
- `client-games/src/games/ball-merge/BallMergeGame.tsx` — React HUD gains a level name display; imports `findLevel` from `levels.ts` to resolve the name from `selectedLevelId`.
- No backend changes. No new dependencies.
