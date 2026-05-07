**App:** time

## Purpose

Specifies the time picker controls for adjusting start and stop times when tracking tasks, including quick-offset buttons and manual input, with bounds enforcement.

## Requirements

### Requirement: Time picker on start task screen
The system SHALL display a time picker when the user is starting a new task. The picker SHALL default to the end time of the most recent entry, or current time if no prior entry exists today.

#### Scenario: Default time is end of previous task
- **WHEN** the user opens the start task screen after stopping a task
- **THEN** the time picker is pre-filled with the ended_at of the just-stopped entry

#### Scenario: Default time is now for first task
- **WHEN** the user opens the start task screen with no entries today
- **THEN** the time picker is pre-filled with the current local time

#### Scenario: User cannot set start before previous end
- **WHEN** the user adjusts the start time picker to a value earlier than the ended_at of the previous entry
- **THEN** the UI prevents confirmation (disables Start button or shows inline error)

### Requirement: Time picker on stop task screen
The system SHALL display a time picker when the user is stopping the running task. The picker SHALL default to the current time.

#### Scenario: Default stop time is now
- **WHEN** the user taps Stop Task
- **THEN** the time picker is pre-filled with the current local time

#### Scenario: User can roll back stop time
- **WHEN** the user adjusts the stop time to an earlier value
- **THEN** the updated ended_at is sent to the API and the entry is saved with that time

#### Scenario: User cannot set stop time before start time
- **WHEN** the user adjusts the stop time to a value before the entry's started_at
- **THEN** the UI prevents confirmation (disables Stop button or shows inline error)

### Requirement: Quick offset buttons on time picker
The system SHALL provide quick-offset buttons (-5m, -10m, -30m) on time pickers. Each button snaps the displayed time back to the previous boundary of its increment — the largest multiple of that increment strictly less than the current displayed time.

#### Scenario: Offset button snaps to previous boundary
- **WHEN** the displayed time is 8:28am and the user taps -5m
- **THEN** the displayed time becomes 8:25am (floors to nearest 5-minute boundary, not a fixed -5m offset)

#### Scenario: Repeated taps continue stepping by boundary intervals
- **WHEN** starting from 8:28am and the user taps -5m three times
- **THEN** the time steps 8:25 → 8:20 → 8:15 (each tap steps one interval from the current position)

#### Scenario: Offset respects lower bound constraint
- **WHEN** snapping back would push the time before the lower bound (previous entry's ended_at for start; entry's started_at for stop)
- **THEN** the time is clamped to the lower bound, not set below it

### Requirement: Manual hour:minute input on time picker
The system SHALL allow the user to type or scroll to an arbitrary hour and minute value in the time picker.

#### Scenario: Manual entry accepted within bounds
- **WHEN** the user sets a valid hour:minute that respects the lower bound constraint
- **THEN** the time picker reflects the entered value and allows confirmation

#### Scenario: Manual entry rejected below lower bound
- **WHEN** the user sets a time before the lower bound
- **THEN** the confirm action is disabled or an error is shown inline

### Requirement: Upper bound enforcement on ended_at in edit context
The system SHALL enforce an upper bound on the ended_at time picker when editing a completed entry. The upper bound is the startedAt of the next entry. If no next entry exists the upper bound is unconstrained.

#### Scenario: Ended at clamped to next entry's startedAt
- **WHEN** the user adjusts the ended_at picker to a value at or after the next entry's startedAt
- **THEN** the UI prevents confirmation (disables Save/Stop Task button or shows inline error); the picker value is not clamped automatically

#### Scenario: Offset button respects upper bound
- **WHEN** an offset button on the ended_at picker would push the time past the upper bound
- **THEN** the time is set to the upper bound instead

#### Scenario: No upper bound when no next entry exists
- **WHEN** the entry being edited is the most recent entry and has no successor
- **THEN** no upper bound is applied to the ended_at picker
