**App**: all

## Purpose

Makes the Dungeon Tactics rules engine a shared package that runs unchanged in a browser host
and in a Node host, so the game and the design harness referee from one implementation of the
rules rather than two that can drift apart. The engine performs no I/O of its own: every host
supplies its own loading and storage.

## ADDED Requirements

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
