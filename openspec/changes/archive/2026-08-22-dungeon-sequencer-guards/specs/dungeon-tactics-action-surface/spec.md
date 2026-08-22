## ADDED Requirements

### Requirement: A unit may only act during the player phase

The engine SHALL report a unit's actions as unavailable, with a reason, whenever
the round is not in the player phase — so that acting out of turn is refused by
the engine rather than prevented only by which controls a host chooses to render.

This SHALL hold for **every** host. A design bench plays the same round, in the
same order, as the game. The engine mode that fences retargeting a locked
telegraph does not fence this, and no host may opt out of it.

#### Scenario: Acting outside the player phase is refused

- **WHEN** available actions are queried for a unit while the round is resolving
  enemy attacks
- **THEN** every action is returned unavailable, with a reason stating it is not
  the player's turn, and with no target tiles

#### Scenario: Committing outside the player phase is refused

- **WHEN** an action is committed for a unit while the round is not in the player
  phase
- **THEN** the engine refuses with that reason and nothing changes

#### Scenario: A design bench is not exempt

- **WHEN** the same query is made with the engine in bench mode
- **THEN** the actions are still returned unavailable, for the same reason

### Requirement: The action surface is the player's, and only the player's

The engine SHALL report every action of an enemy unit as unavailable, with a
reason, in every phase. An enemy's single route into a round is being planned —
the seat the game's AI occupies, and the same seat a designer occupies when
planning an enemy by hand.

This is not an ordering rule with a wider scope. Committing an attack through the
action surface **resolves its damage immediately**, whereas an enemy attack in
this game is always a telegraph: locked during the enemy's move phase, resolved
after the player has had a turn to answer it. Driving an enemy through the action
surface would therefore produce an attack the game itself can never produce.

#### Scenario: An enemy has no actions of its own

- **WHEN** available actions are queried for an enemy unit during the player
  phase
- **THEN** every action is returned unavailable, with a reason stating that an
  enemy takes its turn by being planned, and with no target tiles

#### Scenario: Committing an action for an enemy is refused

- **WHEN** an action is committed for an enemy unit
- **THEN** the engine refuses with that reason and nothing changes

#### Scenario: A player character is unaffected

- **WHEN** a PC is asked for its available actions during the player phase
- **THEN** it is judged on its own merits — movement spent, whether it has
  attacked, and what is in range
