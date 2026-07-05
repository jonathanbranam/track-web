**App**: talks

## ADDED Requirements

### Requirement: Deterministic headless precompute pass
The system SHALL provide a precompute pass that runs an entire authored `BeatAction[]` list once, headlessly, and records a full apparatus-state snapshot at every `stop` action. Running the same `BeatAction[]` list through the precompute pass SHALL always produce identical state snapshots, regardless of when or how many times it is run.

#### Scenario: Precompute produces one checkpoint per stop
- **WHEN** the precompute pass runs against a beat list containing N `stop` actions
- **THEN** it returns an array of exactly N state snapshots, one per `stop`, in script order

#### Scenario: Precompute is deterministic across runs
- **WHEN** the precompute pass is run twice against the same beat list
- **THEN** both runs produce identical state snapshots

### Requirement: Presenter controls operate on precomputed checkpoints
The system SHALL provide `snapTo(i)`, `next()`, `back()`, `skipTo(i)`, `skipForward()`, `restart()`, `pause()`, and `resume()`, matching the semantics established by the `talk-director` capability: `snapTo`/`skipTo`/`skipForward`/`restart`/`back` apply a checkpoint's state instantly and explicitly (nothing inherited from the prior display); `next()` applies the next beat's state and lets the renderer animate the visual transition; `pause()`/`resume()` halt and resume an in-flight transition without losing progress.

#### Scenario: next() advances one beat and converges with the precomputed checkpoint
- **WHEN** `next()` is called while resting at checkpoint `i`
- **THEN** the system applies checkpoint `i+1`'s state, and that state is identical to the precomputed snapshot for checkpoint `i+1`

#### Scenario: back() is instant with no replay
- **WHEN** `back()` is called while resting at checkpoint `i` (`i > 0`)
- **THEN** the display instantly matches checkpoint `i-1`'s state with no transition animation replayed

#### Scenario: skipForward() lands on the exact target state regardless of in-flight animation
- **WHEN** `skipForward()` is called while a CSS transition from applying checkpoint `i` toward `i+1` is still visually in progress
- **THEN** the display instantly matches checkpoint `i+1`'s precomputed state, identical to what `next()` would have eventually shown once its transition finished

#### Scenario: restart() returns to the initial state
- **WHEN** `restart()` is called at any checkpoint
- **THEN** the display instantly matches the state before the first checkpoint

#### Scenario: Scene jump for practice and Q&A recovery
- **WHEN** the presenter calls `skipTo` with the checkpoint index of a named scene's first beat
- **THEN** the display instantly matches that scene's starting state, without executing or rendering any intervening beats

### Requirement: Block lifecycle actions
The `BeatAction` vocabulary SHALL include `spawnBlock` (create a colorized, labeled block in the chat pane), `promoteBlock` (move a block from chat into the context window), `evictBlock` (remove a block from the window's middle), `compactBlocks` (replace two or more blocks with one smaller, lossier block), `clearWindow` (remove all non-pinned blocks), `flush` (atomically consolidate all green blocks into one block, write it to the plan shelf, clear the window, and drop a compact green reference block back into the window), and `highlightBlock` (pulse a block, e.g. when "remember" fires). Each SHALL be a pure function from the current apparatus state to the next apparatus state.

#### Scenario: promoteBlock moves a block from chat to window
- **WHEN** a `promoteBlock` action targets a block previously created by `spawnBlock`
- **THEN** the resulting state shows that block inside the context window and no longer in the chat pane

#### Scenario: flush performs all four sub-steps as one checkpoint transition
- **WHEN** a `flush` action runs
- **THEN** the resulting single checkpoint's state shows the plan shelf containing the new consolidated block, the context window containing only a compact green reference block, and no other non-pinned blocks remaining

#### Scenario: evictBlock removes exactly the targeted block
- **WHEN** an `evictBlock` action targets a specific block ID
- **THEN** the resulting state no longer contains that block, and all other blocks are unchanged

### Requirement: Region behaviors
The `BeatAction` vocabulary SHALL include `pinFoundation`/`unpinFoundation` (fix or release the foundation zone at the bottom of the context window so it does not scroll with the rest of the window's contents), and a `flush` side effect that visibly accumulates the plan shelf and skills shelf (each shelf's rendered content grows as more blocks are written to it across beats, never resets automatically).

#### Scenario: Pinned foundation does not scroll
- **WHEN** the foundation zone is pinned and a `promoteBlock` action adds a block to the scroll zone above it
- **THEN** the foundation zone's own contents and position are unaffected by the new block entering the scroll zone

#### Scenario: Shelves accumulate across beats
- **WHEN** two separate `flush`-equivalent shelf-writes occur at different points in the script
- **THEN** the shelf's rendered state after the second write includes both written blocks, not just the most recent one

### Requirement: Gauges, counters, and status indicators
The `BeatAction` vocabulary SHALL include `setGauge` (animate the context-fill gauge to a target percentage, including an overflow state when the target exceeds 100%), `setCounter` (animate a token counter's count-up to a target value at a specified speed), and `flipStatus` (set a named status indicator, e.g. a bug indicator or "working features" counter, to a new value).

#### Scenario: Gauge overflow triggers at the configured threshold
- **WHEN** a `setGauge` action's target percentage is 100% or greater
- **THEN** the resulting state marks the gauge as overflowed, distinct from a gauge resting below 100%

#### Scenario: Counter speed is preserved in state
- **WHEN** two `setCounter` actions specify different speeds (fast vs. slow)
- **THEN** each resulting checkpoint's state records the speed that action specified, so the renderer can animate a spinning-fast vs. ticking-slow count-up accordingly

### Requirement: Gaze marker
The `BeatAction` vocabulary SHALL include `moveGaze`, which points a single gaze marker at a named target pane (app, spec, code, skills). The gaze marker's target SHALL persist across subsequent beats until a later `moveGaze` action re-points it.

#### Scenario: Gaze holds position until re-pointed
- **WHEN** `moveGaze` targets "app" at beat 5, and beats 6–9 contain no `moveGaze` action
- **THEN** the apparatus state at beats 6 through 9 still shows the gaze marker targeting "app"

### Requirement: Scene swap between apparatus and non-apparatus stages
The `BeatAction` vocabulary SHALL include `sceneSwap`, which sets a `stageKind` field (`apparatus`, `coldOpen`, or `close`) on the apparatus state. The renderer SHALL mount the component tree corresponding to the current `stageKind`, while the presenter continues to navigate with the same `next()`/`back()`/`skipTo()` controls across the swap boundary.

#### Scenario: Reversibility across a scene-swap boundary
- **WHEN** the presenter is at the first beat of the `apparatus` stage and calls `back()`
- **THEN** the display instantly shows the last beat of the preceding `coldOpen` stage, using the same `back()` control used within a single stage

### Requirement: Presenter progress and next-action readout
The system SHALL display the current checkpoint out of the total checkpoint count (e.g. "N / X"), visible to the presenter, and SHALL provide a presenter-only readout of the current beat's identifier and the action that the next `next()` call will perform.

#### Scenario: Progress indicator updates on navigation
- **WHEN** playback reaches checkpoint `i` of `X` total via any control (`next`, `back`, `skipTo`, `snapTo`)
- **THEN** the progress indicator shows "i+1 / X"

### Requirement: Offline operation and fixed-aspect legibility
The system SHALL run with no network dependency once loaded, and SHALL render at a fixed aspect ratio with text sized to remain legible when compressed by Zoom screen-share.

#### Scenario: No network calls during playback
- **WHEN** the apparatus talk is loaded once and the network is then disconnected
- **THEN** all presenter controls and beat transitions continue to function
