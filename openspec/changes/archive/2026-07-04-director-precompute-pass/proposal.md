## Why

The "engineering-with-ai" talk (`docs/talks/ai-eng/`) must run as a scripted,
reversible playback — the presenter clicks forward, jumps back, or skips to
any point, and the display is always pixel-correct. `requirements.md` (§3, §5)
specifies this must work by authoring a flat list of **actions** against a
fixed map, then computing every resting state via a **deterministic,
headless precompute pass** — never by hand-writing per-step snapshots or
tweening between them. The scaffold currently shipped in `client-talks/`
(from the archived `2026-07-01-add-engineering-with-ai-talk-game` change)
predates this model: it's a forward-only Beat/Director with no precompute
pass, no cached resting states, and no back/pause/skip (`architecture.md`,
"Note" callout). Nothing else in the talk framework can be built until this
spine exists, since every later phase (world rendering, UI overlay, battle,
...) depends on the action-list/resting-state contract this change
establishes (`requirements.md` §8).

## What Changes

- **BREAKING**: Replace the existing forward-only `Beat`/Director model in
  `client-talks/src/talk-rpg/` with the action-list + precompute-pass Director
  described in `requirements.md` §5 and `architecture.md`. The 2-beat
  scaffold (title screen + name-entry stub) is superseded.
- Add an initial **action vocabulary**: `walk` (literal relative path only —
  no `walkTo`/pathfinding yet), `pause`, `stop`, `startDialogue`, `say`,
  `endDialogue` — enough to exercise both movement and non-movement actions,
  per `action-vocabulary.md`'s "Established actions" list.
- Add the **deterministic precompute pass**: run the full action list once,
  headlessly (no real timers, no animation-frame waiting), and cache a full
  resting-state snapshot at every `stop`.
- Add **`snapTo(i)`**: apply a cached resting state explicitly and instantly,
  with nothing inherited from whatever was previously displayed.
- Add **presenter controls**: `next()` (live playback of the next segment,
  chaining action-to-action on real completion), `back()` (instant re-apply
  of the previous cached checkpoint, no replay), `pause()`/`resume()` (halt
  and resume whichever action is mid-flight), and `skipTo(i)`/
  `skipToSection(id)` (jump to any checkpoint, forward or backward, any
  distance).
- Prove all of the above against a tiny **placeholder map** with placeholder
  rectangle "entities" — no tilemap, no sprites, no Phaser rendering
  integration (that's Phase 2).

## Capabilities

### New Capabilities

- `talk-director`: The core playback engine — the action-list authoring
  model, the deterministic headless precompute pass, the cached resting-state
  array, `snapTo`, and the presenter controls (`next`/`back`/`pause`/`resume`/
  `skipTo`/`skipToSection`) that operate on it. Proven against placeholder
  rectangle entities on a tiny fixed map; no real rendering engine.

### Modified Capabilities

- `talk-rpg-experience`: The existing spec (from the archived
  `2026-07-01-add-engineering-with-ai-talk-game` change) describes the
  forward-only Beat model currently shipped in `client-talks/`. This change
  replaces that playback model wholesale with `talk-director`'s action-list/
  precompute-pass contract — the delta spec removes the forward-only
  Beat/Director requirements and points remaining experience-level behavior
  (e.g. that `client-talks` hosts this playback) at the new capability.

## Impact

- **Code**: `client-talks/src/talk-rpg/` — `Director.tsx`/reducer,
  `script.ts` (Action authoring format, renamed from the old `steps.ts`
  concept), a new `precompute.ts` (headless simulation, no Phaser
  dependency). No Phaser/rendering code changes in this phase — placeholder
  entities can be plain React/DOM or a trivial canvas stand-in, per Phase 1's
  non-goals in `phased-implementation.md`.
- **Removed**: The existing 2-beat forward-only scaffold (title screen +
  name-entry stub) and its `Beat` type are superseded; any tests or pages
  wired to the old model need updating.
- **No API/DB impact**: this is entirely client-side presentation state for
  a single internal-use talk app; no backend routes, schema, or auth
  changes.
- **Dependents**: every later phase (Phase 2 world rendering onward) builds
  directly on the `talk-director` action/resting-state contract established
  here — this is deliberately the first and highest-risk phase
  (`phased-implementation.md`, "Why this ordering").
