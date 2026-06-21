**App**: games

## ADDED Requirements

### Requirement: Prototype picker page
The system SHALL render a prototype picker page at `/game/prototypes` that lists all entries from the prototype sub-registry as tappable cards. Each card SHALL display the prototype's name and description. The page SHALL use the same game-page chrome as other games: a back link to `/` labelled "← Games" and a centered title "Prototypes".

#### Scenario: Picker lists all registered prototypes
- **WHEN** a user navigates to `/game/prototypes`
- **THEN** the picker displays one card per entry in the prototype registry, in registration order

#### Scenario: Tapping a prototype card navigates to it
- **WHEN** a user taps a prototype card on the picker page
- **THEN** the app navigates to `/game/prototypes/:protoSlug` and mounts that prototype's component

#### Scenario: Back link returns to games home
- **WHEN** a user taps "← Games" on the picker page
- **THEN** the app navigates to `/`

#### Scenario: Empty prototype registry shows empty state
- **WHEN** the prototype registry contains no entries
- **THEN** the picker displays an empty state message instead of cards

### Requirement: Prototype sub-routing
The system SHALL render individual prototype components at `/game/prototypes/:protoSlug`. An unrecognised `protoSlug` SHALL redirect to `/game/prototypes`.

#### Scenario: Known slug mounts prototype
- **WHEN** a user navigates to `/game/prototypes/tilt-tester`
- **THEN** the TiltTester prototype component is mounted full-screen

#### Scenario: Unknown slug redirects to picker
- **WHEN** a user navigates to `/game/prototypes/nonexistent`
- **THEN** the app redirects to `/game/prototypes`

### Requirement: Nav bar hidden on all prototype pages
The system SHALL hide the bottom nav bar and suppress scroll on both `/game/prototypes` and `/game/prototypes/:protoSlug`, matching the existing in-game behaviour for other game routes.

#### Scenario: Nav bar hidden on picker
- **WHEN** a user is on `/game/prototypes`
- **THEN** the bottom nav bar is not visible

#### Scenario: Nav bar hidden on prototype sub-page
- **WHEN** a user is on `/game/prototypes/tilt-tester`
- **THEN** the bottom nav bar is not visible

### Requirement: Prototype sub-registry
The system SHALL maintain a typed prototype sub-registry at `src/games/prototypes/registry.ts` that exports an array of prototype descriptors. Each descriptor SHALL include a kebab-case `slug`, a human-readable `name`, a short `description`, and a lazily-loaded React component (`mount`). Adding a prototype requires adding one entry; removing one requires deleting the entry and its folder.

#### Scenario: Registry drives picker
- **WHEN** the prototype registry contains entries
- **THEN** the picker page renders exactly those entries in registration order

#### Scenario: App builds after removing an entry
- **WHEN** a prototype's registry entry and folder are deleted
- **THEN** the app builds without errors and the picker no longer lists that prototype
