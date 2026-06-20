## Context

`BallMergeScene.ts` owns all Phaser game logic. It already has an `update()` loop called every frame and a `updateAimLine()` method that redraws the dashed aim line on pointer/keyboard events. The HUD (score, buttons) lives in `BallMergeGame.tsx` as a React overlay absolutely positioned over the Phaser canvas; Phaser communicates to React via `game.events.emit(...)`.

Currently:
- `updateAimLine()` draws a static dashed vertical line using a `for` loop with fixed `y` offsets.
- Only `heldSize` exists — no queued next ball.
- `readyNextBall()` calls `pickSpawnSize()` and sets `heldSize` immediately after a drop.
- No level name is shown anywhere during gameplay; it's only visible on the level picker screen.

## Goals / Non-Goals

**Goals:**
- Animate the aim line dashes so they appear to flow downward continuously.
- Queue a second ball ahead of time and display it as "Next" in the game canvas HUD.
- Show the active level's human-readable name at the top of the screen.

**Non-Goals:**
- Changing aim line color, thickness, or opacity beyond the animation effect.
- Showing more than one ball ahead (only the immediate next).
- Persisting the next-ball queue across restarts (it resets, just like the held ball).
- Making the level name a tap target for changing levels (the existing "Change Level" flow covers that).

## Decisions

### 1. Aim line animation via time-based phase offset in `update()`

`updateAimLine()` currently runs only on pointer/keyboard events. To animate, it must run every frame. Move the call into `update()` and add a phase offset derived from `this.time.now` so the dashes march downward:

```
phase = (this.time.now * SPEED_PX_PER_MS) % step
for y starting at (startY - phase) ...
```

**Alternatives considered:**
- Phaser Tween on a Graphics offset — Tweens animate object properties, not Graphics redraw; would require an intermediate DisplayObject just to drive the offset. More complexity for no benefit.
- CSS animation on the canvas — CSS affects the whole canvas element, not a single drawn element. Not viable.

### 2. Next ball rendered in Phaser canvas (not emitted to React)

A small `Phaser.GameObjects.Image` (reusing existing `ball-${n}` textures) plus a `Phaser.GameObjects.Text` label is the minimal-code approach. Ball textures are already generated in `generateTextures()`. No React state or event bridge needed.

**Alternative considered:** Emit `next-ball` event → React state → display in React HUD. This would require coordinating two rendering contexts and emitting on every `readyNextBall()` call and restart. The Phaser-native approach is simpler.

### 3. Next ball queue: swap-on-drop pattern

Add `private nextSize = 0` to the scene. On the very first `readyNextBall()` call (in `create()`), initialize both:
```
this.nextSize = pickSpawnSize()   // queue the next
this.heldSize = pickSpawnSize()   // set held
```
On every subsequent call (after a drop):
```
this.heldSize = this.nextSize
this.nextSize = pickSpawnSize()
```
This avoids any special-casing: `readyNextBall()` always ends with a valid `heldSize` and `nextSize`.

### 4. "Next" display position

Place the next-ball preview image and "NEXT" text label in the top-right of the Phaser canvas (e.g., x ≈ `GAME_W - 30`, y ≈ `dropY`), sized at roughly half the held ball's display size. This mirrors the held-ball preview position on the opposite side.

### 5. Level name displayed in React HUD (not Phaser)

The level name is a static string for the duration of a game. `BallMergeGame.tsx` already tracks `selectedLevelId` state. Import `findLevel` from `levels.ts` to get `LevelDef.name` and display it in the center of the existing top HUD bar.

**Alternative considered:** Phaser text object in the canvas. The level name is inert data (doesn't change mid-game) and fits naturally alongside the React score display. React is the right layer here — no Phaser object lifecycle needed.

**Positioning**: Center the level name between the left (score) and right (buttons) groups already in the top HUD. Use the same `bg-gray-800/80 rounded-lg` pill style for visual consistency with the score chip.

## Risks / Trade-offs

- **Frame-rate dependency of animation**: The phase offset uses `this.time.now` (wall clock ms), so animation speed is consistent regardless of frame rate. No risk here.
- **`updateAimLine()` called every frame**: Currently called only on input events, which is cheap. Calling it every frame adds a `graphics.clear()` + redraw every tick. Profiling is not a concern at this scale (single small Graphics object, ~30 dashes max).
- **Texture size for "Next" ball**: Using the same `ball-${n}` textures at reduced `setScale()` may look blurry at small sizes since textures are rasterized at full size. Acceptable for this context; the held ball already uses the same approach.

## Open Questions

_(none — scope is fully bounded)_
