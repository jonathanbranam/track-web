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

- Add the **DOM overlay layer**: new React components positioned above the
  Phaser canvas (`z-index` above the canvas, `pointer-events: none` except
  explicit interactive controls), kept in sync with the Director's current
  resting state by reading `ui`/`overlay` fields directly via `useDirector()`
  — the same pattern the already-shipped `Overlay.tsx` control bar uses,
  rather than a separate sync mechanism. (`architecture.md`'s original sketch
  imagined one combined `Overlay.tsx` for captions/UI/toolbar; what actually
  shipped in Phase 2 is a control-bar-only `Overlay.tsx`, so this phase's
  content lives in new sibling components, not inside it — see Impact.)
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

- **Code**: `client-talks/src/talk-rpg/` — `Overlay.tsx` already exists and is
  not a stub: Phase 2 shipped it as the fully-working presenter control bar
  (checkpoint counter, PLAYING indicator, back/pause/next/skip/expand/
  fullscreen buttons), already using the `absolute inset-0 pointer-events-none
  z-10` layering this change wants for its own content. This change adds new,
  separate DOM components (dialogue box, menu shell, text card) mounted
  alongside `Overlay.tsx` in `RpgExperience.tsx`'s `Experience`, not by
  rewriting `Overlay.tsx`'s existing control-bar responsibility. It also adds
  new action executors in `executors.ts`/`precompute.ts` for
  `startDialogue`/`say`/`endDialogue`/`thought`/`showMenu`/`selectMenuOption`/
  `hideMenu`/`showOverlay`/`hideOverlay`, and resting-state schema fields for
  active dialogue/menu/overlay content (`requirements.md` §5's "Active UI" and
  "Overlays" resting-state fields) — see the next bullet for why this is a
  field *migration*, not a pure addition.
- **Depends on**: the `world-rendering` capability from
  `world-rendering-integration`, which has since landed in code
  (`client-talks/src/talk-rpg/{TalkRpgScene.ts,EntityView.ts,pathfinding.ts,
  script.ts,executors.ts,precompute.ts}`, all tasks checked as of 2026-07-04)
  though its OpenSpec change isn't archived yet, and transitively on
  `talk-director` from the (also unarchived) `director-precompute-pass`
  change. This change was started before either landed, per explicit user
  direction (out-of-order phase sequencing confirmed 2026-07-04); several of
  this proposal's assumptions are reconciled against the real shipped code in
  this revision:
  - `RestingState` already carries a `dialogue: { open: boolean; text: string
    }` field (added by Phase 1, still populated by the
    `startDialogue`/`say`/`endDialogue` executors). This change's `ui:
    ActiveUI` tagged-union slot **replaces** `dialogue`, it does not add
    alongside it — `open`/`text` migrate into the `kind: 'dialogue'` variant
    (gaining `speaker`/`variant` fields), and every existing reader/writer of
    `World.dialogue`/`RestingState.dialogue` (`precompute.ts`'s
    `applyAction`/`createInitialWorld`/`cloneWorld`/`restingStateToWorld`/
    `snapshotRestingState`, `executors.ts`'s `InstantExecutor`) needs updating
    in this change.
  - `RestingState.camera` is `{ x, y, zoom }` in **tile units**, not screen
    pixels (`TalkRpgScene.snapCamera` converts via `camera.x * TILE_SIZE +
    TILE_SIZE / 2`, `TILE_SIZE = 48` from `EntityView.ts`). World-anchored
    positioning needs a concrete tile-to-CSS-pixel conversion — see design.md's
    updated Decision and Risk on this.
  - There is no `game.events` `'snap'`/`'play-action'`/`'action-complete'`
    trio (that was `architecture.md`'s original sketch, not what shipped).
    `RpgExperience.tsx`'s `PhaserStage` emits one `'director-snapshot'` event
    carrying the full `DirectorSnapshot` into the Phaser game whenever
    `useDirector()`'s snapshot changes, and `TalkRpgScene.applySnapshot` is the
    sole consumer. Plain-React DOM content (dialogue box, menu, card) should
    read `useDirector()` directly, exactly like `Overlay.tsx` already does —
    no Phaser event plumbing needed for non-canvas content.
  - `GameMap`/entity/`RelativeStep`/pathfinding shapes sketched in Phase 2's
    proposal are confirmed as shipped (tile grid, named locations, A*
    `pathfinding.ts`) — nothing further to reconcile there.
- **No API/DB impact**: entirely client-side presentation state for a single
  internal-use talk app; no backend routes, schema, or auth changes.
- **Dependents**: Phase 4 (scripted battle) reuses this change's command-menu
  shell for the battle command window; Phase 6 (party & stats) fills the
  status screen this change scaffolds with real stat content; Phase 7
  (meta-shell) reuses the full-screen text-card mechanism for headline/
  title-card beats.
