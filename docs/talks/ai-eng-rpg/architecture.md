# engineering-with-ai Talk — Architecture

The talk is a self-playing, fully scripted top-down RPG in the style of Dragon Warrior (NES). This doc covers the technical architecture of the full end-to-end solution. See `adm-talk-story-board-01.md` for the beat-by-beat content and `assets.md` for the pixel-art pipeline.

> **This doc implements `requirements.md`, which is authoritative.** Where the two disagree, `requirements.md` wins and this doc should be updated to match. As of 2026-07-05 this doc, and the shipped code, both reflect `requirements.md`'s action-list / precompute-pass model (§5 there) — see "Director" below. **Status:** Phases 1–7 of `phased-implementation.md` are complete and archived (`director-precompute-pass`, `world-rendering-integration`, `text-ui-overlay`, `scripted-battle`, `meters-and-light-radius`, `party-and-stats`, `meta-shell-flourishes`); `client-talks/src/talk-rpg/` fully implements the Director/precompute-pass architecture described below, not the original forward-only scaffold. A separate `script-selector` change also landed a script-library/select-screen layer (see "File layout"). Remaining work is Phase 8 (asset integration — no real PixelLab art has been swapped in yet) and Phase 9 (Zoom-performance hardening), both not started.

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

## Director

The `Director` (a React context + reducer) owns the entire presentation state. It is built around the two-layer split from `requirements.md` §5:

1. **Actions** — the authored script: a flat ordered list of small game-engine actions (`walk`, `walkTo`, `startDialogue`, `say`, `pause`, `stop`, `thought`, `enterScene`, …), run against a **fixed, pre-built map** that already knows where every NPC and named location is.
2. **Resting states** — never hand-written. Before playback starts, the entire action list is run once, headlessly (no real animation timing, no waiting out `pause` durations), recording the full world snapshot at every `stop` action. This is the **precompute pass**, and its output is a plain array of resting-state snapshots, one per checkpoint — see "The precompute pass" below for whether that run happens in-browser or offline.

**There is no `animateInto`/tween step between two resting states.** Forward motion between checkpoints is always the *real* action executing — a walk actually stepping tile-by-tile (or following a pathfound route), a dialogue box actually revealing a line, a `pause` actually counting down. Nothing generically interpolates the fields of two arbitrary snapshots; each action type owns its own in-engine playback.

### Action vocabulary

`action-vocabulary.md` is the authoritative, currently-maintained version of
this table — it now lists 25 established action types shipped across Phases
1–7 (walk/navigation, dialogue/thought, menus/overlays, scripted battle,
meters/light radius, party/status, and the meta-shell/achievement actions),
plus the still-proposed ones. Don't duplicate that list here; skim it for the
full `Action` union (`client-talks/src/talk-rpg/script.ts`). Dialogue actions
still carry no NPC/choice reference (single global dialogue state) — the one
Phase 1-era limitation still true today.

Everything except `stop` plays automatically once triggered — the Director chains straight through non-`stop` actions on real completion (a walk finishes, a pause elapses, a line finishes displaying), which is "segment playback to a break" from `requirements.md` §4A. `stop` is the only place the precompute pass snapshots and the only place `next()` waits.

### The fixed map

Each map (`world-castle.json`, `world-overworld.json`, per `assets.md`) is authored once, ahead of time, as a Tiled JSON map that already bakes in:

- a walkable-tile grid (for `walk`/`walkTo` movement and the A* pathfinder)
- NPC placements, keyed by entity ID
- named locations (e.g. `"familiar-training-arena"`) resolvable by `walkTo` and `enterScene`

Actions reference entity IDs and location names — never raw coordinates. Moving an NPC or reshaping a room means editing the map file, not the script, and a `walkTo` action keeps working across minor map edits because the path is recomputed, not hardcoded.

### The precompute pass

```
runPrecompute(actions: Action[], map: MapData): RestingState[]
  world = initialWorldState(map)
  checkpoints = []
  for action of actions:
    applyActionHeadlessly(world, action, map)   // instant: resolves pathfinding, sets final
                                                 // positions/UI/text, skips real timers
    if action.type === 'stop':
      checkpoints.push(deepClone(world))
  return checkpoints
```

This is safe specifically because nothing in the show is random or network-dependent — the same action list always produces the same checkpoints, byte-for-byte, no matter when or where it's run.

**When it runs is a performance decision, not fixed:**

- **In-browser, on load (default while building the talk).** Simplest to wire up, and best for iteration — every script edit is reflected immediately on next load, which matters a lot when you're reworking the ending and don't want to click through everything before it. `precompute.ts` has no Phaser dependency, so this can even run before the Phaser game boots.
- **Offline / at build time (fallback if load-time cost is too high).** Run the identical `runPrecompute` — e.g. via a small Node/CLI script or a build step — against the final action list and map, and write the resulting `RestingState[]` to a JSON file the app loads at runtime instead of recomputing. Same `Director`/scene contract either way; only where the array comes from changes.

