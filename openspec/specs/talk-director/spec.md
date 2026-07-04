**App**: talks

## Purpose

The talk director defines the core playback engine for scripted, reversible RPG-style talk presentations: an authored `Action[]` list run once through a deterministic, headless precompute pass to produce a cached array of resting-state checkpoints, plus the presenter controls (`snapTo`/`next`/`back`/`pause`/`resume`/`skipTo`/`skipForward`) that operate on that checkpoint array. It is framework-agnostic (no Phaser dependency); rendering the resting-state contract is the `world-rendering` capability's concern.

## Requirements

### Requirement: Phase 1 action vocabulary
The system SHALL define an `Action` union limited, for this phase, to `walk` (literal relative-step path only), `pause`, `stop`, `startDialogue`, `say`, and `endDialogue`. Actions SHALL reference entity IDs, never raw coordinates. No other action type (`walkTo`, `thought`, `enterScene`, battle/meter/light actions, etc.) SHALL be required to exist yet.

#### Scenario: Walk action carries a literal path
- **WHEN** a `walk` action is authored for entity `pc`
- **THEN** it specifies an ordered list of relative steps (direction + step count) and no target location or pathfinding is involved

#### Scenario: Unsupported action types are not required
- **WHEN** the Phase 1 placeholder script is authored
- **THEN** it uses only `walk`, `pause`, `stop`, `startDialogue`, `say`, and `endDialogue` — no `walkTo`, `thought`, or `enterScene` action is needed for this phase's proving script

### Requirement: Deterministic headless precompute pass
The system SHALL provide a precompute pass that runs an entire authored `Action[]` list once, headlessly — with no real-time waiting and no animation-frame timing — and records a full resting-state snapshot at every `stop` action. Running the same `Action[]` list through the precompute pass SHALL always produce byte-for-byte identical resting-state snapshots, regardless of when or how many times it is run.

#### Scenario: Precompute produces one checkpoint per stop
- **WHEN** the precompute pass runs against an action list containing 3 `stop` actions
- **THEN** it returns an array of exactly 3 resting-state snapshots, one per `stop`, in script order

#### Scenario: Precompute is deterministic across runs
- **WHEN** the precompute pass is run twice against the same action list and map
- **THEN** both runs produce identical resting-state snapshots

#### Scenario: Precompute never waits on real time
- **WHEN** the precompute pass processes a `pause` action with a multi-second duration
- **THEN** the pass completes without any real elapsed wall-clock delay

### Requirement: Instant state reconstruction via snapTo
The system SHALL provide `snapTo(i)`, which applies resting-state checkpoint `i` to the current display explicitly and in full — every entity's position and facing, active dialogue UI, and section membership — with nothing inherited from whatever was displayed immediately beforehand.

#### Scenario: snapTo sets state explicitly
- **WHEN** `snapTo(i)` is called while a different checkpoint `j` is currently displayed
- **THEN** every field of checkpoint `i`'s resting state is applied, and no value from checkpoint `j` remains on screen

#### Scenario: snapTo works from any starting point
- **WHEN** `snapTo(i)` is called immediately after initial load, before any playback has occurred
- **THEN** the display matches checkpoint `i` exactly

### Requirement: Live forward playback via next()
The system SHALL provide `next()`, which — from the current checkpoint — executes the real, in-engine behavior of each subsequent action (a walk actually stepping through its path, a pause actually counting down, a dialogue action actually opening/updating/closing) and chains automatically from one action to the next on real completion, stopping only when it reaches the next `stop` action.

#### Scenario: next() plays a full segment to the next stop
- **WHEN** `next()` is called while resting at checkpoint `i`
- **THEN** the system executes every action between checkpoint `i` and checkpoint `i+1` in order, and comes to rest at checkpoint `i+1`'s resting state

#### Scenario: next() converges with the precomputed checkpoint
- **WHEN** `next()` finishes executing the actions leading to a `stop`
- **THEN** the resulting display state is identical to that `stop`'s precomputed resting-state snapshot

#### Scenario: next() is a no-op mid-playback
- **WHEN** `next()` is called while an action is already executing (not at rest)
- **THEN** the call has no effect and the in-flight action continues uninterrupted

### Requirement: Instant back navigation
The system SHALL provide `back()`, which instantly re-applies the previous checkpoint's precomputed resting state via `snapTo`, without replaying any actions.

#### Scenario: back() re-applies the previous checkpoint instantly
- **WHEN** `back()` is called while resting at checkpoint `i` (`i > 0`)
- **THEN** the display instantly matches checkpoint `i-1`'s resting state, with no actions replayed and no animation played

### Requirement: Pause and resume mid-action
The system SHALL provide `pause()` and `resume()`, which halt and resume whichever action is currently executing during `next()` playback, without losing the action's progress. Each action type SHALL be responsible for its own pause/resume behavior behind a common interface; the system SHALL NOT require action-type-specific logic in the calling code.

#### Scenario: pause() halts an in-flight action
- **WHEN** `pause()` is called while a `walk` action is partway through its path
- **THEN** the entity's movement stops in place and does not continue until `resume()` is called

#### Scenario: resume() continues from where it paused
- **WHEN** `resume()` is called after a `pause()` mid-`walk`
- **THEN** the entity continues its walk from its paused position toward the same final destination it was already headed to

#### Scenario: pause() is a no-op when already at rest
- **WHEN** `pause()` is called while the system is resting at a checkpoint (no action executing)
- **THEN** the call has no effect

