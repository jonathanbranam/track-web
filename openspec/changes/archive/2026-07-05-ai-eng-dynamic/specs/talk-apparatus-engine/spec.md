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
The system SHALL provide `snapTo(i)`, `next()`, `back()`, `skipTo(i)`, `skipForward()`, `restart()`, `pause()`, and `resume()`, matching the control-surface shape established by the `talk-director` capability, adapted for synchronous playback: `snapTo`/`skipTo`/`skipForward`/`restart`/`back` apply a checkpoint's state instantly and explicitly (nothing inherited from the prior display); `next()` applies every action from the current checkpoint up to and including the next `stop`, in one synchronous call, and lets the renderer animate the resulting visual transition via CSS. Unlike `talk-director`'s asynchronous engine, apparatus playback has no in-flight, awaited transition for `pause()`/`resume()` to halt or resume — they SHALL toggle a presenter-facing `paused` flag and no more, kept only so the on-screen and keyboard control surface stays consistent between the two talk engines. The engine's presenter-facing `status` SHALL therefore always report `'RESTING'`; the system SHALL NOT expose a `'PLAYING'` state or an accompanying "now playing" indicator, since there is never a genuinely in-progress segment to reflect.

#### Scenario: next() advances one beat and converges with the precomputed checkpoint
- **WHEN** `next()` is called while resting at checkpoint `i`
- **THEN** the system applies checkpoint `i+1`'s state, and that state is identical to the precomputed snapshot for checkpoint `i+1`

