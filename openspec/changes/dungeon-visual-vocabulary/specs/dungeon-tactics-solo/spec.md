## ADDED Requirements

### Requirement: The game renders from the engine's shared vocabulary

The game SHALL take every shared visual value — terrain fills, structure fills and the
tower's cross, unit fills, piece shapes, outline and selection colours, move and attack
overlay colours, and HP pip colours and geometry — from the engine's exported visual
vocabulary, and SHALL NOT declare its own constant for any of them.

What the game draws SHALL NOT change appearance as a result: every shared value in the
vocabulary is the value the game already used.

Presentation the game alone owns — enemy spawner markers, attack projectiles, damage
flashes, and animation timing — SHALL remain the game's, because the vocabulary is what the
hosts share rather than everything either one draws.

#### Scenario: The board looks the same after the extraction

- **WHEN** the game renders a board of terrain, structures, and units of both sides
- **THEN** every terrain fill, structure fill, unit fill, overlay colour, and HP pip is the
  colour it was before the vocabulary was extracted

#### Scenario: The game holds no shared colour of its own

- **WHEN** the game's rendering modules are read
- **THEN** no colour constant remains in them for anything the engine's vocabulary names

#### Scenario: The game keeps its own presentation

- **WHEN** the game draws a spawner marker, an attack projectile, or a damage flash
- **THEN** it uses its own colours, which the vocabulary does not carry

### Requirement: A unit carries its archetype's initial

Every unit SHALL be drawn with its archetype's display initial overlaid on its token, taken
from the engine's vocabulary, so that a unit's archetype can be read without relying on
colour alone.

The initial SHALL be positioned so that it does not collide with the turn-order label the
unit already carries.

#### Scenario: A PC shows its archetype initial

- **WHEN** a magic-user PC is drawn
- **THEN** its token carries that archetype's initial from the engine's vocabulary

#### Scenario: An enemy shows its archetype initial

- **WHEN** a long-range enemy is drawn
- **THEN** its token carries that archetype's initial from the engine's vocabulary

#### Scenario: The initial and the turn-order label are both readable

- **WHEN** a unit that has a turn-order label is drawn
- **THEN** both the label and the archetype initial are visible, neither drawn over the other

### Requirement: A unit's outline says whose side the round is soliciting

An unselected unit's outline SHALL read as live when the round is soliciting that unit's
side and the game offers that side a seat, and as idle otherwise, using the vocabulary's
live and idle colours.

The game seats the player's side only. An enemy SHALL therefore read as idle in every
phase, and a PC SHALL read as live only during the player's own turn.

The game SHALL derive this from the engine's published phase-to-side mapping and SHALL NOT
work out whose turn it is for itself. It SHALL NOT consult whether a particular unit could
legally act: the outline reports whose side is live, which is a different and broader
question, and it SHALL NOT change what tapping a unit does.

A selected unit SHALL instead be marked with the vocabulary's selection treatment — a
yellow ring with a black ring outside it — which replaces the live/idle outline on that
piece rather than stacking with it. The black backing exists so the mark survives being
drawn against a pale tile or a pale unit fill.

#### Scenario: A PC on its own turn reads as live

- **WHEN** the round is in the player phase and an unselected PC is drawn
- **THEN** its outline is the vocabulary's live colour

#### Scenario: An enemy reads as idle in the player phase

- **WHEN** the round is in the player phase and an enemy is drawn
- **THEN** its outline is the vocabulary's idle colour

#### Scenario: Nothing reads as live during enemy playback

- **WHEN** the round is in either enemy phase
- **THEN** every unit's outline is the vocabulary's idle colour, because it is nobody's turn
  to act in this host

#### Scenario: The outline does not change what a tap does

- **WHEN** the player taps a unit whose outline reads as idle during the player phase
- **THEN** that unit is selected and its info popup opens, exactly as before

#### Scenario: The selected unit carries the selection mark

- **WHEN** a unit is selected
- **THEN** it is drawn with the selection mark's two rings rather than with a live or idle
  outline