### Requirement: Skip to any checkpoint
The system SHALL provide `skipTo(i)`, which jumps directly to checkpoint `i`'s precomputed resting state via `snapTo`, in either direction and at any distance, near-instantly.

#### Scenario: Skip forward past unseen checkpoints
- **WHEN** `skipTo(i)` is called while resting at checkpoint `0` and `i` is the last checkpoint in the script
- **THEN** the display instantly matches checkpoint `i`'s resting state without executing or rendering any of the intervening actions

#### Scenario: Skip backward past already-seen checkpoints
- **WHEN** `skipTo(i)` is called while resting at a later checkpoint and `i` is an earlier one
- **THEN** the display instantly matches checkpoint `i`'s resting state

### Requirement: Skip forward one checkpoint, completing any in-flight animation instantly
The system SHALL provide `skipForward()`, which advances to the next checkpoint instantly regardless of the current status. If an action is currently executing, `skipForward()` SHALL cancel it and apply the resting state it was headed toward — identical to the precomputed checkpoint `next()` would eventually reach — without waiting for the remainder of its real-time animation. If already at rest, `skipForward()` SHALL apply the next checkpoint's resting state directly, with no intervening actions played. `skipForward()` SHALL be a no-op when there is no next checkpoint (already resting at the last checkpoint).

#### Scenario: Skip forward completes an in-flight animation instantly
- **WHEN** `skipForward()` is called while an action is executing toward checkpoint `i+1`
- **THEN** the in-flight action is cancelled and the display instantly matches checkpoint `i+1`'s precomputed resting state, identical to what `next()` would have eventually produced

#### Scenario: Skip forward advances one checkpoint at rest
- **WHEN** `skipForward()` is called while resting at checkpoint `i`
- **THEN** the display instantly matches checkpoint `i+1`'s resting state, with no actions replayed and no animation played

#### Scenario: Skip forward is a no-op at the last checkpoint
- **WHEN** `skipForward()` is called while resting at the final checkpoint
- **THEN** the call has no effect

#### Scenario: Cancelled action never resumes after the fact
- **WHEN** `skipForward()` cancels an in-flight action and playback later reaches the point where that action's timer would have fired
- **THEN** no further world state change occurs from the cancelled action — the engine remains exactly at the checkpoint `skipForward()` landed on

### Requirement: Restart to the beginning
The system SHALL provide `restart()`, which cancels any in-flight action and applies the initial resting state — the state before the first checkpoint — via `snapTo(-1)`, regardless of the current playback status.

#### Scenario: Restart cancels in-flight playback
- **WHEN** `restart()` is called while an action is executing
- **THEN** the in-flight action is cancelled and the display instantly matches the initial state before the first checkpoint

#### Scenario: Restart from any checkpoint
- **WHEN** `restart()` is called while resting at any checkpoint
- **THEN** the display instantly matches the initial state before the first checkpoint, with no actions replayed

### Requirement: Playback progress indicator
The system SHALL display the number of checkpoints reached out of the total number of checkpoints in the script, as "N / X", so the presenter can tell how far through the script playback has progressed.

#### Scenario: Progress display at initial load
- **WHEN** the experience loads before any playback has occurred
- **THEN** the progress indicator shows "0 / X", where X is the total number of checkpoints in the script

#### Scenario: Progress display updates as checkpoints are reached
- **WHEN** playback reaches checkpoint `i` (via `next()`, `back()`, `skipTo()`, or `snapTo()`) in a script with X total checkpoints
- **THEN** the progress indicator shows "i+1 / X"

### Requirement: In-flight action indicator
The system SHALL display a visual indicator, visible only while the Director's status is `PLAYING`, and hidden while `RESTING`, so the presenter can tell playback has not yet reached the next checkpoint without needing to infer it from entity motion alone.

#### Scenario: Indicator appears during playback
- **WHEN** `next()` is called and begins executing actions toward the next `stop`
- **THEN** the in-flight indicator becomes visible and remains visible until that `stop` is reached

#### Scenario: Indicator hidden at rest
- **WHEN** the system is resting at a checkpoint (no action executing)
- **THEN** the in-flight indicator is not visible

### Requirement: Skip-ahead control
The system SHALL provide an on-screen "Skip" control, available regardless of playback status, that calls `skipForward()` — so the presenter can advance past a currently-playing animation, or jump ahead to the next section while at rest, without needing to wait for real-time playback.

#### Scenario: Skip control available while playing
- **WHEN** the presenter clicks the "Skip" control while an action is executing
- **THEN** `skipForward()` is called and the display instantly reaches the next checkpoint, without waiting for the remainder of the current action's real-time animation

#### Scenario: Skip control available while at rest
- **WHEN** the presenter clicks the "Skip" control while resting at a checkpoint
- **THEN** `skipForward()` is called and the display instantly advances to the next checkpoint

### Requirement: Restart control
The system SHALL provide an on-screen "Restart" control, positioned separately from the other presenter controls (bottom-left of the overlay, opposite the rest of the control bar) and available regardless of playback status, that calls `restart()` — so the presenter can return the presentation to the very beginning without reloading the page.

#### Scenario: Restart control returns to the beginning
- **WHEN** the presenter clicks the "Restart" control at any point during the presentation
- **THEN** `restart()` is called and the display instantly returns to the initial state before the first checkpoint
