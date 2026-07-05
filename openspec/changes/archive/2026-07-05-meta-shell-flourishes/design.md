## Context

`client-talks/src/talk-rpg/` models everything on screen as a `World`/
`RestingState` pair (`precompute.ts`), cloned uniformly by `cloneWorld`/
`restingStateToWorld`/`snapshotRestingState` and computed by the single
`applyAction` reducer. Live playback (`directorEngine.ts` + `executors.ts`)
calls the same `applyAction` for instant actions and a per-action `Executor`
for anything that animates in real time. `RestingState.overlay` is already
a full-screen/overlaid text-card slot — `OverlayCard { kind: 'act-card' |
'headline' | 'title' | 'defeat'; text: string }` — rendered by `TextCard.tsx`
and cleared by `hideOverlay`. `RestingState.ui` is the single active
dialogue/menu slot; `RestingState.battle`/`meters`/`lightRadius` are the
other independent, additive fields prior phases have added.

This phase adds the cold-open bookend screens and achievement toasts
(`requirements.md` group H). Per `phased-implementation.md`'s Phase 7 scope,
this is intentionally the most additive phase yet: the title screen needs
zero new engine work (it's an existing `'title'` overlay card plus an
existing command menu, already Established since Phase 2/3), and the
save-file screen is structurally identical to the overlay cards already in
place. Achievement toasts are the one piece that doesn't fit an existing
slot, because they must be able to appear *alongside* whatever else is on
screen rather than replacing it.

## Goals / Non-Goals

