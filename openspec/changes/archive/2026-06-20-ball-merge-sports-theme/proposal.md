## Why

The ball merge game uses abstract colored circles with no thematic identity. Replacing them with 11 sports balls — drawn to look like their real-world counterparts — gives the game a cohesive visual personality and makes each merge feel satisfying because you recognize what you're building toward (a yoga ball from ping pong balls).

## What Changes

- **Replace 7 abstract ball sizes with 11 sports-themed balls**, ordered by real-world size: ping pong, golf, tennis, baseball, softball (droppable); volleyball, soccer, basketball, football, beach ball, yoga ball (earned through merging)
- **Increase the droppable range** from the 3 smallest sizes to the 5 smallest (`SPAWN_MAX_SIZE` 2 → 4), matching the structure of the original Suika Game
- **Render each ball with sport-accurate visual markings** drawn programmatically in Phaser Graphics: stitching, seams, laces, dimples, panel lines, and wedges appropriate to each ball type
- **Render the football as an ellipse** (American football, oblong on purpose) using `Bodies.fromVertices` with a polygon approximation so both physics and visual are elliptical — the ball tumbles and collides as an oblong shape
- **Update point values** to a triangular-number progression across 11 sizes (1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66)

## Capabilities

### New Capabilities

None — this is entirely a modification of an existing capability.

### Modified Capabilities

- `games-ball-merge`: Ball count changes from 7 to 11; droppable spawn range changes from sizes 0–2 to sizes 0–4; ball definitions now include sports-specific names, colors, visual markings, and (for the football) an ellipse shape flag with separate x/y radii

## Impact

- `client-games/src/games/ball-merge/logic.ts` — replace `SIZES` array (7 → 11 entries); add optional `radiusX`/`radiusY`/`label` fields to `BallSize`; update `SPAWN_MAX_SIZE` to 4
- `client-games/src/games/ball-merge/BallMergeScene.ts` — update `generateTextures()` to draw sport-specific markings per ball type; update `addBall()` to use `setBody({ type: 'fromVertices', verts: ellipsePoints(...) })` for the football, `setCircle` for all others; sync ellipse texture dimensions from `radiusX`/`radiusY`
- `client-games/src/games/ball-merge/logic.test.ts` — update tests to reflect new size count, spawn range, and point values
- `openspec/specs/games-ball-merge/spec.md` — update ball count, spawn range, and add football ellipse requirement
