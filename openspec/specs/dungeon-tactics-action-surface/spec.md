# dungeon-tactics-action-surface Specification

## Purpose
Defines the engine-owned contract for driving a unit: enumerating the actions a unit may take with the tiles a host is allowed to offer, previewing what an action would do before it is committed, and committing an action through engine validation rather than host trust. This is the only supported way for a host to act on a unit, so a host cannot decide legality differently from the game.

## Requirements

### Requirement: The engine enumerates a unit's available actions
The engine SHALL expose a query returning every action a unit could take from the current state. The result SHALL include actions that are not currently available, each marked unavailable with a human-readable reason, so a host can render a disabled control with an explanation rather than hiding it. Today the enumerated actions SHALL be move and attack.

Each enumerated action SHALL carry: a stable identifier, a display label, its availability, a reason when unavailable, the kind of selection the host must collect from the player, the complete set of tiles the host may offer as targets, and a presentation-neutral hint for how those tiles should be painted.

#### Scenario: An unmoved PC with an enemy in range offers both actions
- **WHEN** available actions are queried for a PC that has neither moved nor attacked this turn and has at least one tile in attack range
- **THEN** both a move action and an attack action SHALL be returned, both marked available, each with a non-empty set of target tiles

#### Scenario: A PC that has attacked offers both actions as unavailable
- **WHEN** available actions are queried for a PC that has already attacked this turn
- **THEN** both actions SHALL be returned marked unavailable, each with a reason stating the unit has already attacked, and each with an empty set of target tiles

#### Scenario: A PC with no movement left cannot move but may still attack
- **WHEN** available actions are queried for a PC that has spent its full movement this turn but has not attacked
- **THEN** the move action SHALL be unavailable with a reason stating no movement remains, and the attack action SHALL remain available

#### Scenario: Move targets are exactly the engine's reachable tiles
- **WHEN** a move action is returned as available for a unit
- **THEN** its target tiles SHALL be exactly the destinations the engine considers reachable within the unit's remaining movement

### Requirement: Actions are committed against a tile, never a direction
A host SHALL commit an action by naming the unit, the action, and a single target tile. The engine SHALL derive any internal notion of direction from that tile. No direction SHALL appear in the action surface, so a host cannot present a direction-based control for an attack the game targets by tile.

An attack's target tiles SHALL be the union of every tile the attack could cover from the unit's position in any direction, so a host that renders the offered tiles reproduces the game's targeting without knowing how the attack propagates.

#### Scenario: A cross-shaped attack offers every covered tile
- **WHEN** available actions are queried for a unit whose attack covers a tile and its orthogonal neighbours at a fixed range
- **THEN** the attack's target tiles SHALL include the off-axis neighbours, not only the four tiles directly ahead of the unit in each direction

#### Scenario: Committing against an off-axis tile resolves the attack that covers it
- **WHEN** an attack is committed against a target tile that lies off the unit's axes but within the attack's coverage
- **THEN** the attack SHALL resolve over the full set of tiles covered by the attack that includes the committed tile

### Requirement: The engine validates a committed action rather than trusting it
The engine SHALL re-derive an action's legality when it is committed and SHALL reject anything it did not offer. Rejection SHALL leave the game state unchanged and SHALL return a human-readable reason. A commit SHALL NOT throw, and SHALL NOT silently return the state unmodified without a reason.

Validation SHALL cover at minimum: that the unit exists, that the action is currently available for that unit, that the target tile is one of the offered targets, that a move is within the unit's remaining movement and has a path, and that a unit that has already attacked cannot act again.

#### Scenario: A target outside the offered set is rejected
- **WHEN** an action is committed against a tile that is not among the action's target tiles
- **THEN** the commit SHALL be rejected with a reason, and the game state SHALL be unchanged

#### Scenario: An out-of-range tile aligned with the unit is rejected
- **WHEN** an attack is committed against a tile that shares a row or column with the unit but lies beyond the attack's coverage
- **THEN** the commit SHALL be rejected, and no damage SHALL be dealt to any tile

#### Scenario: A second attack in one turn is rejected
- **WHEN** an attack is committed for a unit that has already attacked this turn
- **THEN** the commit SHALL be rejected with a reason stating the unit has already attacked

#### Scenario: A move beyond the remaining budget is rejected
- **WHEN** a move is committed to a tile further than the unit's remaining movement allows
- **THEN** the commit SHALL be rejected and the unit SHALL NOT change position

#### Scenario: An accepted commit applies the action
- **WHEN** an action is committed against one of its offered target tiles
- **THEN** the commit SHALL return the resulting game state with the action applied, charging any movement spent against the unit's turn budget

### Requirement: The engine previews an action's effects before commitment
The engine SHALL expose a preview for a unit, action, and candidate target tile, returning the tiles the action would resolve against, the movement it would consume, and the effect on each affected tile. A preview SHALL NOT modify game state.

An effect SHALL identify what it does, not merely how much damage it deals, so that effects which do not deal damage can be represented without reshaping the contract. A preview SHALL report explicitly when an action covers tiles but produces no effect at all.

#### Scenario: Previewing an attack reports the tiles it would damage
- **WHEN** an attack is previewed against a target tile with an enemy standing on it
- **THEN** the preview SHALL list the affected tiles and SHALL report a damage effect naming the enemy and the amount

#### Scenario: Previewing a move reports its cost
- **WHEN** a move is previewed to a reachable tile
- **THEN** the preview SHALL report the number of tiles of movement the move would consume

#### Scenario: An attack that hits nothing is previewed as such
- **WHEN** an attack is previewed against a target tile where the attack would affect no unit and no structure
- **THEN** the preview SHALL report that it hits nothing, and SHALL list the covered tiles

### Requirement: An action that would have no effect remains available
An attack SHALL remain available and committable when it would hit nothing. Whether an action produces an effect SHALL NOT determine whether it is offered, so that attacks whose purpose is something other than damage remain expressible.

#### Scenario: Empty tiles are offered as attack targets
- **WHEN** available actions are queried for a unit whose attack range contains only empty tiles
- **THEN** the attack SHALL be returned as available with those tiles as targets

#### Scenario: Committing an attack that hits nothing succeeds
- **WHEN** an attack is committed against a tile where it affects no unit and no structure
- **THEN** the commit SHALL succeed, and the unit SHALL be locked for the turn as any attack locks it

### Requirement: Rejection and unavailability reasons are human-readable text
Reasons returned for an unavailable action or a rejected commit SHALL be plain English suitable for display to a player or designer without translation, and suitable for relaying verbatim by an agent-facing tool.

#### Scenario: A reason is displayable as given
- **WHEN** an action is unavailable or a commit is rejected
- **THEN** the accompanying reason SHALL be a complete, human-readable phrase requiring no lookup table to render
