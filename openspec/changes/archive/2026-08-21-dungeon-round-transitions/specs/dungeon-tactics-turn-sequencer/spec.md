## ADDED Requirements

### Requirement: The engine performs every phase transition, including the two a host triggers

Two of the round's transitions are not steps of the enemy phase and cannot be
reached by advancing the round: leaving the placement phase, and ending the
player's turn. Both are triggered by a host decision.

The engine SHALL expose an operation for each, and those operations SHALL be the
only way the transition happens. A host SHALL decide *when* each is called; it
SHALL NOT decide what the transition does.

Each operation SHALL clear the current unit selection and any armed action, so
that the phase a round enters never carries a stale selection from the phase it
left.

#### Scenario: Leaving placement starts the enemy phase

- **WHEN** the scenario is started while the round is in the placement phase
- **THEN** the round is in the enemy movement phase, with no unit selected and no
  action armed

#### Scenario: Ending the player's turn resolves telegraphs next

- **WHEN** the player's turn is ended while the round is in the player phase
- **THEN** the round is in the telegraph resolution phase, with no unit selected
  and no action armed

#### Scenario: A stale selection does not survive the transition

- **WHEN** a unit is selected with an action armed and the player's turn is then
  ended
- **THEN** the resulting state has no unit selected and no action armed

### Requirement: A host-triggered transition is refused out of phase

Each of the two host-triggered transitions SHALL be refused, with a
human-readable reason, when the round is not in the phase it leaves. The state
SHALL be unchanged when refused.

#### Scenario: The scenario cannot be started twice

- **WHEN** the scenario is started while the round is already past placement
- **THEN** the engine refuses with a reason and nothing changes

#### Scenario: The player's turn cannot be ended out of turn

- **WHEN** the player's turn is ended while the round is resolving telegraphs
- **THEN** the engine refuses with a reason and nothing changes

#### Scenario: Ending the turn names the enemies still unplanned

- **WHEN** the player's turn is ended while the round is still in the enemy
  movement phase with enemies that have no plan
- **THEN** the refusal names those enemies, rather than only reporting the wrong
  phase
