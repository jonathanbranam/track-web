**App**: talks

## ADDED Requirements

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

### Requirement: Placeholder resting-state renderer
The system SHALL render the current resting state using plain placeholder rectangles (no Phaser, no tilemap, no sprites) positioned according to each entity's coordinates in the resting-state snapshot, sufficient to visually verify that playback, snapTo, back, pause/resume, and skip all produce the correct on-screen state.

#### Scenario: Placeholder entities reflect the current resting state
- **WHEN** the system is resting at a checkpoint whose snapshot places entity `pc` at a given position
- **THEN** the placeholder renderer displays a rectangle for `pc` at that position, with no Phaser game instance involved