Measure actual load time against the full, final action list before deciding — see `requirements.md` Phase 9. Don't build the offline path preemptively; the in-browser pass is simpler and may just be fast enough.

### Playback state machine

```
  RESTING (at checkpoint i, fully snapped from the precomputed array)
     │
     ├─[next()]──▶ PLAYING (executing real actions from checkpoint i toward i+1,
     │                       chaining action-to-action on real completion)
     │                    ──▶ RESTING (checkpoint i+1)
     │
     ├─[back()]──▶ RESTING (snapTo(checkpoints[i-1]) — instant, no replay)
     │
     ├─[skipToSection(id)/skipTo(i)]──▶ RESTING (snapTo(checkpoints[j]) — instant,
     │                                            any direction, any distance)
     │
     └─[pause()] (only while PLAYING) ──▶ PLAYING, current action suspended mid-flight
                    │
                    └─[resume()]──▶ PLAYING, current action continues from where it paused
```

- **`next()`** — if `RESTING` at checkpoint *i*, starts executing the real actions between checkpoint *i* and checkpoint *i+1* live, in order, on the actual game engine (real walk, real pathfind, real dialogue reveal, real pause timer) — not a tween of anything. When the next `stop` is reached, transitions back to `RESTING`.
- **`back()` / `skipToSection()` / `skipTo(i)`** — always an instant `snapTo` against the **precomputed** checkpoint array, never a replay and never a reverse animation. This is what makes "jump to any point, forward or backward" cheap: the expensive part (running the whole script) already happened once at load.
- **`pause()` / `resume()`** — only meaningful mid-`PLAYING`. Each action type is responsible for being pausable/resumable on its own terms: a `walk` action may use a Phaser tween internally to move a sprite smoothly between tiles, so pausing it is just `Tween.pause()`/`Tween.resume()` — but that's an implementation detail of the *walk executor*, not a framework-level generic tween between two world snapshots. A `say` action's pause might halt a typewriter-reveal timer; a `pause` action's pause just stops its own countdown. The Director only needs to know "ask whatever's currently executing to pause/resume."

`Director` never lets the display depend on *how* playback arrived at a checkpoint — only on the checkpoint's own precomputed snapshot. `snapTo` is the single function that `back()`, `skipToSection()`, and initial load (`snapTo(checkpoints[0])`) all funnel through.

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
    directorContext.onSnap((restingState) => game.events.emit('snap', restingState))
    directorContext.onPlayAction((action) => game.events.emit('play-action', action))
    game.events.on('action-complete', () => directorContext.onActionComplete())
  }}
/>
```

`PhaserGame.tsx` is copied from `client-games/src/games/PhaserGame.tsx` into `client-talks/src/talk-rpg/`. No shared package needed yet.

### Scene structure

`TalkRpgScene` has two responsibilities, corresponding to the Director's two modes:

```
  create()
    → register 'snap' and 'play-action' listeners
    → load the fixed map + placeholder / real assets

  on('snap', restingState)
    → applyRestingState(restingState)
       sets scene/area, camera, every entity's position/facing/animation frame,
       active UI, overlay, meters, light radius, battle state — all discretely,
       all at once, from the snapshot alone, no motion

  on('play-action', action)
    → the matching action executor runs it for real, one per established
      action type in `action-vocabulary.md` — grouped by what they touch:
         'walk' / 'walkTo' / 'enterScene'        → tile-by-tile move / A*-pathfind / scene switch
         'startDialogue' / 'say' / 'endDialogue' / 'thought' → dialogue box + thought bubble (DialogueBox.tsx)
         'showMenu' / 'selectMenuOption' / 'hideMenu' → command window (MenuShell.tsx)
         'showOverlay' / 'hideOverlay' / 'showSaveFile' → full-screen cards (headline/title/defeat/save-file kinds)
         'startBattle' / 'endBattle' / 'battleAction' / 'defeatSequence' / 'tagCombatant' / 'partyJoin' → battle arena + HUD (BattleHud.tsx)
         'setMeter' / 'addMeter' / 'setLightRadius' → HUD meters + light radius (MeterHud.tsx)
         'showStatus' / 'levelUp'                → status screen + fanfare narration
         'showAchievement' / 'hideAchievement'    → toast (AchievementToast.tsx), independent of the above
         'pause'                                  → a real timer
    → when the action's own completion condition fires (tween done, timer done,
      text fully shown): emit('action-complete')
