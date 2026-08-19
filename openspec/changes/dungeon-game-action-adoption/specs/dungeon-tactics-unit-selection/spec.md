**App**: dungeon-tactics-solo

## MODIFIED Requirements

### Requirement: PC action bar with active-highlight
While a PC is selected, the popup SHALL present an action bar containing the unit's actions as reported by the engine. The action bar SHALL list every action the engine enumerates for that unit — today **Move** and **Attack** — including actions that are not currently available. An unavailable action SHALL be rendered in a disabled style with the engine's reason shown, rather than being hidden, so the player learns why the unit cannot act. An action button SHALL indicate that it is active by rendering in a highlighted/active style rather than by changing its label. At most one action SHALL be active at a time.

The client SHALL NOT compute an action's availability itself.

#### Scenario: Action bar shows the Attack action
- **WHEN** a PC is selected
- **THEN** the popup SHALL show an action bar containing an Attack button, alongside a Move button, both sourced from the engine's enumeration

#### Scenario: Activating Attack highlights the button and shows attack tiles
- **WHEN** the player taps an available action's button while it is inactive
- **THEN** that button SHALL render in its highlighted/active style
- **AND** the tiles the engine offers as that action's targets SHALL be shown, and any other action's tiles SHALL be hidden

#### Scenario: A spent unit shows both actions disabled with a reason
- **WHEN** a PC that has already attacked this turn is selected
- **THEN** both Move and Attack SHALL be shown in a disabled style
- **AND** the reason reported by the engine SHALL be displayed

#### Scenario: A unit out of movement keeps Attack enabled
- **WHEN** a PC that has spent its full movement but has not attacked is selected
- **THEN** Move SHALL be disabled with the engine's reason and Attack SHALL remain enabled

#### Scenario: Active button keeps its label
- **WHEN** an action is active
- **THEN** the button label SHALL remain the action's name (the active state is shown by highlight, not by relabeling)

### Requirement: Attack-targeting still takes precedence over NPC selection
While a PC's Attack action is active (attack tiles shown), tapping a tile occupied by an NPC SHALL be treated as choosing an attack target, not as selecting that NPC.

The player SHALL aim an attack by choosing a **target tile**, never by choosing a direction. The tiles offered SHALL be exactly those the engine reports as that attack's targets, and committing against one of them SHALL resolve the attack that covers it. A tap on any tile the engine does not offer SHALL cancel the action rather than resolve an attack, including a tile that shares a row or column with the unit but lies beyond the attack's reach.

#### Scenario: Attacking an NPC tile does not select the NPC
- **WHEN** a PC's Attack action is active and the player taps a valid attack-target tile occupied by an NPC
- **THEN** the system SHALL set the attack on that tile and SHALL NOT select the NPC or open the NPC popup

#### Scenario: Aiming at an off-axis tile resolves the attack covering it
- **WHEN** a PC's Attack action is active and the player taps an offered target tile that does not share a row or column with the unit
- **THEN** the attack SHALL resolve over every tile it covers from the unit's position including that tile

#### Scenario: An aligned tile beyond reach cancels rather than attacks
- **WHEN** a PC's Attack action is active and the player taps a tile in line with the unit but further than the attack can reach
- **THEN** no attack SHALL resolve, no damage SHALL be dealt, and the action SHALL be canceled with the unit still selected
