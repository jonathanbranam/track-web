## Context

`client-talks/src/talk-rpg/` currently ships a 2-beat, forward-only scaffold:
`Director.tsx` is a React context + reducer tracking `{ currentBeat, status:
'waiting' | 'playing' }`, `script.ts` exports a flat `BEATS: Beat[]` array,
and `TalkRpgScene.ts` plays each beat as a hardcoded Phaser primitive
sequence, emitting `segment-complete` back to the Director. There is no
concept of a resting-state snapshot, no `back()`, no `pause()`, and no skip —
`advance()` only ever moves forward one beat, driven entirely through Phaser
scene/event coupling (`architecture.md`, "Note" callout;
`phased-implementation.md` Phase 1).

This change replaces that model with the action-list + deterministic
precompute-pass Director from `requirements.md` §3/§5 and `architecture.md`
("Director" section), scoped to Phase 1's placeholder-only proving ground:
no Phaser, no tilemap, no real sprites (those are explicitly Phase 1
non-goals — see `phased-implementation.md`). Every later phase depends on
getting this contract right, so the design favors correctness and a clean
seam for Phase 2 to build on, over minimizing this phase's own surface area.

## Goals / Non-Goals

**Goals:**
- A framework-agnostic `Director` (no Phaser dependency) owning: the
  authored `Action[]` script, the headless precompute pass, the cached
  `RestingState[]` checkpoint array, and `snapTo`/`next`/`back`/`pause`/
  `resume`/`skipTo`.
- An action vocabulary limited to Phase 1's stated scope: `walk` (literal
  relative path only), `pause`, `stop`, `startDialogue`, `say`,
  `endDialogue` — enough to exercise both movement and non-movement
  actions, per `action-vocabulary.md`.
- A minimal placeholder renderer (plain React/DOM rectangles) that reads the
  Director's current resting state and displays it — proving the contract
  visually without pulling in Phaser.
- Byte-for-byte deterministic precompute: running the same action list twice
  produces identical checkpoints.
- Unit test coverage for precompute determinism, `snapTo` correctness,
  `back`/`skipTo` at arbitrary distance, and `pause`/`resume` mid-action.

**Non-Goals:**
- No Phaser, tilemap, sprites, animation, or camera integration — that is
  Phase 2 (`phased-implementation.md`). The existing `PhaserGame.tsx`/
  `TalkRpgScene.ts` Phaser wiring is out of scope for this change.
- No `walkTo`/A* pathfinding — literal `walk` paths only.
- No DOM overlay styling, dialogue box UI, or menus — `startDialogue`/`say`/
  `endDialogue` exist in the vocabulary and resting-state schema but render
  as plain placeholder text, not real UI (Phase 3).
- No battle, meters, light radius, party, or meta-shell actions.
- No hand-authored resting states, ever — see `requirements.md` §5 non-goal.

## Decisions

**Shared action-semantics module, used by both precompute and live play.**
A single `applyAction(world, action, map)` function computes an action's
*final* effect on the world model (e.g. `walk`'s final entity position after
all relative steps). The headless precompute pass (`precompute.ts`) calls it
directly and clones the result at every `stop`. Live playback (`next()`)
calls the same function to know *where it's headed*, then animates toward
that identical final state in real time (stepwise position updates on a
timer, not a Phaser tween — Phase 1 has no Phaser). This guarantees forward
play and `snapTo` can never diverge, because both are ultimately anchored to
the same computed final state — the risk `architecture.md` calls out
("nothing generically interpolates two snapshots") is structurally
prevented rather than tested-for.
*Alternative considered:* let live playback and precompute each implement
`walk` independently (e.g. precompute computes final position by formula,
live play just moves and trusts it lands right). Rejected — two independent
implementations of the same action are exactly the drift risk the
precompute pass exists to eliminate; a future edit to one without the other
would silently desync `back`/`skip` from forward play.

