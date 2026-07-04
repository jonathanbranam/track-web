# engineering-with-ai Talk — Architecture

The talk is a self-playing, fully scripted top-down RPG in the style of Dragon Warrior (NES). This doc covers the technical architecture of the full end-to-end solution. See `script.md` for the beat-by-beat content and `assets.md` for the pixel-art pipeline.

> **This doc implements `requirements.md`, which is authoritative.** Where the two disagree, `requirements.md` wins and this doc should be updated to match. As of 2026-07-04 this doc has been reconciled with `requirements.md`'s step/resting-state model (§5 there) — see "Director — resting-state step model" below. **Note:** the currently-shipped scaffold (`client-talks/src/talk-rpg/`, from the archived OpenSpec change `2026-07-01-add-engineering-with-ai-talk-game` and the `talk-rpg-experience` spec) still implements the *older* forward-only Beat/Director model this doc previously described. It's a small scaffold (2 beats: title screen + name-entry stub) and will need a follow-up OpenSpec change to bring it in line with the model below before Phase 2+ work builds on it.

> **Delivery context (locked 2026-07-04):** this talk is given fully remote over Zoom, screen-shared from the presenter's own laptop, with nobody in the room. There is no live audience, no projector, and **no presentation clicker/remote — the presenter will never use one.** All input is laptop keyboard, trackpad/click, and on-screen controls. This supersedes any earlier assumption of a large live room or clicker hardware.

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

**Why two renderers:** Phaser excels at sprite animation, tile maps, and frame-by-frame scene control. DOM text is crisp at any resolution and free from bitmap-font shimmer — it also compresses far better over Zoom's screen-share codec than fine in-canvas pixel text does. All readable text lives in the overlay — never inside the Phaser canvas.

---

## Director — resting-state step model

The `Director` (a React context + reducer) owns the entire presentation state, structured around `requirements.md` §5's core rule:

> `snapTo(i)` sets every scriptable field explicitly from step *i*'s definition and never inherits leftover values from a previous step. `animateInto(i)` interpolates the animatable subset from *i-1* to *i*; non-animatable fields switch discretely.

This is the load-bearing contract — it's what makes back-jump, pause, and skip trivial and safe instead of fragile.

### Step data shape

```ts
// client-talks/src/talk-rpg/steps.ts
interface Step {
  id: number
  scene: 'meta' | 'town' | 'overworld' | 'cave' | 'battle'
  camera: { x: number; y: number; zoom: number }
  entities: Record<string, EntityState>   // position, facing, current animation, per entity id
  ui: UiState | null                      // active dialogue box / menu / status screen, its text, selection highlight
  overlay: OverlayState | null            // active full-screen card (headline/title) and its text
  meters: Record<string, number>          // gold/cost counter, bar-style capacity if used
  light: { radius: number; anchorEntityId: string } | null   // cave/fog scenes only
  battle: BattleState | null              // combatant/enemy HP and in-fight status
  achievement?: string                    // fires on entering this step
  pauseAfter: boolean                     // presenter stopping point
  section?: string                        // for skip-to-section
}

interface EntityState {
  x: number
  y: number
  facing: 'north' | 'south' | 'east' | 'west'
  animation: string
}
```

Every field is populated on every step — there is no "leave it as whatever it was" case. A step that doesn't use battle/light/meters sets those to `null`/empty explicitly. This is more verbose to author by hand, which is exactly why `requirements.md` treats a declarative script format and authoring tooling as first-class (§4J) rather than something to backfill later.

### Playback state machine

```
  RESTING (at rest on step i, fully snapped)
     │
     ├─[next()]──▶ ANIMATING (tweening i → i+1, possibly chaining
     │                         through several steps to the next
     │                         pauseAfter break) ──▶ RESTING (i+1 or later)
     │
     ├─[back()]──▶ RESTING (snapTo previous pauseAfter step, instant, no tween)
     │
     ├─[skipToSection(id)]──▶ RESTING (snapTo first step in section, instant)
     │
     └─[pause()] (only while ANIMATING) ──▶ ANIMATING, tweens frozen mid-flight
                    │
                    └─[resume()]──▶ ANIMATING, tweens continue from frozen position
```

- **`next()`** — if `RESTING`, starts `animateInto` on the following step; if that step's `pauseAfter` is false, chains directly into `animateInto` of the step after it (on tween/animation completion, not a fixed timer), continuing until a `pauseAfter` step is reached. This is "segment playback to a break" from `requirements.md` §4A.
- **`back()`** — always an instant `snapTo`, never a reverse animation. Jumps to the previous `pauseAfter` step. No tweening back — matches the requirement that back must be instant and can never desync.
- **`skipToSection(id)`** — instant `snapTo` of the first step tagged with that `section`. Used for rehearsal and recovery.
- **`pause()` / `resume()`** — only meaningful mid-`ANIMATING`. Implemented via Phaser's native `Tween.pause()`/`Tween.resume()` rather than a custom clock, so "frozen mid-motion" is exact, not approximated.

