## 1. Engine foundations (`talk-apparatus-engine`)

- [ ] 1.1 Create `client-talks/src/talk-apparatus/` module structure (mirroring `talk-rpg/`'s file layout: state, actions, precompute, engine, React binding).
- [ ] 1.2 Define the `ApparatusState` shape: chat pane blocks, window blocks (pinned foundation + scroll zone), plan shelf, skills shelf, context gauge, token counter, status indicators, gaze marker target, dimmed code/diff pane state, `stageKind`.
- [ ] 1.3 Define the `BeatAction` discriminated union: `spawnBlock`, `promoteBlock`, `evictBlock`, `compactBlocks`, `clearWindow`, `flush`, `highlightBlock`, `pinFoundation`/`unpinFoundation`, `setGauge`, `setCounter`, `flipStatus`, `moveGaze`, `sceneSwap`, `pause`, `stop`.
- [ ] 1.4 Implement each `BeatAction` as a pure `(state) => state` reducer.
- [ ] 1.5 Implement the deterministic headless precompute pass (`runPrecompute`): apply the full `BeatAction[]` once, snapshot state at every `stop`, return the checkpoint array.
- [ ] 1.6 Implement `ApparatusDirectorEngine` with `snapTo`/`next`/`back`/`skipTo`/`skipForward`/`restart`/`pause`/`resume`, following `talk-rpg`'s `DirectorEngine` semantics (see `openspec/specs/talk-director/spec.md`).
- [ ] 1.7 Implement the React binding (`ApparatusDirectorProvider`/`useApparatusDirector`) using `useSyncExternalStore`, mirroring `talk-rpg/Director.tsx`.
- [ ] 1.8 Implement presenter progress readout ("N / X") and a presenter-only current-beat/next-action readout.
- [ ] 1.9 Wire keyboard/click advance controls (reuse the `talk-rpg-experience` input-handling pattern: ArrowRight/Space/click → `next()`, ArrowLeft → `back()`, pause toggle) and an on-screen control bar with Skip/Restart.

## 2. Renderer

- [ ] 2.1 Build the apparatus stage renderer (React + Tailwind CSS + SVG/CSS transitions, no Phaser): chat pane, context window (pinned foundation zone + scroll zone), plan shelf, skills shelf.
- [ ] 2.2 Implement the three-color system as shared style tokens (green / anchor / muted) applied consistently to blocks.
- [ ] 2.3 Implement context gauge (fill % + overflow visual state) and token counter (variable-speed count-up) components.
- [ ] 2.4 Implement status indicator components (bug ✓/✗, "working features" counter, Stage 3 station lights, review-gate hold).
- [ ] 2.5 Implement the gaze marker component (persists at target pane until re-pointed).
- [ ] 2.6 Implement the feedback-arrow visual (skills shelf → pinned foundation).
- [ ] 2.7 Implement `stageKind`-based mounting: apparatus view vs. cold-open view (ticker + divergence chart) vs. close view (chart + bar animation).
- [ ] 2.8 Verify CSS-transition visuals never gate `next()`/`skipForward()` — state application is synchronous per design.md's skip-exactness decision.

## 3. Content — AI Eng Dynamic script

- [ ] 3.1 Author `coldOpen.ts` beats: headline ticker, two-line divergence chart, static hold.
- [ ] 3.2 Author `stage1VibeCoding.ts` beats: healthy empty apparatus; neutral streaming blocks with gauge/counter climb; "remember" green spawn+highlight+promote; stalled working-features counter; overflow + evict/compact/clear; consequence status flip with gaze held on app.
- [ ] 3.3 Author `stage2SpecDriven.ts` beats: green window fill toward cap; `flush` to plan shelf; gaze spanning chat/spec/app with climbing working-features counter; dimmed code pane accumulation with rising cost-to-change indicator; gaze-snap trap reveal.
- [ ] 3.4 Author `stage3Harness.ts` beats: Define/Review/Improve station lights; pattern documented → skill written to skills shelf; feedback arrow to pinned foundation; review-gate hold through automated updates; steady-state close (both shelves full, low gauge, slow counter).
- [ ] 3.5 Author `close.ts` beats: divergence chart return with added trajectory line; typing-bar-shrinks/judgment-bars-grow animation; final static hold.
- [ ] 3.6 Concatenate all five scene files into the full `BeatAction[]` script at load time, with `sceneSwap` actions at each scene boundary.
- [ ] 3.7 Add `kind: 'apparatus'` to the `Talk.kind` union in `client-talks/src/talks.ts` and register the "AI Eng Dynamic" talk entry.
- [ ] 3.8 Branch the talk page/router to render the apparatus engine's root component when `kind === 'apparatus'`.

## 4. Testing

- [ ] 4.1 Unit tests for precompute determinism (same script → identical checkpoints across runs), mirroring `talk-rpg/precompute.test.ts`.
- [ ] 4.2 Unit tests for `ApparatusDirectorEngine` controls (`next`/`back`/`skipTo`/`skipForward`/`restart`/`pause`/`resume`), mirroring `talk-rpg/directorEngine.test.ts`.
- [ ] 4.3 Unit tests for each `BeatAction` reducer, especially `flush` (atomic four-sub-step transition) and `evictBlock`/`compactBlocks`/`clearWindow`.
- [ ] 4.4 Unit test for scene-swap reversibility across a stage boundary (`back()` from an apparatus stage's first beat lands on the prior scene's last beat).
- [ ] 4.5 Run the full test suite and confirm all existing and new tests pass.

## 5. Verification

- [ ] 5.1 Run `npm run build:talks` and confirm zero TypeScript errors.
- [ ] 5.2 Manually rehearse the full script in-browser (all five scenes) using keyboard/click/on-screen controls, confirming reversibility and skip-ahead behavior at scene boundaries.
- [ ] 5.3 Confirm offline operation: load the talk once, disconnect network, verify all presenter controls and beat transitions still work.
- [ ] 5.4 Confirm Zoom-legibility at the fixed aspect ratio (visual check at a compressed/shared-screen-like viewport size).
