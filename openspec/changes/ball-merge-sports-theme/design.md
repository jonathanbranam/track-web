## Context

The ball merge game currently defines 7 ball sizes as anonymous colored circles in `logic.ts` (`SIZES` array). `BallMergeScene.ts` generates textures for them identically — base fill, a white shine dot, and a stroke outline. There is no thematic identity.

This change replaces those 7 sizes with 11 named sports balls and draws each with sport-accurate markings using Phaser's `Graphics` API. One ball (the American football) is oblong and needs non-circular physics and a non-square texture. Everything else stays circular.

The change is self-contained to `client-games/src/games/ball-merge/` — no backend, no new routes, no schema changes.

## Goals / Non-Goals

**Goals:**
- 11 sports balls ordered by real-world size, first 5 droppable
- Programmatic sport-accurate visual markings per ball type
- Elliptical physics and visual for the football via `Bodies.fromVertices`
- Updated point values (triangular progression: 1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66)
- Tests updated to reflect new size count, spawn range, and point values

**Non-Goals:**
- Sprite/image assets (deferred; the programmatic approach is the target for now)
- Per-ball mass tuning (mass stays r²-proportional via Matter.js default density)
- Sound or animation changes beyond existing merge pop
- Any change to leaderboard, levels, tilt/shake, or game-over logic

## Decisions

### 1. Ball table: extend `BallSize` with `label`, `radiusX`, `radiusY`

Add three fields to the existing `BallSize` interface:
- `label: string` — human-readable name (e.g., `'Ping Pong'`)
- `radiusX?: number` — semi-major axis for ellipse balls; absent means circular
- `radiusY?: number` — semi-minor axis for ellipse balls; absent means circular

For circular balls `radius` remains the single physics and visual radius. For the football, `radiusX` and `radiusY` define the ellipse; `radius` is set to `radiusX` (the larger axis) so existing callers that use `radius` for overflow detection and drop-position clamping get the conservative (largest extent) value.

**Why not a separate `isOblate` flag or a union type?** Presence of `radiusX`/`radiusY` is sufficient to signal ellipse — no extra boolean needed, and the field values carry the actual dimensions.

### 2. Football physics: `Bodies.fromVertices` with a 16-point convex polygon

`setCircle` can't approximate an ellipse. Matter.js (bundled in Phaser 3.88.2) provides `Bodies.fromVertices` and Phaser exposes it via `ball.setBody({ type: 'fromVertices', verts })`. A 16-vertex convex polygon approximating the ellipse gives accurate collision on the narrow ends and long sides of the football.

Vertex generation (relative to origin, so Matter positions the centroid at the game object location):
```ts
function ellipseVerts(rx: number, ry: number, n = 16) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return { x: Math.cos(a) * rx, y: Math.sin(a) * ry }
  })
}
```

`Bodies.fromVertices` prints a console warning about `poly-decomp` for all calls, even convex shapes (a Matter.js quirk). The warning is cosmetic — convex polygon decomposition works without the library. Accept the noise; it doesn't appear in production builds.

**Alternative considered: `setCircle(radiusY)` (circle physics, ellipse visual)**
Physics circle = short axis radius. Visual ellipse overhangs the physics on the long axis. For a 168×100 football this would be a ~34px overhang on each tip — visible clips through walls at the ends. Rejected: the visual inaccuracy is too noticeable for a ball the user will stare at.

**Fallback if `fromVertices` has position offset bugs in Phaser:** `setCircle(radiusY)` is the safe fallback. The explore session confirmed this is possible; test it during implementation.

### 3. Texture generation: dispatch to per-ball draw functions

Replace the single texture path in `generateTextures()` with a dispatch that calls a dedicated drawing function for each size. Signature:

```ts
function drawBall(g: Phaser.GameObjects.Graphics, s: BallSize): void
```

Each function draws into `g` with the ball centered at `(cx, cy)` = `(radiusX ?? radius, radiusY ?? radius)`. Texture canvas size: `(radiusX ?? radius) * 2` wide × `(radiusY ?? radius) * 2` tall. This is square for all circular balls and rectangular (wider than tall) for the football.

