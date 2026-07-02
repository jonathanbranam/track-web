# engineering-with-ai Talk — Architecture

The talk is a self-playing, fully scripted top-down RPG in the style of Dragon Warrior (NES). This doc covers the technical architecture of the full end-to-end solution. See `script.md` for the beat-by-beat content and `assets.md` for the pixel-art pipeline.

---

## Render stack

Two renderers run in the same DOM, layered:

```
  ┌──────────────────────────────────────────────────────────────┐
  │  ExperienceRoot  (position: fixed | fullscreen)              │
  │                                                              │
  │  ┌─────────────────────────────────────────────────────┐     │
  │  │  Phaser <canvas>  (z-index: 0)                      │     │
  │  │  • tile world, sprite movement, battle animation    │     │
  │  │  • Phaser primitives during scaffold phase          │     │
  │  │  • pixellab.ai sprites once art is ready           │     │
  │  └─────────────────────────────────────────────────────┘     │
  │                                                              │
  │  ┌─────────────────────────────────────────────────────┐     │
  │  │  React DOM overlay  (z-index: 10, pointer-events:   │     │
  │  │                       none except toolbar)          │     │
  │  │  • act cards, encounter labels, captions            │     │
  │  │  • Tailwind text — crisp, projector-safe, no IP     │     │
  │  │  • toolbar: Expand / Full Screen / Fallback Video   │     │
  │  └─────────────────────────────────────────────────────┘     │
  └──────────────────────────────────────────────────────────────┘
```

**Why two renderers:** Phaser excels at sprite animation, tile maps, and frame-by-frame scene control. DOM text is crisp at any resolution and free from bitmap-font shimmer. All readable text lives in the overlay — never inside the Phaser canvas.

---

## Director — single source of truth

The `Director` (a React context + reducer) owns the entire presentation state. It advances on a keypress (`ArrowRight`, `Space`) or a mouse click anywhere on the experience. An optional on-screen button provides a secondary click target. No presentation remote required — presenter runs from their own laptop.

```
  Speaker presses key or clicks
          │
          ▼
  Director.advance()       [React context]
          │
    ┌─────┴──────────────────────────────────┐
    │                                        │
    ▼                                        ▼
  game.events.emit('beat', n)        React re-render
  Phaser plays segment n             Overlay shows beat n caption
  When done: emit 'segment-complete'
  Director enters WAITING state
```

### Beat lifecycle

```
  WAITING ──[advance()]──▶ PLAYING
  PLAYING ──[segment-complete]──▶ WAITING
```

A beat only advances on a manual input (key or click). The game plays its scripted segment, emits `segment-complete`, and then freezes with the caption showing. The speaker talks, inputs advance, and the cycle continues.

### Beat data shape

```ts
interface Beat {
  id: number
  phaserSegment: string      // e.g. 'title-screen', 'battle-slime-loop', 'party-joins'
  caption?: {
    type: 'act-card' | 'encounter' | 'punchline' | 'dialogue'
    text: string
  }
  autoClearMs?: number       // caption auto-clears after N ms (for pure spectacle beats)
}
```

All beats are defined in `client-talks/src/talk-rpg/script.ts`. The Phaser scene receives `phaserSegment` strings and runs the matching animation sequence.

---

## Phaser integration

Follows the existing `PhaserGame.tsx` pattern from `client-games`:

```tsx
// client-talks/src/talk-rpg/RpgPhaserHost.tsx
<PhaserGame
  buildConfig={(parent) => ({
    type: Phaser.AUTO,      // WebGL with Canvas fallback
    parent,
    width: 960,
    height: 540,
    pixelArt: true,
    scene: [TalkRpgScene],
  })}
  onGameReady={(game) => {
    // Wire Director → Phaser
    directorContext.onBeat((beat) => {
      game.events.emit('beat', beat)
    })
    // Wire Phaser → Director
    game.events.on('segment-complete', () => {
      directorContext.setWaiting()
    })
  }}
/>
```

`PhaserGame.tsx` is copied from `client-games/src/games/PhaserGame.tsx` into `client-talks/src/talk-rpg/`. 35 lines — no need for a shared package yet.

### Scene structure

`TalkRpgScene` is a single Phaser scene that acts as a state machine over segments:

```
  create()
    → register 'beat' listener
    → load placeholder / real assets

  on('beat', beat)
    → switch(beat.phaserSegment)
       case 'title-screen': playTitleScreen()
       case 'walk-castle':  playWalkCastle()
       case 'battle-slime': playBattleSlime()
       ...
    → when segment ends: emit('segment-complete')
```

During the scaffold phase, each segment is rendered with Phaser primitives (rectangles, Phaser.GameObjects.Text, Graphics). Real sprites slot in later without changing the Director/scene interface.

---

## Full-screen modes

Two modes, one toolbar button each:

| Mode | Mechanism | Use case |
|------|-----------|----------|
| **Expand** | `position: fixed; inset: 0` on `ExperienceRoot` | Presenter wants browser chrome accessible (tab bar, dock) |
| **Full Screen** | `document.documentElement.requestFullscreen()` | Conference room TV, no-chrome takeover |

Expand is always available (no browser permission needed). Full Screen can be denied in certain iframe/browser contexts — Expand is the fallback.

---

## File layout (client-talks)

```
client-talks/
  public/
    rpg/
      fallback.mp4          ← recorded-video safety net (Phase 4)
      assets/
        character.png       ← pixellab.ai spritesheet (Phase 3)
        tileset.png         ← pixellab.ai tileset (Phase 3)
        enemies.png         ← pixellab.ai enemy sprites (Phase 3)
  src/
    talk-rpg/
      Director.tsx          ← React context + reducer (source of truth)
      PhaserGame.tsx        ← copied from client-games (35 lines)
      TalkRpgScene.ts       ← single Phaser scene, segment state machine
      script.ts             ← all Beat definitions
      RpgExperience.tsx     ← ExperienceRoot: Phaser host + React overlay
      Overlay.tsx           ← caption + toolbar React component
    pages/
      TalkPage.tsx          ← modified: detects rich talk, renders RpgExperience
    talks.ts                ← Talk interface gains optional `kind: 'rpg'` field
```

---

## Implementation phases

| Phase | What ships | This change? |
|-------|-----------|------|
| **1 — Scaffold** | Phaser mounted, Director wired, full-screen modes, single screen (title) with Phaser primitives | **Yes** |
| **2 — Script** | All 10 beats stubbed as primitive scenes; complete `script.ts`; overlay captions for every beat | No |
| **3 — Art** | pixellab.ai assets integrated; real tileset, character walk, enemy sprites | No |
| **4 — Polish** | Recorded-video fallback, rehearsal passes, timing refinement | No |

Each phase is independently deployable. The scaffold in Phase 1 is the minimum viable framework every later phase builds on.
