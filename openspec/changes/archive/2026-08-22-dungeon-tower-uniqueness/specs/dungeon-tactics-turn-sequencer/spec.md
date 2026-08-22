## ADDED Requirements

### Requirement: A scenario cannot be started without a tower

Starting the scenario SHALL be refused, with a human-readable reason, when the
board holds no tower. A board with no tower is a finished game, not a startable
one, and the state SHALL be unchanged when refused.

This SHALL hold for **every** host. A design bench and the game start the same
scenario under the same precondition; the engine mode that fences bench-only
authoring does not fence this.

The precondition SHALL be checked only at the moment of starting. Authoring may
pass through a towerless board — removing a misplaced tower to place it
elsewhere is an ordinary edit — so nothing in the setup surface refuses on this
ground.

#### Scenario: Starting a towerless scenario is refused

- **WHEN** the scenario is started while the round is in the placement phase and
  the board holds no tower
- **THEN** the engine refuses with a reason, and nothing changes

#### Scenario: A design bench is not exempt

- **WHEN** the same start is attempted with the engine in bench mode
- **THEN** it is still refused, for the same reason

#### Scenario: A board with a tower starts normally

- **WHEN** the scenario is started from placement with a tower on the board
- **THEN** the round is in the enemy movement phase, exactly as before

#### Scenario: Removing the tower during setup is not itself refused

- **WHEN** the only tower is removed while the round is in the placement phase
- **THEN** the removal succeeds, and only the subsequent attempt to start the
  scenario is refused
