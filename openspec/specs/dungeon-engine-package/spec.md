**App**: all

## Purpose

Makes the Dungeon Tactics rules engine a shared package that runs unchanged in a browser host
and in a Node host, so the game and the design harness referee from one implementation of the
rules rather than two that can drift apart. The engine performs no I/O of its own: every host
supplies its own loading and storage.

## Requirements

### Requirement: The rules engine is consumable as a shared package

The rules engine — board and unit state types, turn sequencing, PC and NPC action resolution,
pathfinding, attack footprints, the bundled unit-definition table, and the in-memory definition
and content stores — SHALL be importable by any workspace or sibling project as a single package,
independently of the game client that previously contained it.

#### Scenario: A host imports the engine without importing the game

- **WHEN** a host application depends on the engine package and imports its public entry point
- **THEN** it can read board state, enumerate a unit's legal moves and attack squares, resolve a
  PC or NPC action, run the enemy AI, and end a round
- **AND** it pulls in no rendering framework, React component, or game-client module

### Requirement: The engine runs in a Node host

The engine SHALL depend on no browser-only global. Importing and exercising the engine outside a
browser — with no DOM, no `window`, no `localStorage`, and no `fetch` available — MUST succeed.

#### Scenario: A turn plays out in a Node process

- **WHEN** the engine is imported in a Node environment with no DOM or browser globals present
- **AND** units are placed on a board and a full round is resolved
- **THEN** the round resolves with the same results the browser host produces
- **AND** no error is raised for a missing browser global

#### Scenario: A browser-only dependency is reintroduced

- **WHEN** a change adds a reference to a browser-only global inside the engine package
- **THEN** the package's own Node-environment test fails

### Requirement: Hosts supply loading and persistence

The engine SHALL expose the means to apply externally supplied unit definitions and board content
to its in-memory stores, and to read them back, but SHALL NOT fetch them from a server or read or
write any persistent client-side storage. Fetching definitions and board content, choosing which
scenario or map is active, and remembering that choice are the host's responsibility.

#### Scenario: A browser host loads content from the backend

- **WHEN** the game client starts
- **THEN** the client fetches the active unit definitions and map, applies them to the engine's
  stores, and remembers the active selection
- **AND** the game plays exactly as it did when the engine performed those fetches itself

#### Scenario: A host supplies content without a backend

- **WHEN** a host applies a locally constructed board and the bundled unit-definition table
- **THEN** the engine resolves turns against them with no network access

#### Scenario: Loading fails

- **WHEN** a host's fetch of unit definitions or board content fails
- **THEN** the engine retains its bundled defaults and remains playable

### Requirement: The engine ships one visual vocabulary for every host

The engine SHALL export, from its public entry point, the visual vocabulary its hosts
render the game with: terrain and structure fills, unit fills, each unit archetype's
display initial, the shape each kind of piece is drawn as, the outline and selection
colours, the move and attack overlay colours, and HP pip geometry and colours.

The vocabulary SHALL be **data, not drawing**. It SHALL contain no rendering framework
import, no DOM or browser type, and no function that draws anything. Adding it SHALL NOT
change what the engine refuses, permits, or resolves.

Colours SHALL be declared once, as numbers of the form `0xrrggbb`, with a helper that
renders one as a CSS hex string — because one host draws with a canvas API that takes
numbers and the other writes SVG that takes `#rrggbb`. There SHALL NOT be a second table
of the same colours in either spelling.

The vocabulary SHALL additionally be importable on its own, without the rules — a host
that only renders SHALL be able to take it without taking the engine's turn sequencing,
action surface, or in-memory stores with it. To keep that true, the module carrying the
vocabulary SHALL import no engine module that holds runtime state.

Geometry that depends on tile size — pip width, height, spacing and inset — SHALL be
expressed as a ratio of the tile, not as a pixel count, because the two hosts draw tiles
at different sizes and a pixel count that fits one overflows the other.

#### Scenario: A host reads the vocabulary instead of declaring one

- **WHEN** a host renders terrain, a structure, a unit, an overlay, or an HP pip
- **THEN** every colour it uses for those comes from the engine's exported vocabulary
- **AND** the host declares no colour constant of its own for anything the vocabulary names

#### Scenario: The vocabulary is spelled for both hosts

- **WHEN** a host asks for a vocabulary colour as a CSS string
- **THEN** it receives the same colour the numeric form carries, zero-padded to six hex
  digits

#### Scenario: A rendering-only host takes the vocabulary without the rules

- **WHEN** a host imports the visual vocabulary on its own
- **THEN** it receives the vocabulary and does not pull in the engine's turn sequencing,
  action surface, or definition and content stores

#### Scenario: The vocabulary pulls in no renderer

- **WHEN** the engine is imported in a Node environment with no DOM or browser globals
- **THEN** the visual vocabulary is readable there, and no rendering framework is loaded

#### Scenario: Pip geometry fits the tile it is drawn in

- **WHEN** a host asks for the pip height for a piece with a given maximum HP
- **THEN** the height returned is such that that many pips, with their spacing, fit within
  the tile
- **AND** at the shipped game's tile size the values returned are the ones the game already
  draws

### Requirement: The engine publishes which sides a phase solicits

The engine SHALL publish, for each of its turn phases, which sides the round is soliciting
input for. A host SHALL read this rather than working out whose turn it is from the phase
itself, so that no host holds its own copy of the round's turn order.

The published form SHALL be exhaustive over the phase type, so that introducing a new phase
without answering for it fails to compile.

Which sides a *host* offers a seat to is the host's own business and SHALL NOT be part of
this: the shipped game seats the player only, while the design bench seats both, because it
drives the enemy by hand.

#### Scenario: The player phase solicits the player

- **WHEN** the round is in the player phase
- **THEN** the engine reports that the player's side is solicited and the enemy's is not

#### Scenario: An enemy phase solicits the enemy

- **WHEN** the round is in either enemy phase
- **THEN** the engine reports that the enemy's side is solicited and the player's is not

#### Scenario: Placement solicits both sides

- **WHEN** the round is in the placement phase
- **THEN** the engine reports both sides as solicited, since a starting position may place
  either

#### Scenario: An outline is derived without a host deciding legality

- **WHEN** a host asks whether a unit's outline should read as live or idle, supplying the
  phase, the unit's side, and the sides that host seats
- **THEN** the answer is live exactly when the phase solicits that side and the host seats it
- **AND** the host consults nothing about whether that unit could legally act
