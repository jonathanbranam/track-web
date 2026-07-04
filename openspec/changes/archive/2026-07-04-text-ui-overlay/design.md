## Context

Phase 2 (`world-rendering-integration`) has since landed in code — it wires
the Director into a real Phaser scene but is explicitly scoped to no DOM
overlay at all beyond the presenter control bar. The render stack that
actually shipped differs from `architecture.md`'s original sketch in one
important way: there is **no** `'snap'`/`'play-action'`/`'action-complete'`
event trio. What's real is simpler — `RpgExperience.tsx`'s `PhaserStage`
component emits a single `'director-snapshot'` event (carrying the full
`DirectorSnapshot`: `status`, `checkpointIndex`, `checkpointCount`, `resting`,
`paused`) into the Phaser game's event emitter every time `useDirector()`'s
snapshot changes, and `TalkRpgScene.applySnapshot` is the *only* consumer —
it doesn't distinguish a "snap" from "live playback" as separate signals; it
diffs the previous vs. current entity position itself to decide idle-vs-walk
animation. Crucially, this event only fires when `useDirector()`'s React
snapshot changes, which happens once per discrete world mutation (e.g. once
per ~220ms walk step via `StepWalkExecutor`), not once per Phaser-rendered
frame — see the updated world-anchoring Decision below for why this matters.

`Overlay.tsx` already exists and already implements the "DOM layer above the
canvas" pattern this phase wants: a `<div className="absolute inset-0
pointer-events-none z-10 ...">` holding the checkpoint counter, PLAYING
indicator, and back/pause/next/skip/expand/fullscreen buttons (the last group
opted back into `pointer-events-auto`). It is a complete, working component
with a narrower job (presenter chrome) than this phase's dialogue/menu/card
content — not an empty stub to expand. This phase adds new sibling
components (dialogue box, menu shell, text card) mounted alongside it in
`RpgExperience.tsx`'s `Experience`, reusing the same z-10/pointer-events
layering convention `Overlay.tsx` already established, and reading
`useDirector()` directly for their content — exactly how `Overlay.tsx` already
reads `director.checkpointIndex`/`director.status`, with no Phaser event
plumbing needed for anything that isn't world-anchored.

