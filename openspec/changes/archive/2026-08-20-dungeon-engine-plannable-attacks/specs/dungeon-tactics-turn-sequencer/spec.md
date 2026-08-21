## ADDED Requirements

### Requirement: The engine reports what an enemy could attack after a proposed move

The engine SHALL report which tiles an enemy could attack if it made a given
move, without changing any state. The move SHALL be expressed the same way a
host authors one when planning an enemy's turn, including choosing not to move.

The reported tiles SHALL be exactly those an authored plan combining that move
and that attack would be allowed to use, so a host cannot offer a target the
commit would then refuse.

#### Scenario: Targets are reported for a proposed move

- **WHEN** the engine is asked what an enemy could attack after moving to a
  reachable tile
- **THEN** it reports the tiles attackable from that tile, not from where the
  enemy currently stands

#### Scenario: Targets are reported for staying put

- **WHEN** the engine is asked what an enemy could attack if it does not move
- **THEN** it reports the tiles attackable from its current position

#### Scenario: Reported targets are exactly what planning accepts

- **WHEN** a plan is authored combining the proposed move with one of the
  reported tiles
- **THEN** the plan is accepted

#### Scenario: An unreported tile is refused by planning

- **WHEN** a plan is authored combining the proposed move with a tile that was
  not reported
- **THEN** the plan is refused

#### Scenario: Querying changes nothing

- **WHEN** the query is made repeatedly
- **THEN** the board, the plans, and the round's progress are unchanged

#### Scenario: An illegal move has no targets

- **WHEN** the engine is asked what an enemy could attack after a move it could
  not legally make
- **THEN** it reports no tiles
