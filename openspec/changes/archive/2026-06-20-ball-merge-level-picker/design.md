## Context

The ball merge game has a single hardcoded rectangular container built in `buildContainer()` using three static Matter.js rectangle bodies (left wall, right wall, floor). The level is hardcoded as the string `'box'` in `BallMergeGame.tsx` and passed to score submission and leaderboard fetch. No mechanism exists for choosing a container shape before play or between games.

The leaderboard API already accepts any `level` string key, so there is no backend work required. The physics and scoring systems are level-agnostic — only the container geometry and the level identifier need to change.

## Goals / Non-Goals

**Goals:**
- Define 6–8 container shapes as data in a new `levels.ts` module
- Refactor `buildContainer()` to consume a level definition rather than hardcoded constants
- Add a level picker UI shown before the first game and optionally on restart ("Change Level")
- Pass the selected level id to score submission and leaderboard fetching
- Label difficult levels with a difficulty badge in the picker
- Keep the `box` level as the default and preserve existing leaderboard scores

**Non-Goals:**
- Animated container transitions between levels
- Unlockable or earned levels (all levels available from the start)
- Server-side level validation (level id is a free string key; the API already accepts any value)
- Persisting the player's last-used level across sessions

## Decisions

### 1. Container geometry: segment list → rotated static rectangles

Each level is described as a list of `Segment` objects `{ x1, y1, x2, y2 }` representing the interior wall boundary. At build time each segment is converted to a thin rotated static Matter.js rectangle centered at the segment midpoint, with length equal to the segment's Euclidean length and angle equal to its slope.

```
interface Segment { x1: number; y1: number; x2: number; y2: number }

interface LevelDef {
  id: string
  name: string
  difficulty?: 'hard' | 'danger'
  segments: Segment[]
  topY: number       // overflow / open-top line
  dropY: number      // Y where held ball is shown and released from
  dropMinX: number   // clamped left bound for drop position
  dropMaxX: number   // clamped right bound for drop position
}
```

**Why not Matter.js `fromVertices`?** `fromVertices` is designed for convex hulls and does non-obvious decomposition on concave shapes. Segment-to-rectangle conversion is explicit, predictable, and maps 1:1 to the visual rendering. Every shape we need can be expressed as a closed polyline.

**Why not parametric / sampled curves?** Sampled curves add complexity (sampling resolution, runtime allocation) with no gameplay benefit — the physics engine doesn't distinguish a smooth curve from 8–10 fine segments. Define shapes as coarse polygons; refine per shape if needed.

**Visual rendering:** Replace the current three `add.rectangle()` calls with a single `Graphics` path that traces the segment list. This keeps the visual outline consistent with the physics boundary regardless of shape complexity.

### 2. Level selected state: game registry

The selected level flows from the React component into the Phaser scene via `game.registry`. Before emitting `restart` (or on first game start), `BallMergeGame.tsx` writes `game.registry.set('levelId', selectedLevelId)`. The scene reads `this.game.registry.get('levelId')` in both `create()` and `doRestart()`.

**Why not scene constructor data?** Phaser instantiates the scene once inside the config object before the game is created; passing dynamic data at scene construction time is awkward. Registry is the idiomatic Phaser mechanism for React↔scene communication and is already established in this codebase (score and gameover events use `game.events`).

**Why not a React state passed through `buildConfig`?** `buildConfig` is memoized and the Phaser game is created once; re-creating the game on every level change would be expensive and flash the canvas.

### 3. Level picker UI: pre-game overlay, with "Change Level" on restart

Show a full-screen overlay *before* the Phaser game canvas is initialized. The player picks a level, then the canvas mounts with that level in the registry. On the game-over screen, add a "Change Level" button alongside "Play Again" that returns the player to the picker overlay (unmounts and remounts the canvas on confirm).

**Why not a mid-game picker inside Phaser?** The picker is a one-time choice per game, and React UI is easier to style (Tailwind, responsive layout, difficulty badges) than Phaser UI. Keeping it in React avoids coupling level metadata to the scene.

**Picker layout:** Vertical list of level cards, each showing the level name, a small ASCII-style silhouette icon (inline SVG path), and an optional difficulty badge. Mobile-first; fits in the same viewport as the game canvas.

### 4. Difficulty labels: `'hard'` and `'danger'`

Levels with `difficulty: 'hard'` show an amber "Hard" badge; `difficulty: 'danger'` show a red "Danger" badge. Levels with no difficulty field show no badge. Labels are purely decorative — no mechanical difference.

Proposed difficulty assignments:
- `box`, `bowl`, `pit` — no label (accessible)
- `vase`, `cauldron`, `hex` — `'hard'`
- `test-tube`, `diamond` — `'danger'`

### 5. Drop zone clamp per level

`movePreview()` currently clamps to `[MARGIN_X + r, GAME_W - MARGIN_X - r]`. Each `LevelDef` carries `dropMinX` / `dropMaxX` to replace the hardcoded `MARGIN_X` references. The scene reads these from the active level definition.

### 6. `GAME_W` / `GAME_H` and canvas dimensions unchanged

All shapes are designed within the existing 400×640 logical coordinate space. No changes to the Phaser game config, scale mode, or the canvas mounting code.

## Risks / Trade-offs

- **Physics edge cases at shape corners** → sharp interior corners (hex, diamond) can cause balls to wedge or vibrate in corners. Mitigation: add a small chamfer segment at acute corners during shape tuning; adjust wall friction per level if needed.
- **Narrow containers and large balls** → in `test-tube` and `vase`, large balls (radius 60–75) may not fit through the opening. Mitigation: `dropMinX`/`dropMaxX` already constrains the drop zone; if the largest spawn size exceeds the interior width, reduce `SPAWN_MAX_SIZE` for that level or document as intended challenge.
- **Existing `box` leaderboard** → scores submitted before this change used `level = 'box'`; the new `box` level uses the same id, so no data migration is needed.
- **Level picker adds a tap before play** → slight friction on first launch. Mitigation: default to `box` so returning players can skip the picker with one tap on "Play Again" (no level change needed).

## Migration Plan

1. Deploy is a client-only change — no server migrations, no Caddyfile changes.
2. On deploy, the hardcoded `LEVEL = 'box'` constant is replaced by the picker default. Existing `box` scores are unaffected.
3. No rollback complexity — reverting the client bundle restores the original behavior.

## Open Questions

- **Should the last-used level be persisted in `localStorage`?** Could reduce friction for returning players. Not in scope for this change but easy to add.
- **Exact segment coordinates for each shape** — defined during implementation and tuned against the physics. The `LevelDef` schema is fixed; coordinates are not a design decision.
- **Should `pit` be renamed?** "Pit" is descriptive but not thematic. Alternatives: "Wide", "Arena", "Pan". Resolve during implementation.
