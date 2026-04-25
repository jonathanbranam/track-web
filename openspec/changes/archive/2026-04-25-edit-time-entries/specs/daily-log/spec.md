## ADDED Requirements

### Requirement: Swipe-right to edit completed log entry
The system SHALL allow the user to open an inline edit form for a completed log entry by swiping right on its row. Right-swipe and left-swipe (delete) use the same pointer-event gesture system with the same 80px threshold and scroll-vs-swipe disambiguation. Only one row may be in edit or delete state at a time; opening a new edit or delete row cancels any other open row.

#### Scenario: Swipe right past threshold opens edit form
- **WHEN** the user drags a completed log entry more than 80px to the right
- **THEN** the row transitions to the inline edit form for that entry

#### Scenario: Swipe right below threshold snaps back
- **WHEN** the user drags a completed log entry to the right but releases before 80px
- **THEN** the row snaps back to its normal position and no edit form is shown

#### Scenario: Opening edit row closes any open delete confirmation
- **WHEN** a delete confirmation is open for one row and the user swipes right on a different row
- **THEN** the delete confirmation is dismissed and the edit form opens on the swiped row

#### Scenario: Opening delete row closes any open edit form
- **WHEN** an edit form is open for one row and the user swipes left on a different row
- **THEN** the edit form is dismissed and the delete confirmation opens on the swiped row
