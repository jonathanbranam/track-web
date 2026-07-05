**App**: talks

## ADDED Requirements

### Requirement: Real, authored status screen via showStatus
The system SHALL provide a `showStatus` action carrying a target entity id and an authored `stats` payload (`level`, optional `role`, `hp`, `maxHp`), which opens the on-rails status screen (established by the `ui-overlay` capability) showing that entity's real stat values in place of placeholder text. `showStatus` replaces `showMenu`'s `menuKind: 'status'` variant as the way to open the status screen.

#### Scenario: showStatus renders real stat content
- **WHEN** a `showStatus` action executes with an entity id and an authored `stats` payload
- **THEN** the status screen renders that entity's level, role (when present), and current/max HP as real values, not placeholder text

#### Scenario: showStatus supports an optional footer command list
- **WHEN** a `showStatus` action executes with an `options` list
- **THEN** the status screen renders those options below the stat display with a movable selection highlight, using the same mechanism `showMenu`'s command variant already established

### Requirement: levelUp fanfare narration
The system SHALL provide a `levelUp` action carrying a target entity id and an authored narration `text`, which displays that text via the existing dialogue-box mechanism — the same reuse pattern `battleAction`'s narration already established. `levelUp` SHALL NOT mutate any persistent stat value; any stat change it represents is authored directly into a subsequent `showStatus` call.

#### Scenario: levelUp shows narration text
- **WHEN** a `levelUp` action executes with authored text
- **THEN** the dialogue box displays that text, identical in mechanism to a `say` action

### Requirement: Stats are authored per action, not a persistent model
The system SHALL treat every entity's stats as data carried inline on the `showStatus` action that displays them, not as a stored, mutable resting-state record. Two `showStatus` calls for the same entity at different points in the script MAY show different values; the system SHALL NOT require or provide any mechanism to keep them consistent automatically.

#### Scenario: Two showStatus calls show independently authored values
- **WHEN** a script calls `showStatus` for the same entity twice, with different authored `stats` payloads
- **THEN** each call renders exactly the stats authored on that call, with no value inherited or computed from the other call
