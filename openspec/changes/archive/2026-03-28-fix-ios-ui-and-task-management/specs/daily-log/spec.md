## ADDED Requirements

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