**Goals:**
- Add a `showSaveFile` action that displays the "completed, high-level prior
  playthrough" summary plus the "enhanced edition available" prompt
  (`idea-board.md` §3's locked cold-open sequence), reusing the existing
  overlay slot and `hideOverlay` action rather than inventing a parallel
  full-screen-card mechanism.
- Add `showAchievement`/`hideAchievement` actions and a new, independent
  `RestingState.achievement` field so a toast can appear without displacing
  the current dialogue, menu, or overlay content.
- Demonstrate the title/start screen using only Established vocabulary
  (`showOverlay` `'title'` + `showMenu` `'command'`) — no new action type.
- Keep both new pieces of state fully reconstructable via `snapTo`/`back`/
  `skipTo`, with no special-casing in `directorEngine.ts`.
- Add unit test coverage in `precompute.test.ts` (per the project's testing
  rule) and a Playwright verification pass, matching the precedent set by
  every prior phase.

**Non-Goals:**
- No new Director, rendering, or battle capability — this phase only adds
  action vocabulary and DOM overlay content consuming Phases 1–6.
- No real "enhanced edition" branching logic — the select is theatrical,
  advanced the same on-rails way every other beat is (`director.next()`),
  not a real fork in the script.
- No achievement queueing/stacking — `idea-board.md` §8 locks "one per
  stage, never peppered," so a single nullable field is sufficient; overlapping
  `showAchievement` calls are an authoring error, not a case this phase
  guards against.
- Final achievement copy — `idea-board.md` §8's draft lines stay `[PARKED]`
  candidates; this phase's demo script uses placeholder/one sample line.
- No final art.

## Decisions

### `showSaveFile` reuses the existing `overlay` slot as a new `OverlayCard` kind, not a parallel field

```ts
export interface OverlayCard {
  kind: 'act-card' | 'headline' | 'title' | 'defeat' | 'save-file'
  text: string
}
```
`showSaveFile`'s `applyAction` handler sets `world.overlay = { kind:
'save-file', text: action.summary }` — exactly the same shape every other
overlay kind already uses. It's cleared by the **existing** `hideOverlay`
action; no new `hideSaveFile` action is introduced. `TextCard.tsx` gains one
more `overlay.kind === 'save-file'` branch alongside its existing kind
checks.

**Alternative considered:** a standalone `RestingState.saveFile` field
(mirroring `lightRadius`'s "nullable value" shape). Rejected — the save-file
screen has no reason to coexist with anything else on screen (it's a
full-screen card during the cold open, structurally identical to the
`'title'` card), so giving it a parallel slot would just be two mutually-
exclusive full-screen-card mechanisms doing the same job. Reusing `overlay`
keeps the "one slot per *kind* of simultaneity constraint" pattern this
codebase already follows (`ui` for dialogue-or-menu, `overlay` for any
single full-screen card, `battle`/`meters`/`lightRadius` each independent
because they truly can coexist).

### `showAchievement`/`hideAchievement` get their own independent `RestingState.achievement` field

```ts
export interface AchievementState {
  text: string
}
// World / RestingState both gain:
achievement: AchievementState | null
```
Unlike the save-file screen, an achievement toast must be able to pop while
a dialogue box, menu, or overlay card is already showing (`idea-board.md`
§8: achievements "punctuate" a stage's failure or turn, which is exactly
when other content is likely on screen). Cloned the same way `lightRadius`
is — a plain nullable value, no per-entry clone helper needed. `hideAchievement`
unconditionally sets it to `null`, matching `hideOverlay`'s unconditional-clear
precedent (not `hideMenu`'s open-check, since there's nothing to preserve).

**Alternative considered:** folding achievements into the `overlay` slot as
yet another `OverlayCard` kind. Rejected for the reason above — `overlay` is
a single slot, and an achievement toast popping over a headline card (or
vice versa) is a real scenario this phase needs to support, not an edge case
to avoid.

### Title/start screen requires no new action — it's `showOverlay('title')` + `showMenu('command')` composed

Per `phased-implementation.md`'s explicit non-goal ("no new engine
primitives"), the title screen is demonstrated purely with vocabulary
Established since Phase 2/3: a `showOverlay` action with `kind: 'title'`
displays the game logo/title text (`TextCard.tsx` already renders this kind
exactly as a full-screen centered title card), and a `showMenu` action with
`menuKind: 'command'` and a single option (e.g. `['Start Game']`) is shown
"being selected on rails" the same way every other on-rails menu selection
in this codebase works. No design decision is needed here beyond confirming
the composition — this phase's only work for the title screen is the demo
script itself.

### Both new actions are `InstantExecutor`-style — no new executor class

`showSaveFile`, `showAchievement`, and `hideAchievement` all complete in one
step with no real-time animation, so they're added to `executors.ts`'s
`InstantAction` union and `createExecutor`'s existing `InstantExecutor`
branch — the same pattern `setMeter`/`addMeter` established in Phase 5. The
achievement toast's fade-in/fade-out is pure CSS/DOM transition with no
resting-state footprint, analogous to `TalkRpgScene`'s encounter flash and
floating damage numbers: a one-shot presentational flourish that never
replays on `snapTo`/`back`/`skipTo`, only ever seen once on live entry.

## Risks / Trade-offs

- **[Risk]** Reusing the `overlay` slot for `showSaveFile` means a script
  that (incorrectly) calls `showSaveFile` while another overlay card is
  already showing will silently replace it, same as any other `showOverlay`
  call today.
  → **Mitigation:** this matches `showOverlay`'s existing semantics exactly
  (`applyAction`'s `showOverlay` case already does a full replace, not a
  merge) — not a new failure mode this phase introduces, just inherited
  behavior.
- **[Trade-off]** Achievement toasts get a dedicated resting-state field for
  a single, simple use rather than being folded into a more general
  "notifications" system. Accepted — per the placeholder-first principle,
  building a generic notification queue now would be speculative; `idea-board.md`
  §8 locks the "one per stage" cadence, so a single nullable field is exactly
  sized to the actual requirement.

## Open Questions

- None blocking. The achievement copy itself remains `[PARKED]` content in
  `idea-board.md` §8 and doesn't need resolving to implement the
  `showAchievement` primitive.