The football texture is naturally oriented landscape (wider than tall). Matter.js syncs the game object's rotation to the physics body angle, so the ellipse visually tumbles as the football rolls — no extra code needed.

### 4. Ball definitions

```
Size  Label        radius  radiusX  radiusY  Color      Points
   0  Ping Pong        12       —        —   0xff6b35    1   orange
   1  Golf Ball        15       —        —   0xfafafa    3   white
   2  Tennis           20       —        —   0xcfff04    6   yellow-green
   3  Baseball         27       —        —   0xfef3c7   10   cream
   4  Softball         36       —        —   0xfde047   15   bright yellow
   5  Volleyball       48       —        —   0x60a5fa   21   sky blue
   6  Soccer           61       —        —   0x1f2937   28   charcoal
   7  Basketball       74       —        —   0xe05d10   36   deep orange
   8  Football         84      84       50   0x78350f   45   dark brown  (ellipse)
   9  Beach Ball       96       —        —   0xf43f5e   55   coral
  10  Yoga Ball       110       —        —   0x818cf8   66   periwinkle
```

`SPAWN_MAX_SIZE = 4` (sizes 0–4 droppable, sizes 5–10 earned through merging).

### 5. Visual markings per ball type

All drawings use Phaser `Graphics` — `fillCircle`/`fillEllipse`, `beginPath`/`lineTo`/`bezierCurveTo`/`arc`/`strokePath`, `fillTriangle`. No external assets.

| Ball | Technique |
|------|-----------|
| Ping pong | Solid circle + shine highlight only (smooth surface) |
| Golf | White circle + ~18 small filled dots scattered in two rings (dimples) |
| Tennis | Yellow-green circle + one white S-curve bezier seam |
| Baseball | Cream circle + two red curved arc paths with perpendicular tick marks (stitching) |
| Softball | Bright yellow circle + same as baseball in blue |
| Volleyball | Sky blue circle + 3 curved white seam lines suggesting 6-panel construction |
| Soccer | Charcoal circle + 5 white outlined pentagons (center + 4 surrounding) |
| Basketball | Deep orange circle + 3 black curved seam lines (one vertical, two lateral) |
| Football | Dark brown ellipse (168×100) + white horizontal center seam + 4 white lace crossbars |
| Beach ball | Coral base + 6 alternating-color arc wedges (red, white, blue, yellow, green, orange) |
| Yoga ball | Smooth periwinkle circle + shine highlight only |

Soccer pentagons and beach ball wedges are the most complex; both are achievable with `arc`/`lineTo` paths.

## Risks / Trade-offs

**`fromVertices` position offset** → The football's physics body centroid may not align with the sprite origin, causing it to appear shifted. Mitigation: test on first implementation. Fallback to `setCircle(radiusY)` if misaligned; at the football's size (50px short radius) the visual overhand is tolerable.

**Non-square football texture sizing** → Phaser `matter.add.image` uses texture dimensions for the game object size. A 168×100 texture means the game object bounding box is wider than tall. Confirm `setBody` physics shape correctly overrides the default rectangle body the image would otherwise get.

**SPAWN_MAX_SIZE increase means easier starts** → Players can now drop up to size 4 (volleyball) rather than size 2 (baseball equivalent). This was an intentional design choice to match Suika Game structure, but it changes game balance. The new spawn ceiling is noticeably larger than the old one — the first few drops feel more varied.

**Console noise from `poly-decomp` warning** → Accepted. The warning appears in dev; Vite's production build strips console.warn calls by default.

## Open Questions

- Should the football fall back to `setCircle(radiusY)` silently on position-offset detection, or just use `fromVertices` unconditionally? Resolve during implementation.
- Do the leaderboard score distributions need to be reset/migrated when point values change? (Existing scores used 1–28 range; new scores use 1–66.) Decision: no migration — scores are not comparable across the theme change anyway; existing scores remain in the DB.
