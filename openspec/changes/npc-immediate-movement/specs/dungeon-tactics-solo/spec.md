**App**: dungeon-tactics-solo

## ADDED Requirements

### Requirement: NPC turn executes immediately in turn order
The NPC phase SHALL process each NPC sequentially in turn order. For each NPC the system SHALL: (1) examine the current board state and decide that NPC's full turn — its move and its intended attack; (2) apply the movement immediately so the NPC's new position is reflected in the board before the next NPC is processed; and (3) store the NPC's intended attack as a telegraphed plan rendered in the Phaser scene. Only after every NPC has moved and stored its attack does control pass to the player. The system SHALL NOT defer NPC movement to a batched playback phase that replays all NPC moves after planning; movement happens per-NPC at decision time.

#### Scenario: NPCs processed one at a time in order
- **WHEN** the NPC phase begins
- **THEN** each NPC SHALL be processed in turn order, with its movement applied to the board before the next NPC is examined

#### Scenario: Intended attack is stored and telegraphed after moving
- **WHEN** an NPC finishes moving
- **THEN** its intended attack SHALL be stored and rendered as a telegraph in the Phaser scene, computed from the NPC's post-move position

#### Scenario: No batched NPC move playback
- **WHEN** the NPC phase runs
- **THEN** there SHALL be no separate phase that replays previously-committed NPC movements; each NPC's move is the only time its movement is applied

### Requirement: NPC planned attacks resolve after the player turn
After all NPCs have moved and stored their telegraphed attacks, the player SHALL take their full turn (including existing undo mechanics). When the player ends their turn by clicking done and confirming, the stored NPC attacks SHALL then resolve — unchanged from the existing attack-resolution timing and rules. NPC attack resolution SHALL NOT occur during the NPC movement loop.

#### Scenario: Player turn precedes NPC attack resolution
- **WHEN** the NPC phase has completed and every NPC has a telegraphed attack
- **THEN** the player SHALL take their full turn before any NPC attack resolves

#### Scenario: Attacks resolve on player confirm
- **WHEN** the player ends their turn by clicking done and confirming
- **THEN** each NPC's stored planned attack SHALL resolve, applying damage per the existing attack rules and archetype behavior

#### Scenario: Attacks do not resolve during movement
- **WHEN** an NPC moves during the NPC phase
- **THEN** its attack SHALL NOT resolve at that time; only its movement is applied and its attack is stored as a telegraph
