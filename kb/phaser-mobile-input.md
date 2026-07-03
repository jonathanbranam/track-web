# Phaser input on mobile / iOS

**Applies to:** any Phaser game in this monorepo (`client-games`, `client-talks`, and
future Phaser apps) where the user interacts by tapping — either the game canvas
itself or React/DOM buttons layered over it.

## The symptom

Taps do nothing on an iOS mobile browser while the exact same interaction works
on desktop with a mouse. This has bitten us twice:

- `client-talks` talk-RPG: "tap anywhere to advance" and the ADV / expand /
  fullscreen overlay buttons were dead on iOS.
- `client-games` ball-merge: the score/quit/shake/leaderboard HUD buttons.

## Root cause

Phaser installs its own input listeners on the `<canvas>` **and** on `window`, and
by default calls `preventDefault()` on touch events. On iOS Safari, a tap only
produces a synthesized `click` (and the compatibility mouse events) if the
browser's default touch handling is allowed to run. When Phaser calls
`preventDefault()`, that synthesized `click` is suppressed — so any handler that
depends on a DOM `click` (React `onClick`, a container `onClick`, etc.) never
fires from a tap. Mouse input on desktop is unaffected, which is why "works on
desktop, dead on mobile" is the tell-tale signature.

There are **two distinct interaction surfaces**, and each needs its own fix.

## Fix 1 — Canvas taps: use Phaser's own scene input

For interactions on the canvas itself (dropping a ball, selecting a unit,
"tap to advance"), do **not** rely on a DOM `click` bubbling off the canvas.
Handle it inside the scene with Phaser's pointer input, which receives the touch
directly and works uniformly on desktop and iOS:

```ts
// In the Scene's create()
this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
  // handle the tap, or emit a game event for React to consume
  this.game.events.emit('tap-advance')
})
```

Examples in the codebase:
- `client-games/src/games/ball-merge/BallMergeScene.ts` — `pointermove` / `pointerdown` / `pointerup` to aim and drop.
- `client-games/src/games/dungeon-tactics-solo/DungeonTacticsScene.ts` — pointer input for selection/movement.
- `client-talks/src/talk-rpg/TalkRpgScene.ts` — `pointerdown` emits `tap-advance`.

When React needs to react to a canvas tap, have the scene `emit` a game event and
subscribe on the React side via `game.events.on(...)`. Re-subscribe when the
handler's dependencies change (e.g. a `useEffect` keyed on the relevant value) so
you always call the current closure rather than a stale one.

A bonus of this approach: a tap that lands on a DOM button layered over the canvas
never reaches the canvas, so it never triggers the canvas handler — no
`stopPropagation` juggling required.

## Fix 2 — DOM buttons over the canvas: disable Phaser's window listeners

For React/DOM buttons positioned over the canvas that use `onClick`, keep the
`onClick` but stop Phaser from killing the synthesized click. Set
`input: { windowEvents: false }` in the game config so Phaser does not add the
window-level touch/mouse listeners that `preventDefault()`:

```ts
const config: Phaser.Types.Core.GameConfig = {
  // ...
  // Prevent Phaser from adding window-level touchend/mousemove listeners that
  // call preventDefault() and suppress the synthesized click events that React
  // overlay buttons depend on.
  input: { windowEvents: false },
}
```

Examples in the codebase:
- `client-games/src/games/ball-merge/BallMergeGame.tsx`
- `client-games/src/games/prototypes/ball-merge-physics/BallMergePhysicsGame.tsx`
- `client-talks/src/talk-rpg/RpgExperience.tsx`

`windowEvents: false` only disables the **window-level** listeners; the
canvas-level listeners still work, so Fix 1 (scene `this.input`) keeps functioning
alongside it.

## Decision guide

- Interaction is on the canvas → **Fix 1** (scene `this.input`).
- Interaction is a DOM/React button over the canvas → **Fix 2**
  (`input: { windowEvents: false }`, keep `onClick`).
- Both present (canvas taps *and* overlay buttons) → apply **both**.

## What not to do

- Don't rely on a container-level DOM `onClick` to catch canvas taps — it's the
  thing iOS suppresses.
- Swapping `onClick` for `onPointerUp` on a container "works" but is a one-off that
  diverges from the two patterns above; prefer the scene-input + `windowEvents`
  approach so all Phaser apps behave consistently.
- Note: over a plain-HTTP LAN IP the page is not a secure context (see
  `CLAUDE.md` → Local Testing), but pointer/touch input is unaffected by that —
  this issue is purely about Phaser's `preventDefault`, not secure context.

## Testing

Reproduce on a real iOS device (or an iOS simulator / Safari responsive design
mode with touch emulation) — desktop mouse input will not surface the bug.
