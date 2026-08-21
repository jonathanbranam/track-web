## ADDED Requirements

### Requirement: A unit may only act during the player phase, except in bench mode

The engine SHALL report a unit's actions as unavailable, with a reason, whenever
the round is not in the player phase — so that acting out of turn is refused by
the engine rather than prevented only by which controls a host chooses to render.

**In bench mode this restriction SHALL NOT apply.** Driving either side out of
sequence is a deliberate capability of the design bench, not an accident, and it
is fenced by the same engine mode that fences retargeting a locked telegraph.

#### Scenario: Acting outside the player phase is refused

- **WHEN** available actions are queried for a unit while the round is resolving
  enemy attacks, and the engine is not in bench mode
- **THEN** every action is returned unavailable, with a reason stating it is not
  the player's turn, and with no target tiles

#### Scenario: Committing outside the player phase is refused

- **WHEN** an action is committed for a unit while the round is not in the player
  phase, and the engine is not in bench mode
- **THEN** the engine refuses with that reason and nothing changes

#### Scenario: The bench may act out of sequence

- **WHEN** the same query is made in bench mode
- **THEN** the unit's actions are judged on their own merits, as they were before
  this restriction existed

### Requirement: An enemy spent by one route cannot act again by the other

An enemy's turn SHALL be spendable once per round, whichever route spends it.
An enemy that has already been planned SHALL have its actions reported
unavailable, with a reason, and a commit against it SHALL be refused.

#### Scenario: A planned enemy cannot then be driven directly

- **WHEN** an enemy whose turn has been planned this round is asked for its
  available actions
- **THEN** they are returned unavailable with a reason stating its turn is
  already spent

#### Scenario: Committing against a planned enemy is refused

- **WHEN** an action is committed for an enemy whose turn has been planned this
  round
- **THEN** the engine refuses with that reason and nothing changes

#### Scenario: A player character is unaffected

- **WHEN** a PC is asked for its available actions during the player phase
- **THEN** the enemy-planning record does not restrict it
