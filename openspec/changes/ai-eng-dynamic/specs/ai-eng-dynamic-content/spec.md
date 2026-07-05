**App**: talks

## ADDED Requirements

### Requirement: New `apparatus` talk kind
The system SHALL extend the `Talk.kind` union in `client-talks/src/talks.ts` to include `'apparatus'`, alongside the existing `'content'` and `'rpg'` kinds. The talk page router SHALL render the `talk-apparatus-engine` capability's root component when a talk's `kind` is `'apparatus'`, mirroring how `kind: 'rpg'` renders `RpgExperience` today.

#### Scenario: Apparatus talk renders the apparatus engine
- **WHEN** the talk page loads a talk whose `kind` is `'apparatus'`
- **THEN** it mounts the apparatus engine's root component instead of the standard content shell or the RPG experience

### Requirement: AI Eng Dynamic talk is registered
The system SHALL register an "AI Eng Dynamic" entry in `TALKS` with `kind: 'apparatus'`, a slug, title, and description, so it is reachable from the talks landing page like any other talk.

#### Scenario: Talk appears on the landing page
- **WHEN** the talks landing page renders the `TALKS` list
- **THEN** a card for the "AI Eng Dynamic" talk is shown alongside existing talks

### Requirement: Three-color system
The apparatus's rendered blocks SHALL use exactly three visual registers: green for durable/important knowledge, one fixed anchor color for the pinned foundation zone, and a muted neutral for ordinary chatter. No other color SHALL be used to convey narrative meaning on apparatus blocks.

#### Scenario: Green blocks are visually distinct from muted blocks
- **WHEN** the script spawns one block colored "green" and one colored "muted"
- **THEN** the two render with visually distinct, consistently-applied colors matching their register across every beat they appear in

### Requirement: Cold open scene
The script SHALL include a cold-open scene (`stageKind: 'coldOpen'`) preceding the apparatus stages, consisting of an expiring-headline ticker beat followed by a two-line divergence chart beat (predicted vs. actual), ending on a static hold beat.

#### Scenario: Cold open precedes the first apparatus beat
- **WHEN** the presenter steps from the last cold-open beat via `next()`
- **THEN** the resulting state's `stageKind` becomes `'apparatus'` and shows Stage 1's initial apparatus state

### Requirement: Stage 1 — Vibe coding scene
The script SHALL include a Stage 1 scene showing: an apparatus starting in a healthy-looking empty state; neutral blocks streaming from chat into the window while the context gauge climbs and the token counter spins; one "remember" beat where a green block is spawned, highlighted, and promoted into the window; a "working features" counter that stalls despite an app that looks feature-rich; an overflow beat where the context gauge tops out and the green block is evicted (or compacted, or the window is cleared); and a consequence beat where a status indicator flips to reflect the lost instruction, with the gaze marker held on the app throughout the stage.

#### Scenario: The "remember" instruction is lost
- **WHEN** the script's Stage 1 "remember" block is later consumed by the overflow beat's `evictBlock` (or `compactBlocks`/`clearWindow`) action
- **THEN** the subsequent consequence beat's state no longer contains that block, and a status indicator reflects the regression

### Requirement: Stage 2 — Spec-driven development scene
The script SHALL include a Stage 2 scene showing: the window filling with green working material as the token counter climbs toward a cap; a `flush` beat that writes the consolidated plan to the plan shelf, clears the window, and drops a green reference block back in; the gaze marker moving to span chat, spec, and app while a "working features" counter climbs steadily; a code/diff pane accumulating unwatched state in a dimmed visual state with a rising "cost to change" indicator; and a closing beat where the gaze marker snaps to the code pane, revealing the accumulated implementation as the trap.

#### Scenario: Flush preserves momentum visibly
- **WHEN** the Stage 2 `flush` beat executes
- **THEN** the resulting state shows the plan shelf non-empty, the window's non-pinned blocks cleared to just the reference block, and the gaze marker unaffected by the flush itself

#### Scenario: The trap reveal snaps the gaze to code
- **WHEN** the Stage 2 trap beat executes
- **THEN** the gaze marker's target becomes "code" and the code/diff pane's dimmed state is replaced with a revealed state

### Requirement: Stage 3 — Harness scene
The script SHALL include a Stage 3 scene showing: three persistent "station" indicators (Define, Review, Improve) lighting up and staying lit; a beat where a pattern is documented and written to the skills shelf; a feedback-arrow beat connecting the skills shelf to the pinned foundation zone; a beat holding the human review-gate status indicator lit while nearby automated status indicators update; and a closing steady-state beat showing both shelves non-empty, the context gauge low, and the token counter animating at its slow speed.

#### Scenario: Skills shelf feeds the pinned foundation
- **WHEN** the feedback-arrow beat executes after a skill has been written to the skills shelf
- **THEN** the resulting state shows the feedback arrow connecting the skills shelf to the pinned foundation zone

#### Scenario: Review gate stays lit through automation
- **WHEN** an automated status indicator updates during Stage 3's review-gate beat
- **THEN** the human review-gate indicator's lit state is unchanged by that update

### Requirement: Close scene
The script SHALL include a close scene (`stageKind: 'close'`) showing the divergence chart from the cold open returning with an added trajectory line, followed by a bar-animation beat where a "typing" bar shrinks while "judgment/design/review" bars grow, ending on a final static hold beat.

#### Scenario: Close reuses the cold-open chart with an added line
- **WHEN** the close scene's chart beat renders
- **THEN** it shows the same two lines from the cold-open chart plus one additional trajectory line
