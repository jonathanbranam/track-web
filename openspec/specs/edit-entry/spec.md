## Purpose

Defines the edit interface and workflow for modifying a running or completed time entry (description, start time, end time). Covers the inline edit form component, its three contexts (running, stopping, completed), and the actions available in each.

## Requirements

### Requirement: Edit running entry from home screen
The system SHALL allow the user to edit the currently running entry by tapping a pencil icon on the running task card. The edit view replaces the card inline and presents a description field and a started-at time picker (with offset buttons). The only actions are Save and Cancel.

#### Scenario: Pencil icon opens edit view
- **WHEN** the user taps the pencil icon on the running task card
- **THEN** the card transitions to an edit view showing the current description pre-filled, the started-at time picker pre-filled with the entry's current started_at, and two buttons: Save and Cancel

#### Scenario: Save patches description and start time
- **WHEN** the user edits the description and/or start time and taps Save
- **THEN** PATCH /api/entries/:id is called with the updated description and startedAt; the entry remains running; the card returns to the normal running view showing the updated values

#### Scenario: Cancel discards changes
- **WHEN** the user taps Cancel in the running edit view
- **THEN** no API call is made and the card returns to the normal running view

#### Scenario: Save disabled when start time violates lower bound
- **WHEN** the user sets the started_at to a value earlier than the previous entry's ended_at
- **THEN** the Save button is disabled and an inline error is shown

### Requirement: Edit from stop screen
The system SHALL allow the user to edit a running entry's description, start time, and a prospective end time before stopping. A pencil icon in the upper-right of the stop screen header opens edit mode. Edit mode has no pencil icon in its header. Cancel and Stop Task are displayed side by side.

#### Scenario: Pencil icon in stop screen opens edit mode
- **WHEN** the user taps the pencil icon in the stop screen header
- **THEN** the view transitions to edit mode showing: "Edit Task" header (no pencil icon), description field, Started at picker (no offset buttons), Save & Keep Running button (full-width, indigo), a visual divider, Ended at picker (with offset buttons), and Cancel | Stop Task side by side

#### Scenario: Started at picker has no offset buttons in stop-edit mode
- **WHEN** the edit view is shown in stopping context
- **THEN** the Started at section shows only the time display and manual time input — no -5m/-10m/-30m offset buttons

#### Scenario: Save & Keep Running saves description and start time only
- **WHEN** the user taps Save & Keep Running in stop-edit mode (regardless of Ended at value)
- **THEN** PATCH /api/entries/:id is called with description and startedAt only; the entry remains running; the view returns to the normal running card

#### Scenario: Stop Task saves all fields and stops the entry
- **WHEN** the user taps Stop Task in stop-edit mode
- **THEN** PATCH /api/entries/:id is called with description, startedAt, and endedAt; the entry is stopped; the app transitions to the start-task view

#### Scenario: Cancel in stop-edit mode returns to running card
- **WHEN** the user taps Cancel in stop-edit mode
- **THEN** no API call is made and the view returns to the normal running card (not the stop screen)

#### Scenario: Stop Task disabled when Ended at is before Started at
- **WHEN** the user sets the Ended at to a value before the Started at
- **THEN** the Stop Task button is disabled and an inline error is shown

### Requirement: Edit completed entry from daily log
The system SHALL allow the user to edit a completed entry by swiping right on its row in the daily log. The edit form is rendered inline and shows description, started-at, and ended-at fields. The actions are Save and Cancel.

#### Scenario: Edit form opens pre-filled
- **WHEN** the user swipes right on a completed log entry (per the gesture threshold defined in daily-log)
- **THEN** the row transitions to an inline edit form pre-filled with the entry's current description, started_at, and ended_at

#### Scenario: Save patches all edited fields
- **WHEN** the user edits one or more fields and taps Save
- **THEN** PATCH /api/entries/:id is called with the updated values; the row returns to the normal display showing the updated values

#### Scenario: Cancel discards changes
- **WHEN** the user taps Cancel in the completed edit form
- **THEN** no API call is made and the row returns to its normal display

#### Scenario: Save disabled when constraints are violated
- **WHEN** the started_at is before the previous entry's ended_at, or the ended_at is after the next entry's started_at, or ended_at is before started_at
- **THEN** the Save button is disabled and the violated constraint is indicated inline

#### Scenario: API error on save shows error message
- **WHEN** PATCH returns a 422 error
- **THEN** the edit form remains open and displays the server error message
