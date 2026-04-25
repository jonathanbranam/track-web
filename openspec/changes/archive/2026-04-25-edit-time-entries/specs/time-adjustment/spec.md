## ADDED Requirements

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