#### Scenario: pause() and resume() do not halt or delay any transition
- **WHEN** `pause()` is called at any checkpoint, followed later by `resume()`
- **THEN** the presenter-facing `paused` flag toggles accordingly, but no beat's state application is delayed, altered, or replayed as a result — `next()`, `back()`, and the other navigation controls behave identically to if `pause()`/`resume()` had never been called

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
The `BeatAction` vocabulary SHALL include `spawnBlock` (create a colorized, labeled block in the chat pane), `promoteBlock` (copy a block from the chat log into the context window, leaving the original in the chat log), `evictBlock` (remove a block from the window's middle), `compactBlocks` (replace two or more blocks with one smaller, lossier block), `clearWindow` (remove all non-pinned blocks), `flush` (atomically consolidate all green blocks into one block, write it to the plan shelf, clear the window, and drop a compact green reference block back into the window), and `highlightBlock` (pulse a block, e.g. when "remember" fires). Each SHALL be a pure function from the current apparatus state to the next apparatus state.

`spawnBlock` SHALL accept an optional `speaker` (`'user'` or `'agent'`) that records who authored the message. A block spawned with no `speaker` SHALL be treated as a `'user'` message (the default), and its stored shape SHALL be identical to a block authored before the `speaker` field existed (the field is omitted, not stored as an explicit `'user'`). A `promoteBlock` copy SHALL carry the original block's `speaker` along into the context window.

#### Scenario: spawnBlock records an explicit agent speaker
- **WHEN** a `spawnBlock` action sets `speaker: 'agent'` and the block is then promoted
- **THEN** the block in the chat log records `speaker: 'agent'`, and the promoted copy in the context window carries the same `speaker`

#### Scenario: A user prompt omits the speaker field
- **WHEN** a `spawnBlock` action is authored with no `speaker`
- **THEN** the resulting chat block has no `speaker` field and is rendered as a user message

`promoteBlock`, `evictBlock`, `compactBlocks`, `clearWindow`, and `flush` SHALL operate only on the context window (and shelves); none of them SHALL remove a block from the chat log. Removing a promoted block from the context window (e.g. via `evictBlock`, `compactBlocks`, `clearWindow`, or a `flush` window-clear) SHALL leave its original block untouched in the chat log — modeling the real tools' behavior, where a message that scrolls out of the context window is still present in the conversation transcript.

#### Scenario: promoteBlock copies a block into the window and keeps it in the chat log
- **WHEN** a `promoteBlock` action targets a block previously created by `spawnBlock`
- **THEN** the resulting state shows that block inside the context window AND still present in the chat log

#### Scenario: Evicting a promoted block leaves it in the chat log
- **WHEN** a block is spawned, promoted, and then removed from the context window by `evictBlock`
- **THEN** the resulting state shows no such block in the context window, but the original block still present in the chat log

#### Scenario: flush performs all four sub-steps as one checkpoint transition
- **WHEN** a `flush` action runs
- **THEN** the resulting single checkpoint's state shows the plan shelf containing the new consolidated block, the context window containing only a compact green reference block, and no other non-pinned blocks remaining

#### Scenario: evictBlock removes exactly the targeted block
- **WHEN** an `evictBlock` action targets a specific block ID
- **THEN** the resulting state no longer contains that block, and all other blocks are unchanged

### Requirement: Chat log as a persistent, scrollable transcript
The chat pane SHALL behave as an append-only transcript: every `spawnBlock` adds a message to it, and no beat action ever removes a message from it. The chat log SHALL accumulate all messages spawned up to the current checkpoint, so that at any checkpoint the pane holds the full conversation history to that point. The chat pane SHALL anchor its contents to the bottom of the pane — when the transcript is shorter than the pane it SHALL rest against the bottom edge (newest message just above the fold, as a real chat client does) rather than stacking from the top, and once it overflows it SHALL scroll normally with the newest message at the bottom. The chat pane SHALL keep its newest message in view as the log grows (auto-scrolling to the bottom when a new message is added by advancing to a later checkpoint), while remaining manually scrollable by the presenter at a resting checkpoint — scrolling within the chat pane SHALL NOT advance the presentation. Auto-scroll SHALL fire only when the chat's message count changes, so it does not override the presenter's manual scroll position while parked at a checkpoint.

#### Scenario: Chat log accumulates across the talk
- **WHEN** the presentation has reached a checkpoint after several `spawnBlock`/`promoteBlock` beats
- **THEN** the chat pane shows every message spawned so far, in order, not only the most recent one

#### Scenario: Transcript fills from the bottom
- **WHEN** the chat log holds only a few messages that do not fill the pane's height
- **THEN** those messages rest against the bottom edge of the pane, not the top

#### Scenario: Newest message stays in view as the log grows
- **WHEN** advancing to a checkpoint whose beat spawned a new chat message
- **THEN** the chat pane scrolls so the newest message is visible

#### Scenario: Presenter can manually scroll the transcript without advancing
- **WHEN** the presentation is resting at a checkpoint and the presenter scrolls (wheel, drag, or touch) within the chat pane
- **THEN** the chat pane scrolls to reveal earlier messages and the current checkpoint does not change

### Requirement: Chat transcript is a two-sided conversation
The chat pane SHALL render as a two-sided conversation keyed on each message's `speaker`: `user` messages SHALL align to the right edge of the pane with a small gap on the left, and `agent` messages SHALL align to the left edge with a small gap on the right — the iMessage / Claude Code chat layout. Each message SHALL be visually attributable to its sender by position and by a small sender label, and MAY use a directional bubble tail and a side-matched entrance animation (user from the right, agent from the left). Speaker identity SHALL be conveyed by these positional and labeling cues, NOT by introducing a bubble fill color outside the apparatus's three-color register — so a message's register color (e.g. a green "remember" message) reads the same in the chat pane as anywhere else, regardless of which side it sits on.

#### Scenario: User and agent messages sit on opposite sides
- **WHEN** the chat log contains a `user` message immediately followed by an `agent` reply
- **THEN** the user message renders aligned to the right of the pane and the agent reply aligned to the left, each labeled with its sender

#### Scenario: Register color survives the two-sided layout
- **WHEN** a green (durable/"remember") message is authored as a `user` message
- **THEN** it renders on the right (user) side while still using the green register color, not a speaker-specific fill color

### Requirement: Promotion entrance animation
When a message is promoted into the context window, the renderer SHALL play a one-shot entrance animation on the newly added context-window block that visually connects it to the chat side (e.g. sliding in from the direction of the chat pane), so the audience can see the message entering the context. Newly spawned chat messages MAY play their own entrance animation. These animations SHALL be purely presentational: they SHALL play on element mount and SHALL NOT gate presenter navigation, so `back()`, `skipTo()`, `skipForward()`, and `restart()` still land instantly on the exact resting state regardless of any in-flight animation.

#### Scenario: Promoted block animates in from the chat side
- **WHEN** advancing to a checkpoint whose beat promoted a chat message into the context window
- **THEN** the new context-window block plays an entrance animation on mount without delaying or blocking the checkpoint transition

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
