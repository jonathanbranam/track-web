## Why

A single container shape makes Ball Merge feel limited after a few games; variety in container geometry meaningfully changes ball physics, stack strategy, and difficulty. Adding a level picker with 6–8 distinct container shapes provides replay value and gives players a sense of progression and challenge.

## What Changes

- New **level picker** UI shown before each new game (and on restart), letting the player choose a container shape
- **6–8 container shapes** defined as physics body configurations, each with a distinct interior geometry:
  - `box` — current rectangular container (preserved as default)
  - `bowl` — curved U-shape; balls roll to center
  - `vase` — narrow neck at the overflow line, wide belly below; requires precise drops
  - `cauldron` — wide base, narrowing waist, flared rim; balls pile in the base
  - `test-tube` — narrow and tall with a semicircular base; very constrained
  - `diamond` — widest at midpoint, pointed base; balls fan outward then inward
  - `hex` — hexagonal / sharp-angled geometric shape with no curves
  - `pit` — very wide and shallow; easy stacking but overflow comes fast
- Some levels tagged with a **difficulty label** (e.g. "Hard" or "Danger") surfaced in the picker
- Scores remain **fully separate per level** — each shape has its own leaderboard (already supported by the `level` key)
- `buildContainer()` in `BallMergeScene` refactored to accept a level definition; extracted into a new `levels.ts` module
- `LEVEL` constant in `BallMergeGame.tsx` becomes a stateful selection passed through to the scene and to score submission

## Capabilities

### New Capabilities
- `ball-merge-levels`: Level picker UI, level definitions (container geometry), difficulty labels, and the contract for how a selected level is passed to the scene and to score submission

### Modified Capabilities
- `games-ball-merge`: The "three-sided container" requirement expands — the container shape is now configurable per selected level rather than always a fixed rectangular box

## Impact

- `client-games/src/games/ball-merge/BallMergeScene.ts` — `buildContainer()` refactored to accept a level config
- `client-games/src/games/ball-merge/BallMergeGame.tsx` — level picker state wired to scene init and score submission
- New file: `client-games/src/games/ball-merge/levels.ts` — level definitions and geometry
- No backend changes — the leaderboard API already supports arbitrary `level` values
- Existing `box` scores are unaffected; the new level shapes each get their own leaderboard namespace