`Director` never lets the display depend on *how* playback arrived at a step — only on the step's own index. `snapTo` is the single function that both `back()` and `skipToSection()` funnel through, and it's also how the scene initializes on load (`snapTo(0)`).

---

## Phaser integration

Follows the existing `PhaserGame.tsx` pattern from `client-games` (unchanged from the original scaffold):

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
    directorContext.onSnap((step) => game.events.emit('snap', step))
    directorContext.onAnimate((fromStep, toStep) => game.events.emit('animate', fromStep, toStep))
    game.events.on('animation-complete', () => directorContext.onAnimationComplete())
  }}
/>
```

`PhaserGame.tsx` is copied from `client-games/src/games/PhaserGame.tsx` into `client-talks/src/talk-rpg/`. No shared package needed yet.

### Scene structure

`TalkRpgScene` is no longer a switch-statement segment player keyed by an opaque string — it's a generic **resting-state applier** driven entirely by the `Step` shape, so any step can be reached from any other step with the same code path:

```
  create()
    → register 'snap' and 'animate' listeners
    → load placeholder / real assets

  on('snap', step)
    → applyStepInstant(step)
       sets scene/area, camera, every entity's position/facing/animation frame,
       active UI, overlay, meters, light radius, battle state — all discretely,
       all at once, from step alone

  on('animate', fromStep, toStep)
    → animateToStep(fromStep, toStep)
       tweens the animatable subset (entity positions, camera, meter values,
       light radius, HP) from fromStep → toStep
       switches non-animatable fields (active scene, visible menu/overlay text)
       discretely, at the point the corresponding change happens in-fiction
    → when the tween chain completes: emit('animation-complete')
```

During the scaffold phase, `applyStepInstant`/`animateToStep` render primitives (rectangles, `Phaser.GameObjects.Text`, `Graphics`) for whichever fields a given step actually uses. Real sprites slot into the same entity-rendering path later without changing the Director/scene contract — this is the same swap-without-engine-changes guarantee `requirements.md` §4I asks for.

---

## Input handling

No presentation clicker is used or planned — see the delivery-context note at the top of this doc. All input is laptop-native:

| Input | Action |
|-------|--------|
| `ArrowRight`, `Space`, click anywhere on the experience | `next()` |
| `ArrowLeft` | `back()` |
| `P` (or `Escape` while animating) | toggle `pause()` / `resume()` |
| On-screen control bar (Next / Back / Pause) | same three actions; always visible as a fallback and for setup/rehearsal |
| Dev-only debug panel: step-index readout + jump-to-index field | `skipToSection()` / direct `snapTo(i)` — rehearsal and development only, not shown live |

Clicking a toolbar button (Full Screen, Expand) does not also trigger `next()`.

---

## Full-screen modes

Two modes, one toolbar button each:

| Mode | Mechanism | Use case |
|------|-----------|----------|
| **Expand** | `position: fixed; inset: 0` on `ExperienceRoot` | Presenter wants their own laptop chrome accessible (tab bar, dock) while screen-sharing |
| **Full Screen** | `document.documentElement.requestFullscreen()` | A clean, chrome-free capture area for the Zoom share |

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
      Director.tsx          ← React context + reducer: steps array, RESTING/ANIMATING
                               status, snapTo/animateInto/next/back/pause/resume/
                               skipToSection (source of truth)
      PhaserGame.tsx         ← copied from client-games (35 lines)
      TalkRpgScene.ts        ← single Phaser scene: applyStepInstant + animateToStep,
                               generic over the Step shape (not a segment switch)
      steps.ts               ← all Step definitions (renamed from script.ts to match
                               the step/resting-state model; was Beat[] before)
      RpgExperience.tsx      ← ExperienceRoot: Phaser host + React overlay + input handling
      Overlay.tsx            ← caption/UI/overlay + toolbar React component, reads
                               the current step's `ui`/`overlay` fields
    pages/
      TalkPage.tsx           ← modified: detects rich talk, renders RpgExperience
    talks.ts                 ← Talk interface gains optional `kind: 'rpg'` field
```

---

## Implementation phases

Phase sequencing, capability grouping, and milestones now live in `requirements.md` §7 (phased implementation) and §8 (candidate OpenSpec proposal boundaries) — that is the authoritative source since it front-loads the Director/step-model risk this doc used to underweight. This doc's role is to pin down *how* those phases get built technically (render stack, file layout, scene contract) once each is proposed.

The scaffold currently in `client-talks/src/talk-rpg/` corresponds to `requirements.md`'s Phase 1 milestone (colored-block steps, forward playback only) but predates the resting-state Director contract above — it needs a follow-up OpenSpec change before Phase 2 (world rendering) work builds on it, so that back/pause/skip aren't retrofitted onto a model that was never designed to support them.