**Executor abstraction for pause/resume, generalized now for Phase 2.**
Each in-flight action exposes `{ start(onComplete), pause(), resume() }`.
`walk` and `pause` use `setTimeout`/`requestAnimationFrame`-based executors
in this phase; `startDialogue`/`say`/`endDialogue` complete instantly (no
real reveal animation yet — that's Phase 3). The Director only ever calls
`pause()`/`resume()` on "whatever's currently executing," never
action-type-specific logic. This mirrors `architecture.md`'s note that a
Phaser tween is "an implementation detail of the walk executor, not a
framework-level concept" — Phase 2 can swap the `walk` executor's internals
for a Phaser tween without changing the Director's control flow.
*Alternative considered:* a single global "pause" that just stops a shared
clock. Rejected — some later action types (e.g. a multi-part battle
sequence) won't be a single timer, so the per-executor interface is adopted
now while the vocabulary is small and cheap to get right.

**Resting-state schema is a strict subset of `requirements.md` §5's full
schema, not a Phase-1-specific shape.** The `RestingState` type only
includes the fields Phase 1 actually populates (active scene id, entity
positions/facing, dialogue UI open/closed + text, section index) but is
structured so later phases add fields (camera, meters, light radius, battle
state, achievement) without changing the shape of what's already there or
touching `snapTo`'s contract.
*Alternative considered:* stub out every eventual field (camera, meters,
etc.) now with placeholder/null values. Rejected — adds speculative surface
this phase can't test and violates the "don't design for hypothetical future
requirements" norm; growing the type field-by-field as each phase lands is
simpler to review.

**Placeholder rendering is plain React/DOM, not a trivial Phaser scene.**
Given Phase 1's explicit non-goal of no Phaser, the placeholder "entities"
render as absolutely-positioned `<div>`s inside `RpgExperience.tsx`, styled
as colored rectangles, reading straight from the Director's current
`RestingState`. This also means `PhaserGame.tsx` and `TalkRpgScene.ts` are
not wired into this phase at all — see Migration Plan.
*Alternative considered:* keep a minimal Phaser scene rendering rectangles
(closer to `architecture.md`'s eventual render stack). Rejected for this
phase specifically because `phased-implementation.md` calls out Phaser
integration as Phase 2's job, and pulling it in early would blur the
Phase 1/2 boundary the phased plan deliberately drew to de-risk the Director
before touching rendering at all.

**Checkpoints are addressed by integer index only; named sections are
deferred.** `requirements.md` §4A describes `skipToSection(id)` alongside
`skipTo(i)`, but Phase 1's tiny placeholder script has no need for named
sections yet. `skipTo(i)` is implemented now; `skipToSection` is left as a
thin wrapper added once content actually needs named jump targets (Phase 2+
or whenever the script grows enough to want them).

## Risks / Trade-offs

- **[Risk]** A future action type's headless `applyAction` and live executor
  implementation drift apart (e.g. someone tweaks the live `walk` executor's
  step logic without updating the shared final-position formula it's
  supposed to call). → **Mitigation**: enforced structurally — the live
  executor's target state comes *from* calling the same `applyAction` used
  by precompute, not a hand-rolled parallel calculation; a unit test asserts
  `snapTo` after a full `next()` chain equals the precomputed checkpoint for
  every `stop` in the placeholder script.
- **[Risk]** The executor abstraction (`start`/`pause`/`resume`) is designed
  under Phase 1's simple timer-based actions and turns out not to fit a
  Phase 2 Phaser-tween-driven `walk`, forcing a rework. → **Mitigation**:
  the interface is intentionally minimal (three methods, no assumptions
  about *how* an action completes) and already modeled on the
  Phaser-tween-pause pattern described in `architecture.md`, so the risk is
  low; if Phase 2 still needs to adjust it, only the `walk` executor's
  internals change, not the Director.
- **[Risk]** Building a placeholder-only renderer now (plain DOM rectangles)
  is throwaway work that gets deleted in Phase 2 anyway. → **Mitigation**:
  accepted trade-off — `phased-implementation.md` explicitly sequences
  Phase 1 as placeholder-only to de-risk the Director in isolation before
  any rendering-engine integration; the renderer here is deliberately thin
  (a `<div>` per entity) so the "throwaway" cost is small.

## Migration Plan

- Remove the existing forward-only scaffold: `Beat`/`BEATS` in `script.ts`,
  the `DirectorState { currentBeat, status }` reducer in `Director.tsx`, and
  the Phaser-coupled `TalkRpgScene.ts` beat-playing logic. `PhaserGame.tsx`
  and the Phaser wiring in `RpgExperience.tsx` are removed from this phase's
  code path (not deleted from the repo — Phase 2 reintroduces and rewires
  them against the new Director contract; keeping the file around avoids
  needing to recreate the `client-games`-derived `PhaserGame.tsx` copy from
  scratch).
- Rewrite `script.ts` to export the new `Action[]` authoring format (per
  `action-vocabulary.md`'s established actions, restricted to this phase's
  vocabulary) and a tiny placeholder map (a handful of named entities with
  initial grid positions — no tile grid, no Tiled JSON).
- Add `precompute.ts` (headless `applyAction`/`runPrecompute`, no Phaser
  import) and rewrite `Director.tsx` around the checkpoint array + presenter
  controls described above.
- Rewrite `RpgExperience.tsx` to render placeholder `<div>` entities from the
  Director's current resting state instead of hosting `PhaserGame`.
- `TalkPage.tsx`/`talks.ts` wiring (which app page renders `RpgExperience`)
  is unaffected — no route or `Talk` interface changes in this phase.
- No database, API, or backend changes — this is client-only presentation
  state; no rollback plan is needed beyond reverting the commit, since
  nothing is persisted.
- No feature flag or staged rollout — `client-talks` is a single internal
  presentation tool with no external users; validate by running the
  placeholder script end-to-end (next/back/pause/skip) locally before
  merging.

## Open Questions

- Exact `Executor` interface signature (e.g. whether `start` takes the
  target world-state slice as a parameter or closes over it) — left to
  `tasks.md`/implementation, not a design blocker.
- Whether `pause`'s "seconds" duration should be real wall-clock time in
  Phase 1 or already support a presenter-facing "speed up during rehearsal"
  toggle — deferred; not requested by any Phase 1 goal, easy to add later
  since it's isolated to the `pause` executor.
