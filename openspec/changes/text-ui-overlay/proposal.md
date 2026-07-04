## Why

Everything the audience actually reads during the talk — dialogue, command
menus, status screens, headline cards — has to survive a Zoom re-encode of a
shared browser window, not just look good on the presenter's own screen
(`requirements.md` §3, "Legibility through the Zoom codec"). Phase 2
(`world-rendering-integration`) proves the Director drives a real Phaser
world, but it explicitly has no DOM overlay at all — placeholder/console text
only. Until the DOM overlay layer exists, none of the framework's readable
content (dialogue, menus, headlines) can be authored or validated against the
one constraint that actually matters: legibility after compression. This
change adds that layer, scoped to shape and legibility, with no battle or
real stat content riding on it yet (`phased-implementation.md` Phase 3).

## What Changes

- Add the **DOM overlay layer**: a React layer positioned above the Phaser
  canvas (`z-index` above the canvas, `pointer-events: none` except explicit
  interactive controls), kept in sync with the Director's current resting
  state — the overlay reads `ui`/`overlay` fields directly off resting state,
  per `architecture.md`'s `Overlay.tsx` pattern, rather than a separate sync
  mechanism.
- Add **world-anchored positioning**: an overlay element (speech bubble,
  entity label) can be anchored to a world-space entity and tracks that
  entity's correct on-screen position as the camera moves, scrolls, or pans.
- Add **dialogue boxes & talk bubbles**: real rendering for the `startDialogue`
  / `say` / `endDialogue` / `thought` actions (already in the established
  action vocabulary) — a styled dialogue box with revealed text, and a
  thought-bubble variant, both DOM-rendered per `requirements.md` §4C.
- Add the **RPG command/status menu shell**: `showMenu`/`selectMenuOption`/
  `hideMenu` actions (currently Proposed in `action-vocabulary.md`) rendered
  as command windows and status/inspection screens with a selection
  highlight that can move and a choice that can be "made" — on rails, no real
  selection logic and no real stat content (that's Phase 6). Visual style
  follows the "authentic, blue-bordered command window" direction already
  settled in `idea-board.md` §9.
- Add **full-screen/overlaid text cards**: `showOverlay`/`hideOverlay`
  actions (currently Proposed) for act-card/headline/title-card style
  full-screen or overlaid text.
- Promote `showOverlay`, `hideOverlay`, `showMenu`, `selectMenuOption`,
  `hideMenu` from Proposed to Established in `action-vocabulary.md`, with
  their shapes finalized as part of this change's design.
- Run a **hard legibility pass**: validate dialogue boxes, menus, and text
  cards against an actual Zoom re-encode of the shared window (recording or
  second viewer), not just the local canvas — large type, high contrast,
  restrained motion, per `requirements.md`'s guiding architectural principle
  on legibility.

## Capabilities

### New Capabilities

- `ui-overlay`: The DOM overlay layer itself (React over Phaser, driven by
  Director resting state), world-anchored element positioning, dialogue
  boxes/talk bubbles, the on-rails command/status menu shell, and
  full-screen/overlaid text cards — plus the Zoom-legibility validation this
  layer exists to satisfy.

### Modified Capabilities

- `talk-rpg-experience`: The existing "React DOM overlay for all readable
  text" requirement is generic scaffold-era text (act-card/encounter/
  punchline/dialogue captions with no real dialogue-box, menu, or
  world-anchoring behavior). This change replaces that requirement with one
  pointing at the `ui-overlay` capability's concrete dialogue-box/menu/card
  contract. Requirements unrelated to the overlay (Phaser game host mount/
  unmount, input handling, full-screen/fullscreen toggle) are unaffected and
  carry forward as-is.

## Impact

- **Code**: `client-talks/src/talk-rpg/` — a new `Overlay.tsx` (or expansion
  of the existing stub) for the DOM layer, new action executors in
  `TalkRpgScene.ts` for `startDialogue`/`say`/`endDialogue`/`thought`/
  `showMenu`/`selectMenuOption`/`hideMenu`/`showOverlay`/`hideOverlay`, and
  resting-state schema fields for active dialogue/menu/overlay content
  (`requirements.md` §5's "Active UI" and "Overlays" resting-state fields).
- **Depends on**: the `world-rendering` capability and fixed placeholder map
  from the (not yet archived) `world-rendering-integration` change, and
  transitively on `talk-director` from the (not yet archived)
  `director-precompute-pass` change — this change was started before either
  landed, per explicit user direction (out-of-order phase sequencing
  confirmed 2026-07-04), so integration points with both may need
  reconciling once Phases 1–2 are implemented and archived.
- **No API/DB impact**: entirely client-side presentation state for a single
  internal-use talk app; no backend routes, schema, or auth changes.
- **Dependents**: Phase 4 (scripted battle) reuses this change's command-menu
  shell for the battle command window; Phase 6 (party & stats) fills the
  status screen this change scaffolds with real stat content; Phase 7
  (meta-shell) reuses the full-screen text-card mechanism for headline/
  title-card beats.
