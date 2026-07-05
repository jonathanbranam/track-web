## Why

Phase 6 (`party-and-stats`) rounds out the framework's mechanical/battle
side. The remaining framework-level gap before Phase 8's asset pass is the
presentation "bookend" — the cold open (title → save-file → "enhanced
edition available" → first headline) and achievement toasts —
`phased-implementation.md`'s Phase 7, scoped from `requirements.md` group H.
Unlike prior phases, this one is purely additive: no new Director,
rendering, or battle capability is required, only new action vocabulary and
DOM overlay content consuming what Phases 1–6 already built.

## What Changes

- New `showSaveFile` action (per `action-vocabulary.md`'s "Meta-shell &
  flourishes" section): a framing screen showing a "completed, high-level
  prior playthrough" summary plus an "enhanced edition available" prompt
  that transitions into the main experience — `idea-board.md` §3's
  `[LOCKED]` cold-open sequence.
- New `showAchievement`/`hideAchievement` actions: styled toast
  notifications that pop on scripted beats and dismiss, in `idea-board.md`
  §8's DCC-flavored "Thou Hast…" voice — one per stage, rendered
  independently of the existing dialogue/menu/overlay slots so an
  achievement can appear without displacing whatever else is on screen.
- Title/start screen: composed from **existing** Established primitives (a
  `showOverlay` `'title'` card plus a `showMenu` `'command'` selection,
  shown being selected on rails per Phase 3's shell) — no new action type,
  just a demo script proving the combination end-to-end.
- New `RestingState` fields for the save-file screen and the active
  achievement toast, computed by the existing deterministic precompute pass
  and reconstructed exactly by `snapTo`/`back`/`skipTo` like every other
  piece of resting state.
- A placeholder demo script exercising the full cold open — title screen →
  save-file → enhanced-edition select → first headline → first achievement
  — verified correct under `back`/`skip`, matching the milestone
  `phased-implementation.md` sets for this phase.

## Capabilities

### New Capabilities

- `meta-shell`: the `showSaveFile` and `showAchievement`/`hideAchievement`
  actions, their resting-state fields, and DOM overlay rendering for both —
  covering `requirements.md` group H ("Meta-shell & flourishes") in full.

### Modified Capabilities

None. Following the pattern `scripted-battle` and `meters-and-light-radius`
set: the new actions land under their own new capability rather than
reshaping an existing one. `ui-overlay`'s current requirements aren't
changed — the save-file screen and achievement toast are new, additive
resting-state slots alongside `ui`/`overlay`, not modifications to those
slots, and the title screen is demoed entirely with already-Established
`showOverlay`/`showMenu` vocabulary, so `ui-overlay`'s text doesn't need to
change either.

## Impact

- **Code**: `client-talks/src/talk-rpg/` — new action executors for
  `showSaveFile`/`showAchievement`/`hideAchievement`; `script.ts`'s `Action`
  union grows accordingly; `RestingState` gains a save-file field and an
  active-achievement field per `requirements.md` §5's resting-state field
  list.
- **Rendering**: `ui-overlay`'s DOM layer gains a save-file screen component
  and an achievement-toast component, mounted alongside the existing
  overlay components in `RpgExperience.tsx`.
- **Content**: one placeholder cold-open demo script (title → save-file →
  enhanced-edition select → first headline → first achievement), used to
  verify `back`/`skip` correctness — no final art, no final achievement
  copy (draft lines in `idea-board.md` §8 remain `[PARKED]` candidates).
- **Docs**: `action-vocabulary.md` entries for `showSaveFile`/
  `showAchievement`/`hideAchievement` move from Proposed to Established;
  `phased-implementation.md` Phase 7 gets linked to this change per
  `writing-openspec-proposals.md` §4.
