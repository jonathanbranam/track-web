## ADDED Requirements

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
The system SHALL provide quick-offset buttons on both start and stop time pickers. Each button snaps the displayed time back to the previous boundary of its increment — the largest multiple of that increment strictly less than the current displayed time. Pressing repeatedly continues stepping back by one boundary interval each tap.

#### Scenario: -5m button snaps to previous 5-minute boundary
- **WHEN** the displayed time is 8:28am and the user taps -5m
- **THEN** the displayed time becomes 8:25am (not 8:23am)

#### Scenario: -5m button pressed repeatedly
- **WHEN** starting from 8:28am and the user taps -5m three times
- **THEN** the time steps 8:25 → 8:20 → 8:15

#### Scenario: -10m button snaps to previous 10-minute boundary
- **WHEN** the displayed time is 8:28am and the user taps -10m
- **THEN** the displayed time becomes 8:20am (not 8:18am)

#### Scenario: -10m button pressed repeatedly
- **WHEN** starting from 8:28am and the user taps -10m three times
- **THEN** the time steps 8:20 → 8:10 → 8:00

#### Scenario: -30m button snaps to previous 30-minute boundary
- **WHEN** the displayed time is 8:28am and the user taps -30m
- **THEN** the displayed time becomes 8:00am (not 7:58am)

#### Scenario: -30m button pressed repeatedly
- **WHEN** starting from 8:28am and the user taps -30m three times
- **THEN** the time steps 8:00 → 7:30 → 7:00

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
