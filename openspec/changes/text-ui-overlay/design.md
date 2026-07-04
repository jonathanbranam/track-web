## Context

Phase 2 (`world-rendering-integration`, not yet archived) wires the Director
into a real Phaser scene but is explicitly scoped to no DOM overlay at all —
placeholder/console-level text only. `architecture.md`'s intended render
stack already describes the target shape for this phase: `ExperienceRoot`
layers a Phaser `<canvas>` (z-index 0) under a React DOM overlay (z-index 10,
`pointer-events: none` except the toolbar), and the overlay is driven by
reading the Director's *current resting state*'s `ui`/`overlay` fields
directly — not a separate event-based sync channel. `TalkRpgScene` emits
`'snap'` (instant `applyRestingState`) and `'play-action'` (real per-action
executors that emit `'action-complete'`); the overlay only ever reacts to
resting-state changes, the same signal the canvas renders from, so the two
layers can't drift out of sync with each other. This change builds the
overlay layer itself — dialogue boxes, the command/status menu shell, and
full-screen text cards — against that existing architecture, and adds the
resting-state schema fields (`requirements.md` §5's "Active UI" and
"Overlays") those features need. `idea-board.md` §11 already locks the
overlay approach ("DOM text overlay on top of Phaser for readability") and
the Zoom-re-encode legibility target, so this design treats both as settled,
not open decisions.

## Goals / Non-Goals

**Goals:**
- A DOM overlay component tree, positioned above the Phaser canvas, that
  renders purely from `resting-state.ui` / `resting-state.overlay` — no
  independent state, no polling, no imperative DOM writes outside React's
  render cycle.
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

**Overlay reads resting state directly; no separate overlay event channel.**
`Overlay.tsx` takes the Director's current `RestingState` as a prop (or
context value) and renders `ui`/`overlay` fields straight from it, exactly
like `TalkRpgScene`'s `applyRestingState` does for the canvas. Live playback
(`'play-action'` executors for `say`/`showMenu`/etc.) updates the *live*
in-progress resting-state-in-flight, which both the overlay and the canvas
re-render from on each change. *Alternative considered:* have the Phaser
scene own dialogue/menu state and push it to the overlay via a dedicated
`game.events` channel (mirroring how `'snap'`/`'play-action'` already work
for canvas-only concerns). Rejected — `architecture.md`'s existing pattern
already routes canvas sync through resting state, not through ad hoc events,
and introducing a second synchronization path for UI state creates exactly
the two-sources-of-truth risk `requirements.md` §3 warns against for
resting-state reconstruction under `snapTo`.

**World-anchored positioning via a per-frame screen-projection hook, not
DOM-in-Phaser.** A `useWorldAnchor(entityId)` hook reads the entity's current
world position and the camera's position/zoom (both already present in
resting state) and computes a CSS `transform: translate(...)` for the
anchored DOM element, recomputed on Phaser's render tick. *Alternative
considered:* attach a `Phaser.GameObjects.DOMElement` inside the Phaser scene
itself. Rejected — `requirements.md` §3 requires all readable text to be a
"crisp DOM overlay, not in-canvas bitmap font," and Phaser's `DOMElement` is
still parented inside the canvas's coordinate/clipping context, which
reintroduces exactly the codec/legibility risk the DOM-overlay principle
exists to avoid; a plain top-level `<div>` with a computed transform keeps
overlay text fully independent of canvas rendering.

**Dialogue/thought box and menu shell as one `ActiveUI` resting-state slot,
not independent flags.** `resting-state.ui` holds a single tagged union —
`{ kind: 'none' } | { kind: 'dialogue'; speaker; text; variant: 'say' |
'thought' } | { kind: 'menu'; menuKind: 'command' | 'status'; options;
selectedIndex }` — matching `requirements.md` §5's "which dialogue box /
menu / status screen is visible" description of a single active-UI concept,
not several independently-toggleable pieces. `startDialogue`/`endDialogue`
and `showMenu`/`hideMenu` all set or clear this one slot. *Alternative
considered:* separate `dialogue: DialogueState | null` and
`menu: MenuState | null` fields that could theoretically both be non-null at
once. Rejected — nothing in the framework ever shows a dialogue box and a
menu simultaneously, and a single slot makes that invariant structural
(a type union) instead of something every executor has to remember to
enforce by hand.

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

- **[Risk]** Building against Phase 2's `world-rendering` resting-state
  shape (camera, entity fields) before that change is implemented/archived
  → **Mitigation:** this change only *adds* new resting-state fields
  (`ui`, `overlay`) alongside Phase 2's; it doesn't read or depend on the
  exact shape of Phase 2's own fields, so reconciliation risk is limited to
  import paths and the shared `RestingState` type location, per the same
  pattern `world-rendering-integration`'s design already accepted for its
  own dependency on Phase 1.
- **[Risk]** A `useWorldAnchor` hook recomputing a CSS transform every
  Phaser render tick could introduce a React/Phaser render-loop coupling
  that costs frame budget Zoom's encoder also needs (`requirements.md` §3,
  "live-performance robustness") → **Mitigation:** the hook only writes a
  `transform` style directly (no React re-render per frame — use a ref and
  imperative style mutation, not `setState`), keeping the per-frame cost to
  a single DOM style write per anchored element; profile against the
  Phase 2 placeholder map's entity count before this change is considered
  done.
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

- Whether the status screen's placeholder/stub fields (before Phase 6 adds
  real stats) should show literal placeholder text (e.g. "HP: --") or be
  omitted entirely until real content exists — left to `tasks.md`/
  implementation; doesn't affect the resting-state schema either way.
- Exact fixed duration for the menu-highlight discrete-step transition (e.g.
  100ms vs. 150ms) — a tuning detail to settle during the legibility pass,
  not a design blocker.
