# dungeon-tactics-turn-sequencer Specification

## Purpose
Defines the engine-owned contract for a round: planning each enemy's turn, executing the planned steps in the order they were planned, and moving between phases. Hosts choose when the next step happens and may choose what an enemy does, but never the order steps execute in or whether a step is legal — so two hosts driving the same board cannot disagree about the round.

## Requirements

### Requirement: Planning an enemy's turn executes its move and locks its attack

The engine SHALL expose an operation that plans one enemy's turn as a single
step: applying its movement immediately so the board reflects the new position,
and storing its intended attack as a telegraph computed from the post-move
position. The engine SHALL record that the enemy's turn is planned.

Planning SHALL be available from three sources, validated identically: the
engine's own AI for the next unplanned enemy, the engine's AI for one named
enemy, and a decision supplied by the host.

#### Scenario: An enemy is planned by the AI

- **WHEN** the next unplanned enemy is planned
- **THEN** its movement is applied to the board, its intended attack is stored as
  a telegraph from its post-move position, and it is recorded as planned

#### Scenario: A host supplies the decision

- **WHEN** a host plans an enemy with a legal move and a legal attack of its own
  choosing
- **THEN** the engine applies them exactly as it would its own AI's decision

#### Scenario: Holding is a legal plan

- **WHEN** a host plans an enemy to stay where it is and not attack
- **THEN** the plan is accepted and the enemy is recorded as planned

#### Scenario: An enemy cannot be planned twice

- **WHEN** an enemy whose turn is already planned this round is planned again
- **THEN** the engine refuses with a reason and changes nothing

#### Scenario: An illegal move is refused

- **WHEN** a host plans an enemy to move beyond its range or through a blocked
  path
- **THEN** the engine refuses with a reason and changes nothing

#### Scenario: An illegal attack is refused

- **WHEN** a host plans an attack on a tile the enemy could not reach from its
  post-move position
- **THEN** the engine refuses with a reason and changes nothing

### Requirement: Turn order is the order enemies are planned in

The engine SHALL treat the sequence in which enemies are planned as the round's
turn order, and SHALL resolve their telegraphs in that same order. The engine
SHALL NOT require a separate ordering step.

#### Scenario: Planning order determines resolution order

- **WHEN** enemies are planned in an order other than the engine's own preferred
  order, and their telegraphs are then resolved
- **THEN** the telegraphs resolve in the order the enemies were planned

#### Scenario: Each enemy is planned against the current board

- **WHEN** one enemy is planned into a tile and another is then planned by the AI
- **THEN** the second enemy's decision accounts for where the first now stands

### Requirement: The engine executes planned steps and hosts choose only the timing

The engine SHALL expose a single operation that performs the next step of the
round. That operation SHALL NOT accept a unit identifier: which step happens next
is determined by the plan, not by the caller. It SHALL execute the next unplanned
enemy's turn during the enemy phase, resolve the next unresolved telegraph during
the resolution phase, and otherwise perform the phase transition.

#### Scenario: Steps execute in planned order

- **WHEN** the round is advanced repeatedly through the resolution phase
- **THEN** each telegraph resolves in the order it was planned

#### Scenario: A telegraph whose owner died is skipped

- **WHEN** an enemy with a locked telegraph is removed from the board before
  resolution and the round is advanced
- **THEN** that enemy's attack does not land and the remaining telegraphs resolve
  normally

#### Scenario: The round cannot leave the enemy phase early

- **WHEN** the round is advanced while a living enemy is still unplanned
- **THEN** the engine plans that enemy rather than transitioning to the player
  phase

### Requirement: The engine reports the next step before it happens

The engine SHALL expose a query reporting what the next step would be — which
enemy would act and with what, or which telegraph would resolve, or which phase
transition would occur — without changing any state. The engine SHALL also report
which enemies remain unplanned, and the telegraph locked for a given enemy.

During the resolution phase, the reported next step SHALL be the plan already
recorded, not a fresh decision.

#### Scenario: The next step matches what advancing does

- **WHEN** the next step is queried and the round is then advanced
- **THEN** what the query reported is what the advance did

#### Scenario: Querying changes nothing

- **WHEN** the next step is queried repeatedly
- **THEN** the board, the plans, and the round's progress are unchanged

#### Scenario: Unplanned enemies are reported

- **WHEN** some enemies have been planned and others have not
- **THEN** the query reports exactly those that have not

### Requirement: Bench-only operations are refused unless the engine is in bench mode

The engine SHALL expose a mode indicating which host is running it, defaulting to
the game. Operations designated bench-only SHALL be refused with a reason unless
the mode has been explicitly set to bench.

#### Scenario: A bench-only operation is refused by default

- **WHEN** a bench-only operation is called without the mode having been set
- **THEN** the engine refuses with a reason and changes nothing

#### Scenario: A bench-only operation is permitted in bench mode

- **WHEN** the mode is set to bench and the same operation is called
- **THEN** it is evaluated on its own merits rather than refused for the mode

### Requirement: A locked telegraph can be amended in bench mode

The engine SHALL allow a locked telegraph to be retargeted after it was locked
and before it resolves, as a bench-only operation. The amended attack SHALL be
validated from the enemy's current post-move position. Amending SHALL NOT undo
the enemy's executed movement.

#### Scenario: A telegraph is retargeted

- **WHEN** a locked telegraph is amended to a different legal tile in bench mode
- **THEN** the stored telegraph names the new tile and resolves against it

#### Scenario: An illegal amendment is refused

- **WHEN** a telegraph is amended to a tile the enemy cannot reach from where it
  stands
- **THEN** the engine refuses with a reason and the original telegraph is
  unchanged

#### Scenario: Amending does not move the enemy

- **WHEN** a telegraph is amended
- **THEN** the enemy remains exactly where its executed move left it

#### Scenario: A dead enemy has no telegraph to amend

- **WHEN** an amendment names an enemy no longer on the board
- **THEN** the engine refuses with a reason and changes nothing

### Requirement: Refusals are human-readable text

Every refusal from a sequencer operation SHALL carry a reason written as plain
English naming what was attempted and why it was not allowed, suitable for
display to a player or a designer without rewording.

#### Scenario: A refusal explains itself

- **WHEN** any sequencer operation is refused
- **THEN** the reason is a complete sentence that names the unit and the
  condition, rather than an error code or identifier

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
