## 1. Engine foundations (`talk-apparatus-engine`)

- [x] 1.1 Create `client-talks/src/talk-apparatus/` module structure (mirroring `talk-rpg/`'s file layout: state, actions, precompute, engine, React binding).
- [x] 1.2 Define the `ApparatusState` shape: chat pane blocks, window blocks (pinned foundation + scroll zone), plan shelf, skills shelf, context gauge, token counter, status indicators, gaze marker target, dimmed code/diff pane state, `stageKind`.
- [x] 1.3 Define the `BeatAction` discriminated union: `spawnBlock`, `promoteBlock`, `evictBlock`, `compactBlocks`, `clearWindow`, `flush`, `highlightBlock`, `pinFoundation`/`unpinFoundation`, `setGauge`, `setCounter`, `flipStatus`, `moveGaze`, `sceneSwap`, `pause`, `stop`.
- [x] 1.4 Implement each `BeatAction` as a pure `(state) => state` reducer.
- [x] 1.5 Implement the deterministic headless precompute pass (`runPrecompute`): apply the full `BeatAction[]` once, snapshot state at every `stop`, return the checkpoint array.
- [x] 1.6 Implement `ApparatusDirectorEngine` with `snapTo`/`next`/`back`/`skipTo`/`skipForward`/`restart`/`pause`/`resume`, following `talk-rpg`'s `DirectorEngine` semantics (see `openspec/specs/talk-director/spec.md`).
- [x] 1.7 Implement the React binding (`ApparatusDirectorProvider`/`useApparatusDirector`) using `useSyncExternalStore`, mirroring `talk-rpg/Director.tsx`.
- [x] 1.8 Implement presenter progress readout ("N / X") and a presenter-only current-beat/next-action readout.
- [x] 1.9 Wire keyboard/click advance controls (reuse the `talk-rpg-experience` input-handling pattern: ArrowRight/Space/click → `next()`, ArrowLeft → `back()`, pause toggle) and an on-screen control bar with Skip/Restart.

## 2. Renderer

- [x] 2.1 Build the apparatus stage renderer (React + Tailwind CSS + SVG/CSS transitions, no Phaser): chat pane, context window (pinned foundation zone + scroll zone), plan shelf, skills shelf.
- [x] 2.2 Implement the three-color system as shared style tokens (green / anchor / muted) applied consistently to blocks.
- [x] 2.3 Implement context gauge (fill % + overflow visual state) and token counter (variable-speed count-up) components.
- [x] 2.4 Implement status indicator components (bug ✓/✗, "working features" counter, Stage 3 station lights, review-gate hold).
- [x] 2.5 Implement the gaze marker component (persists at target pane until re-pointed).
- [x] 2.6 Implement the feedback-arrow visual (skills shelf → pinned foundation).
- [x] 2.7 Implement `stageKind`-based mounting: apparatus view vs. cold-open view (ticker + divergence chart) vs. close view (chart + bar animation).
- [x] 2.8 Verify CSS-transition visuals never gate `next()`/`skipForward()` — state application is synchronous per design.md's skip-exactness decision.

## 3. Content — AI Eng Dynamic script

- [x] 3.1 Author `coldOpen.ts` beats: headline ticker, two-line divergence chart, static hold.
- [x] 3.2 Author `stage1VibeCoding.ts` beats: healthy empty apparatus; neutral streaming blocks with gauge/counter climb; "remember" green spawn+highlight+promote; stalled working-features counter; overflow + evict/compact/clear; consequence status flip with gaze held on app.
- [x] 3.3 Author `stage2SpecDriven.ts` beats: green window fill toward cap; `flush` to plan shelf; gaze spanning chat/spec/app with climbing working-features counter; dimmed code pane accumulation with rising cost-to-change indicator; gaze-snap trap reveal.
- [x] 3.4 Author `stage3Harness.ts` beats: Define/Review/Improve station lights; pattern documented → skill written to skills shelf; feedback arrow to pinned foundation; review-gate hold through automated updates; steady-state close (both shelves full, low gauge, slow counter).
- [x] 3.5 Author `close.ts` beats: divergence chart return with added trajectory line; typing-bar-shrinks/judgment-bars-grow animation; final static hold.
- [x] 3.6 Concatenate all five scene files into the full `BeatAction[]` script at load time, with `sceneSwap` actions at each scene boundary.
- [x] 3.7 Add `kind: 'apparatus'` to the `Talk.kind` union in `client-talks/src/talks.ts` and register the "AI Eng Dynamic" talk entry.
- [x] 3.8 Branch the talk page/router to render the apparatus engine's root component when `kind === 'apparatus'`.

## 4. Testing

- [x] 4.1 Unit tests for precompute determinism (same script → identical checkpoints across runs), mirroring `talk-rpg/precompute.test.ts`.
- [x] 4.2 Unit tests for `ApparatusDirectorEngine` controls (`next`/`back`/`skipTo`/`skipForward`/`restart`/`pause`/`resume`), mirroring `talk-rpg/directorEngine.test.ts`.
- [x] 4.3 Unit tests for each `BeatAction` reducer, especially `flush` (atomic four-sub-step transition) and `evictBlock`/`compactBlocks`/`clearWindow`.
- [x] 4.4 Unit test for scene-swap reversibility across a stage boundary (`back()` from an apparatus stage's first beat lands on the prior scene's last beat).
- [x] 4.5 Run the full test suite and confirm all existing and new tests pass.

## 5. Verification

- [x] 5.1 Run `npm run build:talks` and confirm zero TypeScript errors.
- [x] 5.2 Manually rehearse the full script in-browser (all five scenes) using keyboard/click/on-screen controls, confirming reversibility and skip-ahead behavior at scene boundaries.
- [x] 5.3 Confirm offline operation: load the talk once, disconnect network, verify all presenter controls and beat transitions still work.
- [x] 5.4 Confirm Zoom-legibility at the fixed aspect ratio (visual check at a compressed/shared-screen-like viewport size).

## 6. Two-sided chat transcript (follow-up)

- [x] 6.1 Add an optional `speaker` (`'user' | 'agent'`) to `Block` and `spawnBlock`; attach it in the reducer only when set so user prompts stay shape-identical to pre-`speaker` blocks.
- [x] 6.2 Render the chat pane as a two-sided conversation (`ChatBubble`): user right, agent left, with sender label, directional tail, and side-matched entrance animation; keep bubble fill on the three-color register (no fourth speaker color).
- [x] 6.3 Bottom-anchor the transcript (`mt-auto`) so a short log rests against the pane's bottom edge instead of stacking from the top.
- [x] 6.4 Add chat-only `agent` replies to the Stage 1 and Stage 2 scripts so both sides of the conversation appear without disturbing the window/gauge/counter narrative.
- [x] 6.5 Add reducer tests for `speaker` (explicit agent carried through promote; omitted for user prompts); run the full suite and `build:talks` green.
