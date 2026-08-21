## MODIFIED Requirements

### Requirement: NPC turn executes immediately in turn order
The NPC phase SHALL process each NPC sequentially in turn order. For each NPC the system SHALL: (1) examine the current board state and decide that NPC's full turn — its move and its intended attack; (2) apply the movement immediately so the NPC's new position is reflected in the board before the next NPC is processed; and (3) store the NPC's intended attack as a telegraphed plan rendered in the Phaser scene. Only after every NPC has moved and stored its attack does control pass to the player. The system SHALL NOT defer NPC movement to a batched playback phase that replays all NPC moves after planning; movement happens per-NPC at decision time.

**The engine SHALL own this sequence.** Which NPC acts next, what it does, and when the phase ends are the engine's to decide; the game SHALL obtain each step from the engine rather than deriving or ordering steps itself. The game remains responsible for *pacing* — animating each step and advancing when that animation completes.

#### Scenario: NPCs processed one at a time in order
- **WHEN** the NPC phase begins
- **THEN** each NPC SHALL be processed in turn order, with its movement applied to the board before the next NPC is examined

#### Scenario: Intended attack is stored and telegraphed after moving
- **WHEN** an NPC finishes moving
- **THEN** its intended attack SHALL be stored and rendered as a telegraph in the Phaser scene, computed from the NPC's post-move position

#### Scenario: No batched NPC move playback
- **WHEN** the NPC phase runs
- **THEN** there SHALL be no separate phase that replays previously-committed NPC movements; each NPC's move is the only time its movement is applied

#### Scenario: The step animated is the step taken
- **WHEN** the game animates an NPC's turn and then advances the round
- **THEN** what is animated SHALL be the step the engine goes on to perform, obtained from the engine before the animation rather than derived alongside it

#### Scenario: The host does not choose the order
- **WHEN** the NPC phase advances
- **THEN** the game SHALL NOT name which NPC acts next; that follows from the engine's round

### Requirement: NPC planned attacks resolve after the player turn
After all NPCs have moved and stored their telegraphed attacks, the player SHALL take their full turn (including existing undo mechanics). When the player ends their turn by clicking done and confirming, the stored NPC attacks SHALL then resolve — unchanged from the existing attack-resolution timing and rules. NPC attack resolution SHALL NOT occur during the NPC movement loop.

Resolution SHALL proceed in the order the attacks were telegraphed, as the engine's round determines, and a telegraph whose NPC has left the board SHALL be skipped rather than resolved. Ending the round and beginning the next NPC phase SHALL follow from the engine's round rather than being arranged by the game.

#### Scenario: Player turn precedes NPC attack resolution
- **WHEN** the NPC phase has completed and every NPC has a telegraphed attack
- **THEN** the player SHALL take their full turn before any NPC attack resolves

#### Scenario: Attacks resolve on player confirm
- **WHEN** the player ends their turn by clicking done and confirming
- **THEN** each NPC's stored planned attack SHALL resolve, applying damage per the existing attack rules and archetype behavior

#### Scenario: Attacks do not resolve during movement
- **WHEN** an NPC moves during the NPC phase
- **THEN** its attack SHALL NOT resolve at that time; only its movement is applied and its attack is stored as a telegraph

#### Scenario: A telegraph whose NPC died is skipped
- **WHEN** an NPC with a telegraphed attack is removed from the board before resolution
- **THEN** its attack SHALL NOT land, and the remaining telegraphs SHALL resolve normally

#### Scenario: The round chains without host arrangement
- **WHEN** the last telegraph has resolved
- **THEN** the round SHALL end and the next NPC phase SHALL begin as a step of the engine's round
