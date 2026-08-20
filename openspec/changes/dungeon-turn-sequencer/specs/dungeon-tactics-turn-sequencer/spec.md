## Purpose

Defines the engine-owned contract for a round: planning each enemy's turn, executing the planned steps in the order they were planned, and moving between phases. Hosts choose when the next step happens and may choose what an enemy does, but never the order steps execute in or whether a step is legal — so two hosts driving the same board cannot disagree about the round.

## ADDED Requirements

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