```

During the scaffold phase, action executors render primitives (rectangles, `Phaser.GameObjects.Text`, `Graphics`) rather than real sprites. Real sprites slot into the same entity-rendering path later without changing the Director/scene contract — this is the same swap-without-engine-changes guarantee `requirements.md` §4I asks for. The **precompute pass itself never touches Phaser** — it runs against a lightweight headless copy of the same map/action logic so it can execute instantly without rendering a single frame.

---

## Input handling

No presentation clicker is used or planned — see the delivery-context note at the top of this doc. All input is laptop-native:

| Input | Action |
|-------|--------|
| `ArrowRight`, `Space`, click anywhere on the experience | `next()` |
| `ArrowLeft` | `back()` |
| `P` (or `Escape` while playing) | toggle `pause()` / `resume()` |
| On-screen control bar (Next / Back / Pause) | same three actions; always visible as a fallback and for setup/rehearsal |
| Dev-only debug panel: checkpoint-index readout + jump-to-index field | `skipToSection()` / direct `snapTo(i)` — rehearsal and development only, not shown live |

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

Current as of the `script-selector` change (2026-07-05); update this diagram
in the same change whenever files are added/renamed/removed under
`talk-rpg/`.

```
client-talks/
  public/
    rpg/
      maps/
        world-town.json       ← Tiled JSON: walkable grid, NPC placements, named locations
        world-overworld.json
        world-cave.json
      assets/                 ← empty — Phase 8 (asset integration) not started;
                                everything renders via Phaser primitives today
  src/
    talk-rpg/
      script.ts               ← shared Action union + types/constants (MAP, MAPS,
                                TILE_TYPES, …) that every named script imports; no
                                longer exports a single hardcoded SCRIPT (see scripts/)
      scripts/                ← named, selectable Action[] scripts (script-library
                                capability); index.ts registers each by id/name
        index.ts               ← SCRIPTS: NamedScript[] registry
        test-script.ts, hello-json.json, …  ← individual scripts (inline or file-based)
      directorEngine.ts       ← DirectorEngine class: framework-agnostic playback
                                engine (no React/Phaser) — owns the action list, the
                                precomputed checkpoint array, and
                                snapTo/next/back/restart/pause/resume/skipTo
      Director.tsx            ← thin React binding over DirectorEngine (context + hook)
      precompute.ts           ← runPrecompute/computeStopIndices/createInitialWorld →
                                RestingState[]; the headless simulation pass, no
                                Phaser dependency; called in-browser on load today
      pathfinding.ts          ← A* over a map's walkable-tile grid, used by both
                                precompute.ts (headless) and the real walkTo executor
      executors.ts            ← one executor per established action type (walk,
                                walkTo, dialogue, menu, overlay, battle, meter,
                                light-radius, status, achievement, …)
      EntityView.ts           ← per-entity sprite/position rendering on the Phaser canvas
      useWorldAnchor.ts        ← hook anchoring HUD/thought-bubble elements to a
                                moving world entity's screen position
      PhaserGame.tsx           ← copied from client-games
      TalkRpgScene.ts          ← applyRestingState (instant snap) + wires executors
                                to real Phaser playback
      RpgExperience.tsx        ← ExperienceRoot: Phaser host + React overlay + input
                                handling; takes the selected NamedScript as a prop
      Overlay.tsx              ← act-card/headline/title/defeat/save-file overlay +
                                toolbar
      DialogueBox.tsx, MenuShell.tsx, BattleHud.tsx, MeterHud.tsx,
      AchievementToast.tsx, TextCard.tsx  ← one React component per HUD/overlay
                                surface listed under "Scene structure" above
    pages/
      TalkPage.tsx             ← renders ScriptSelectPage (no script chosen) or
                                RpgExperience (script chosen) for kind: 'rpg' talks
      ScriptSelectPage.tsx     ← interstitial list of SCRIPTS, navigates to
                                /talks/:slug/:script
    talks.ts                   ← Talk interface has `kind?: 'content' | 'rpg'`
```

---

## Implementation status

Phase sequencing, capability grouping, and milestones live in
`phased-implementation.md` (expanded) and `requirements.md` §7/§8 (terse
original) — those are authoritative for what's done and what's next. This doc
only pins down *how* each phase was/will be built technically (render stack,
file layout, scene contract).

**Done:** Phases 1–7 — Director/precompute-pass core, world rendering,
text/UI overlay, scripted battle, meters + light radius, party/stats, and
meta-shell/flourishes (title screen, save-file framing, achievement toasts) —
are all complete and shipped as archived OpenSpec changes. The Director/scene
architecture described above is the *actual*, current implementation, not a
target. The `script-selector` change additionally added the script-library +
select-screen layer in "File layout" above (not itself one of the 9 phases,
but built on top of them).

**Not started:** Phase 8 (asset integration — swap every placeholder for real
PixelLab art; `public/rpg/assets/` is still empty) and Phase 9 (Zoom-performance
hardening). Both are validation/integration passes on top of the existing
architecture, not new engine capability — no further Director/precompute-pass
changes are anticipated to land them.
