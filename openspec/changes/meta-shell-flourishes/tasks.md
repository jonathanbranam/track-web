## 1. Overlay schema — save-file kind

- [ ] 1.1 Add `'save-file'` to `OverlayCard.kind`'s union in `precompute.ts` (alongside `'act-card' | 'headline' | 'title' | 'defeat'`) — no new resting-state field, per design.md's "reuse the overlay slot" Decision

## 2. Achievement resting-state schema

- [ ] 2.1 Add `AchievementState { text: string }` to `precompute.ts`; add `achievement: AchievementState | null` to `World`/`RestingState`
- [ ] 2.2 Wire `achievement` (defaulting to `null`) into `createInitialWorld`, `cloneWorld`, `restingStateToWorld`, and `snapshotRestingState` — a plain nullable value, no per-entry clone helper needed (matches `lightRadius`'s pattern)

## 3. Meta-shell action vocabulary

- [ ] 3.1 Add `ShowSaveFileAction { type: 'showSaveFile'; summary: string }` to `script.ts`'s `Action` union and to `applyAction`: sets `world.overlay = { kind: 'save-file', text: action.summary }`
- [ ] 3.2 Add `ShowAchievementAction { type: 'showAchievement'; text: string }` to the `Action` union and to `applyAction`: sets `world.achievement = { text: action.text }`
- [ ] 3.3 Add `HideAchievementAction { type: 'hideAchievement' }` to the `Action` union and to `applyAction`: unconditionally sets `world.achievement = null`
- [ ] 3.4 Wire `showSaveFile`/`showAchievement`/`hideAchievement` into `createExecutor` (`executors.ts`) as `InstantExecutor`-style actions — no new executor class
- [ ] 3.5 Promote `showSaveFile`/`showAchievement`/`hideAchievement` from Proposed to Established in `action-vocabulary.md` with their final shapes; remove the now-Established rows from the "Meta-shell & flourishes" proposed section

## 4. Save-file rendering

- [ ] 4.1 In `TextCard.tsx`, add an `overlay.kind === 'save-file'` branch rendering the summary as a distinct full-screen card style (visually distinct from `act-card`/`headline`/`title`/`defeat`)

## 5. Achievement toast rendering

- [ ] 5.1 Build `AchievementToast.tsx`: reads `resting.achievement`, renders a fixed-position styled toast with the authored `text` when non-null, nothing when `null`
- [ ] 5.2 Add a fire-and-forget fade-in/fade-out CSS transition on live entry/exit only (no resting-state footprint), matching `TalkRpgScene`'s encounter-flash/damage-number precedent — a `snapTo`/`back`/`skipTo` jump shows the toast at full opacity immediately, no animation replay
- [ ] 5.3 Mount `AchievementToast` as a sibling of `BattleHud`/`MeterHud`/`DialogueBox`/`MenuShell`/`TextCard` in `RpgExperience.tsx`'s `Experience`

## 6. Demo content — cold open

- [ ] 6.1 Extend `SCRIPT` with an opening beat sequence: `showOverlay(kind: 'title')` + `showMenu(menuKind: 'command', options: ['Start Game'])` shown being selected on rails, proving the title screen needs no new action type
- [ ] 6.2 Extend `SCRIPT` with a `showSaveFile` beat (an authored "completed, high-level prior playthrough" summary + "enhanced edition available" prompt text) followed by `hideOverlay`, per `idea-board.md` §3's locked cold-open sequence
- [ ] 6.3 Extend `SCRIPT` with a `showAchievement` beat landing on an existing stage's failure/turn beat (reusing a placeholder line; final copy stays `[PARKED]` per `idea-board.md` §8) while a dialogue/overlay is already active, followed by `hideAchievement`, demonstrating the toast coexists with other content

## 7. Tests

- [ ] 7.1 Unit tests for the `achievement` reducer: `showAchievement` sets `{ text }`; `hideAchievement` unconditionally clears to `null` even when already `null`
- [ ] 7.2 Unit tests for `showSaveFile`: sets `overlay` to `{ kind: 'save-file', text: summary }`; a subsequent `hideOverlay` clears it to `null`
- [ ] 7.3 Headless precompute test: a script running `showOverlay('title')` + `showMenu('command')`, then `showSaveFile` → `hideOverlay`, then `showAchievement` while a dialogue is open → `hideAchievement`, asserts the cached resting state at each `stop` has the expected `overlay`/`achievement`/`ui` shape
- [ ] 7.4 Test that `skipTo`/`back` across a `showAchievement`/`showSaveFile` checkpoint (without passing through them live) reproduces the same `achievement`/`overlay` values as live playback, with no stale content carried over from a prior checkpoint

## 8. Verification

- [ ] 8.1 Run `npm run test` and confirm all tests pass, including the extended `client-talks` suite
- [ ] 8.2 Run `npm run build:talks` and confirm zero TypeScript errors
- [ ] 8.3 Manually verify in the browser (Playwright screenshot, saved to `/tmp/track-verify/`): the title screen renders with its command menu, the save-file screen shows its summary and clears via the next beat, the achievement toast pops alongside active dialogue/overlay content and fades out, and `back()`/`skipTo()` across a meta-shell checkpoint land the correct values with no stale state from a prior beat
