## 1. Action & precompute core

- [ ] 1.1 Replace `Beat`/`BEATS` in `client-talks/src/talk-rpg/script.ts` with an `Action` union limited to `walk` (literal `RelativeStep[]` path), `pause`, `stop`, `startDialogue`, `say`, `endDialogue`, plus a small placeholder map/world model (a handful of named entities with initial grid positions — no tile grid, no pathfinding)
- [ ] 1.2 Implement a shared `applyAction(world, action, map)` function that computes an action's final effect on the world model; this is the single source of truth both the precompute pass and live playback call into
- [ ] 1.3 Define the Phase 1 `RestingState` type (active scene id, entity position/facing, dialogue UI open/closed + text, section index) — structured so later phases can add fields without reshaping what's already there
- [ ] 1.4 Implement `precompute.ts`: `runPrecompute(actions, map) -> RestingState[]`, running the action list headlessly (no real timers, no animation-frame waiting) via `applyAction`, recording a snapshot at every `stop`; no Phaser import

## 2. Director & presenter controls

- [ ] 2.1 Rewrite `Director.tsx` as a framework-agnostic React context + reducer holding the precomputed checkpoint array, the current checkpoint index, and `RESTING`/`PLAYING` status (no `currentBeat`/`waiting`/`playing` Beat-model state)
- [ ] 2.2 Implement `snapTo(i)`, applying checkpoint `i`'s resting state explicitly and in full
- [ ] 2.3 Implement the executor interface (`start(onComplete)`, `pause()`, `resume()`) plus per-action executors: `walk` (stepwise position updates on a timer, arriving at the same final position `applyAction` computes) and `pause` (countdown timer); `startDialogue`/`say`/`endDialogue` complete instantly this phase
- [ ] 2.4 Implement `next()`: chains action-to-action from the current checkpoint via their executors, on real completion, until the next `stop`
- [ ] 2.5 Implement `back()`: instant `snapTo` of the previous checkpoint, no replay
- [ ] 2.6 Implement `pause()`/`resume()`: delegate to whichever executor is currently in-flight; no-op when at rest
- [ ] 2.7 Implement `skipTo(i)`: instant `snapTo` of any checkpoint index, forward or backward, any distance

## 3. Placeholder rendering & experience wiring

- [ ] 3.1 Stop mounting `PhaserGame`/`TalkRpgScene` from `RpgExperience.tsx` for this phase (leave the files in place, unused, per the design doc's migration plan — Phase 2 reintroduces them)
- [ ] 3.2 Add a placeholder renderer that reads the Director's current resting state and draws one positioned `<div>` rectangle per entity
- [ ] 3.3 Add plain (unstyled) placeholder text rendering for `startDialogue`/`say`/`endDialogue` state — real dialogue UI is Phase 3
- [ ] 3.4 Update input bindings in `RpgExperience.tsx`: `ArrowRight`/`Space`/click → `next()`, `ArrowLeft` → `back()`, `P`/`Escape` (while playing) → toggle `pause()`/`resume()`
- [ ] 3.5 Wire the on-screen control bar (Next / Back / Pause) to the same three functions, without also triggering `next()` on toolbar clicks

## 4. Placeholder script

- [ ] 4.1 Author a small Phase 1 proving script (roughly 10–15 actions, at least 2 `stop` checkpoints) exercising every Phase 1 action type, replacing the old 2-beat title/name-entry script

## 5. Tests

- [ ] 5.1 Add `client-talks/src/**/*.test.ts` to the `include` list in `vitest.config.mts` so this workspace's tests run under `npm run test`
- [ ] 5.2 Unit test: precompute determinism — running the same action list through `runPrecompute` twice produces identical checkpoints
- [ ] 5.3 Unit test: `next()` playback converges — after `next()` reaches a `stop`, the resulting state matches that checkpoint's precomputed resting state exactly
- [ ] 5.4 Unit test: `back()`/`skipTo()` apply the correct resting state at arbitrary distance, both forward and backward
- [ ] 5.5 Unit test: `pause()`/`resume()` mid-`walk` halts movement in place and resumes toward the same final destination

## 6. Verification

- [ ] 6.1 Run `npm run test` and confirm all tests pass, including the new `client-talks` suite
- [ ] 6.2 Run `npm run build:talks` and confirm zero TypeScript errors
- [ ] 6.3 Manually verify in the browser: the placeholder script plays forward on click, pauses mid-action and resumes, jumps back instantly, and skips to any checkpoint — matching Phase 1's milestone in `phased-implementation.md`