Phase 1 already added a `dialogue: { open: boolean; text: string }` field to
`World`/`RestingState`, populated by the already-shipped
`startDialogue`/`say`/`endDialogue` executors (currently a no-op visually,
since nothing renders it yet). This phase's `ui`/`overlay` resting-state
fields are not a green field alongside it — the `ui` slot below **replaces**
`dialogue`, migrating `open`/`text` into its `kind: 'dialogue'` variant. This
change builds the overlay layer itself — dialogue boxes, the command/status
menu shell, and full-screen text cards — against the real architecture above,
not `architecture.md`'s stale sketch, and adds the resting-state schema
fields (`requirements.md` §5's "Active UI" and "Overlays") those features
need. `idea-board.md` §11 already locks the overlay approach ("DOM text
overlay on top of Phaser for readability") and the Zoom-re-encode legibility
target, so this design treats both as settled, not open decisions.

## Goals / Non-Goals

**Goals:**
- A DOM overlay component tree, positioned above the Phaser canvas, that
  renders dialogue/menu/card *content* purely from `resting-state.ui` /
  `resting-state.overlay` — no independent state, no polling, no imperative
  DOM writes outside React's render cycle for content. (World-anchored
  *positioning* is the one deliberate exception to this — see below and the
  corresponding Decision — since it must track Phaser's camera at
  animation-frame rate, faster than resting-state changes.)
- World-anchored positioning: an overlay element can track a world-space
  entity's projected screen position every frame the camera moves, without
  the canvas and DOM elements ever visibly decoupling.
- Real rendering for `startDialogue`/`say`/`endDialogue`/`thought` (dialogue
  box + thought-bubble variant) and for the newly-established `showMenu`/
  `selectMenuOption`/`hideMenu` and `showOverlay`/`hideOverlay` actions.
- A command/status menu shell that can show a command window or a status/
  inspection screen, move a selection highlight, and depict a choice being
  "made" — entirely on rails (no real input handling, no real stat content).
- Finalize and promote `showOverlay`, `hideOverlay`, `showMenu`,
  `selectMenuOption`, `hideMenu` from Proposed to Established in
  `action-vocabulary.md`.
- A legibility validation pass against an actual Zoom re-encode (recording
  or second viewer) of dialogue boxes, menus, and text cards.

**Non-Goals:**
- No battle scene, no battle command menu wiring (Phase 4 reuses this
  phase's menu shell, but doesn't exist yet).
- No real stat/status content in the status screen — it renders and
  dismisses on cue with placeholder/stub fields only (Phase 6).
- No real menu-selection input handling — `selectMenuOption` moves a
  highlight to an authored index; there is no keyboard/mouse selection
  logic to depict, per `requirements.md` §4C.
- No meters, light radius, achievement toasts, or final art.
- No change to `talk-director`'s precompute/snapTo contract itself — this
  change only adds new resting-state *fields* and new action executors that
  populate them, following the same pattern Phase 2 used for camera/entity
  fields.

## Decisions

**New DOM content reads `useDirector()` directly; no separate overlay event
channel.** The new dialogue-box/menu/card components call `useDirector()`
(the existing hook from `Director.tsx`) and render their `ui`/`overlay`
fields straight off `resting`, exactly like `Overlay.tsx` already does for
`checkpointIndex`/`status`. Live playback (the new `startDialogue`/`say`/
`showMenu`/etc. executors in `executors.ts`) calls the same `setWorld`/`emit`
path every other executor uses, so React re-renders on each change — no
distinct "live" vs. "snapped" signal to plumb. *Alternative considered:* have
`TalkRpgScene` own dialogue/menu state and push it to the DOM layer via the
`director-snapshot` Phaser event (mirroring how the canvas gets its data).
Rejected — that event exists so Phaser can react to state it can't get any
other way; a plain React component already has `useDirector()` in scope, so
routing UI content through Phaser's event emitter first would be a strictly
longer path to the same data and would create exactly the two-sources-of-
truth risk `requirements.md` §3 warns against for resting-state
reconstruction under `snapTo`.

**World-anchored positioning via a per-frame screen-projection hook reading
Phaser directly, not React resting-state.** `resting.camera`/`resting.entities`
only update once per discrete world mutation (e.g. once per ~220ms step of a
`walk`, via `DirectorEngine.setWorld`/`emit`) — not once per rendered Phaser
frame. Phaser's own camera `startFollow` smooths continuously between those
steps entirely inside its own ticker, invisible to React. If
`useWorldAnchor(entityId)` computed its CSS transform only from
`useDirector()`'s `resting` prop, an anchored bubble would visibly jump in
~220ms increments instead of tracking the camera's smooth pan — a legibility
regression this phase's own Zoom pass would catch, but better designed out
now. Instead, `useWorldAnchor` reads the camera/entity transform directly
from Phaser at animation-frame rate: expose a `getScreenPosition(entityId):
{x,y}|null` function on the game registry (alongside the existing
`getSnapshot` entry `PhaserStage` already sets up), backed by
`cameras.main.getWorldPoint`/the entity's `EntityView.container` position,
and have `useWorldAnchor` poll it via `requestAnimationFrame` and write the
result as an imperative `style.transform` mutation (see the frame-budget risk
below — never `setState` per frame). Tile-to-pixel conversion
(`x * TILE_SIZE`, `TILE_SIZE = 48` from `EntityView.ts`) and the canvas's
actual on-screen size both live inside Phaser already, which is the other
reason to read through it rather than reimplementing that math against
`resting.camera`'s tile-space values in React. *Alternative considered:*
attach a `Phaser.GameObjects.DOMElement` inside the Phaser scene itself.
Rejected — `requirements.md` §3 requires all readable text to be a "crisp DOM
overlay, not in-canvas bitmap font," and Phaser's `DOMElement` is still
parented inside the canvas's coordinate/clipping context, which reintroduces
exactly the codec/legibility risk the DOM-overlay principle exists to avoid;
a plain top-level `<div>` with a computed transform keeps overlay text fully
independent of canvas rendering.

**Dialogue/thought box and menu shell as one `ActiveUI` resting-state slot,
not independent flags — replacing the existing `dialogue` field, not adding
alongside it.** `resting-state.ui` holds a single tagged union — `{ kind:
'none' } | { kind: 'dialogue'; speaker; text; variant: 'say' | 'thought' } |
{ kind: 'menu'; menuKind: 'command' | 'status'; options; selectedIndex }` —
matching `requirements.md` §5's "which dialogue box / menu / status screen is
visible" description of a single active-UI concept, not several
independently-toggleable pieces. This slot **replaces** the `dialogue: {
open: boolean; text: string }` field Phase 1 already added to
`World`/`RestingState`: `open: true` with no text maps to `kind: 'dialogue'`
with an empty `text` (matching `startDialogue`'s current no-line-yet
behavior), and `open: false` maps to `kind: 'none'`. `startDialogue`/
`endDialogue` and `showMenu`/`hideMenu` all set or clear this one slot; every
existing call site that reads or writes `.dialogue` (`precompute.ts`,
`executors.ts`'s `InstantExecutor`) is updated to the new field in this
change, not left in place beside it. *Alternative considered:* separate
`dialogue: DialogueState | null` and `menu: MenuState | null` fields that
could theoretically both be non-null at once. Rejected — nothing in the
framework ever shows a dialogue box and a menu simultaneously, and a single
slot makes that invariant structural (a type union) instead of something
every executor has to remember to enforce by hand.

**Full-screen/overlaid text cards are a separate `overlay` resting-state
slot from `ui`.** `showOverlay`/`hideOverlay` set/clear
`resting-state.overlay: { kind: 'act-card' | 'headline' | 'title'; text } |
null`, independent of the dialogue/menu `ui` slot, matching §5's schema
listing "Active UI" and "Overlays" as two distinct resting-state fields. This
lets a future beat show, e.g., a headline card while a status screen from a
prior beat is still notionally "open" underneath, without one clearing the
other — though no Phase 3 content actually exercises that combination.

**Menu selection highlight animates as a discrete step, not a continuous
tween.** `selectMenuOption` moves the highlight to its target option
instantly (or with a single short, fixed-duration transition), rather than a
continuous sliding animation whose duration scales with distance moved.
*Alternative considered:* a smooth cursor-slide animation proportional to
how many options it moves past. Rejected — `idea-board.md` §11's "restrain
motion" lock calls out "constantly-animating" elements as exactly what the
Zoom codec smears; a fixed-duration discrete step reads clearly at any
distance and keeps the highlight's resting position trivially reconstructible
by `snapTo` (no in-flight animation state to reconstruct).

**Visual style for the command window follows the existing "authentic,
blue-bordered" direction; status/dialogue box styles are new and unlocked.**
`idea-board.md` §9 already locks the command window's look. Dialogue box and
status screen visual styling are not addressed there — this change treats
them as implementation detail (Tailwind classes, not a framework capability)
consistent with the same "bold shapes, high contrast, large text" legibility
principle, rather than blocking on a narrative decision.

## Risks / Trade-offs

- **[Risk]** Phase 2 has now landed, so this is no longer a build-order risk,
  but the resting-state shape it shipped isn't purely additive: `ui` *replaces*
  the `dialogue` field Phase 1 already added, and `camera`/entity positions
  are in tile units, not pixels → **Mitigation:** the field migration is now
  fully scoped (see the `ActiveUI` decision above and `proposal.md`'s Impact
  section), and the tile-unit camera is handled by reading through Phaser
  (see the world-anchoring decision and the next risk) rather than
  reimplementing tile math in React.
- **[Risk]** A `useWorldAnchor` hook needs Phaser's camera/entity transform at
  animation-frame rate, but nothing today exposes that to React —
  `useDirector()`'s `resting` only updates once per discrete world mutation
  (~every 220ms during a walk), and `TalkRpgScene`'s only current registry
  export is `getSnapshot` (read once at scene boot), not a live
  per-frame query → **Mitigation:** add a `getScreenPosition(entityId)`
  registry function (same pattern as `getSnapshot`) that `useWorldAnchor`
  polls via `requestAnimationFrame`, writing only a `transform` style
  directly (no React re-render per frame — use a ref and imperative style
  mutation, not `setState`), keeping the per-frame cost to a single DOM style
  write per anchored element; profile against the Phase 2 placeholder map's
  entity count before this change is considered done.
- **[Risk]** `client-talks`' Phaser game is configured at a fixed
  `GAME_WIDTH`/`GAME_HEIGHT` (960×540 in `RpgExperience.tsx`) with no Phaser
  `Scale` manager mode set, so how the canvas's actual on-screen pixel size
  relates to its container (`w-full h-full`, or `position: fixed; inset: 0`
  when expanded) is currently undefined — and locking "fixed internal
  resolution + integer scaling" is explicitly `phased-implementation.md`
  Phase 9's job, not this phase's. A world-anchored DOM element positioned
  from `getScreenPosition`'s canvas-space coordinates will be wrong if the
  canvas is stretched by CSS without Phaser knowing about it → **Mitigation:**
  for this phase, assume the canvas renders 1:1 at its configured resolution
  and size the DOM overlay container to match the canvas's actual rendered
  `getBoundingClientRect()` (not the whole page) rather than assuming they're
  identical; revisit if Phase 9 introduces a `Scale` mode that changes this.
- **[Risk]** Discrete-step menu highlight motion might read as "broken"
  rather than "intentionally restrained" to a first-time viewer →
  **Mitigation:** accepted trade-off in service of the Zoom-legibility lock;
  validate specifically during this phase's legibility pass rather than
  guessing, and add a brief highlight-color flash on arrival if plain
  teleporting reads poorly.
- **[Risk]** The general "rapid transitions may mush over Zoom" flag in
  `idea-board.md` §9/§11 is still an open `[FORK/VERIFY]` — it's framed
  around the Phase 4 encounter flash, but any Phase 3 overlay entrance/exit
  animation (dialogue box popping in, text card fading) could hit the same
  issue → **Mitigation:** this phase's own legibility pass explicitly
  includes overlay transitions, not just static text, so a mushing problem
  surfaces here rather than being assumed away; if found, soften to a
  simpler cut/discrete-step transition, matching the "restrained motion"
  principle already locked.

## Testing

- Unit tests for the `RestingState.ui`/`overlay` reducer transitions:
  `startDialogue`→`say`→`endDialogue` clears to `{ kind: 'none' }`;
  `showMenu`→`selectMenuOption`→`hideMenu` likewise; `showOverlay`/
  `hideOverlay` independent of the `ui` slot.
- Headless precompute tests: a script exercising every new action asserts
  the cached resting state at each `stop` has the expected `ui`/`overlay`
  shape — no DOM/browser needed, consistent with `precompute.ts`'s existing
  no-Phaser-dependency design.
- Manual verification in-browser (Playwright screenshot, per `CLAUDE.md`'s
  convention) that a world-anchored dialogue bubble stays glued to its
  entity through a camera pan, and that `back()`/`skipTo()` land the
  dialogue/menu/overlay slots at the correct value with no stale content
  from a prior checkpoint.
- The legibility pass itself: record or second-viewer-check a Zoom share of
  the dialogue box, command menu, status screen, and a text card; confirm
  text remains crisp and the menu highlight's motion doesn't smear.

## Open Questions

Both prior open questions are resolved below (accepting the default/
lower-risk option in each case, per neither being a design blocker); revisit
during implementation or the legibility pass if either reads poorly.

- **Resolved:** the status screen shows literal placeholder text (e.g. "HP:
  --", "Level: --") for its stub fields rather than omitting them. Reasoning:
  a visibly-placeholder field reads clearly as "not implemented yet" during
  the legibility pass and rehearsal, whereas an empty/missing row could be
  mistaken for a layout bug; Phase 6 replaces the placeholder strings with
  real values without changing the screen's structure.
- **Resolved:** the menu-highlight discrete-step transition uses a **150ms**
  fixed duration — long enough to read as an intentional, visible step
  (not a teleport) but short enough to stay clearly discrete rather than a
  perceptible slide, matching `idea-board.md` §11's "restrain motion" lock.
  Tune during the legibility pass if it reads as too fast/slow over Zoom.
