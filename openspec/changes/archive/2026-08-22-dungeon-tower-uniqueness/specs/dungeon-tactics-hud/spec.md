## MODIFIED Requirements

### Requirement: Status pill reflects the current phase
The HUD SHALL display a status pill whose text reflects the current game phase: the placement prompt during unit placement, the PC-action label during the player phase, and the enemy-action label during NPC playback.

When starting the scenario has been refused by the engine, the status pill SHALL show the engine's reason in place of the phase text, until the scenario is started successfully.

#### Scenario: Placement phase
- **WHEN** the game is in the unit-placement phase
- **THEN** the status pill shows the placement prompt ("Place your units")

#### Scenario: Player phase
- **WHEN** it is the player's turn to act
- **THEN** the status pill shows the PC-actions label

#### Scenario: Enemy phase
- **WHEN** NPC actions are being played back
- **THEN** the status pill shows the enemy-actions label

#### Scenario: A refused start is reported
- **WHEN** the engine refuses to start the scenario
- **THEN** the status pill shows the engine's reason instead of the placement prompt

#### Scenario: The reason clears on a successful start
- **WHEN** the scenario is started successfully after a refusal
- **THEN** the status pill no longer shows the reason and reflects the new phase

### Requirement: Placement Start control
During the unit-placement phase the HUD SHALL present a Start control that begins the first player turn. The control SHALL NOT be present outside the placement phase.

Activating Start SHALL ask the engine to start the scenario. The control SHALL NOT decide for itself whether starting is allowed, and SHALL remain present and activatable when the engine would refuse, so that the reason is reachable rather than hidden behind a disabled control.

#### Scenario: Start from placement
- **WHEN** the user is in the placement phase and activates Start
- **THEN** placement ends and the first player turn begins

#### Scenario: Start hidden outside placement
- **WHEN** the game is not in the placement phase
- **THEN** the Start control is not shown

#### Scenario: Start is not silently inert when refused
- **WHEN** the user activates Start and the engine refuses
- **THEN** the game stays in the placement phase and the refusal is reported to the user
