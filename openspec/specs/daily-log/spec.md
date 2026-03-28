## Purpose

Defines how the app determines what constitutes "today" (4am–4am US/Eastern boundary) and displays completed time entries for the current day beneath the running task.

## Requirements

### Requirement: Day boundary at 4am US/Eastern
The system SHALL define a "day" as the 24-hour period beginning at 4:00am US/Eastern time and ending at 3:59:59am the following calendar day. All entry queries scoped to a date SHALL use this boundary. All timestamps SHALL be stored in UTC internally.

#### Scenario: Entry at 3:59am belongs to previous day
- **WHEN** an entry has started_at of 3:59am Eastern on a given calendar date
- **THEN** it is included in the log for the previous calendar date

#### Scenario: Entry at 4:00am belongs to current day
- **WHEN** an entry has started_at of 4:00am Eastern on a given calendar date
- **THEN** it is included in the log for that calendar date

#### Scenario: DST transition handled correctly
- **WHEN** the day boundary falls during a DST transition
- **THEN** the system uses the America/New_York timezone rules to compute the correct UTC boundary

### Requirement: Today's log view
The system SHALL display a list of all completed time entries for the current day (4am–4am Eastern boundary) beneath the running task on the home screen.

#### Scenario: Completed entries shown in chronological order
- **WHEN** the today's log section is rendered
- **THEN** entries are displayed oldest-first with description, tag chips, start time, end time, and formatted duration

#### Scenario: Duration displayed as hours and minutes
- **WHEN** an entry has a duration of 90 minutes
- **THEN** the duration is shown as "1h 30m"

#### Scenario: Running entry not shown in log
- **WHEN** a task is currently running
- **THEN** it appears only in the running task display, not in the log list

#### Scenario: Empty log state
- **WHEN** no entries exist for the current day
- **THEN** the log section shows an empty state message (e.g., "No entries yet today")

### Requirement: Date-scoped entry retrieval API
The system SHALL accept a date parameter on GET /api/entries to return entries for a specific day using the 4am Eastern boundary.

#### Scenario: Default to today
- **WHEN** GET /api/entries is called without a date parameter
- **THEN** entries for the current day (by Eastern 4am boundary) are returned

#### Scenario: Specific date query
- **WHEN** GET /api/entries?date=2025-06-15 is called
- **THEN** entries with started_at between 4am Eastern on 2025-06-15 and 4am Eastern on 2025-06-16 are returned

### Requirement: Swipe-to-delete completed log entries
The system SHALL allow the user to delete a completed entry from the daily log by swiping left on its row to reveal a Delete action, then confirming inline. Deletion is optimistic and reverts on error.

#### Scenario: Swipe reveals delete action
- **WHEN** the user drags a log entry row more than 80px to the left
- **THEN** a red Delete button is revealed underneath the row

#### Scenario: Inline confirmation before delete
- **WHEN** the user releases the swipe past the threshold
- **THEN** an inline confirmation row replaces the entry with Yes and Cancel options

#### Scenario: Confirming delete removes entry
- **WHEN** the user taps Yes on the confirmation row
- **THEN** the entry is removed optimistically from the list and `DELETE /api/entries/:id` is called; on error the entry is restored

#### Scenario: Cancelling swipe restores row
- **WHEN** the user taps Cancel on the confirmation row
- **THEN** the entry is restored in the list and no API call is made
