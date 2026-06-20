**App**: games

## Purpose

Defines requirements for the Prototypes entry in the games registry, enabling navigation to the Prototypes game component.

## Requirements

### Requirement: Prototypes entry in games registry
The system SHALL include a `prototypes` entry in `registry.ts` with name "Prototypes", description "prototypes and tests", and category `single-player`.

#### Scenario: Prototypes appears in lobby
- **WHEN** a user opens the games home page
- **THEN** "Prototypes" is listed alongside other games with the description "prototypes and tests"

#### Scenario: Prototypes routes to game page
- **WHEN** a user taps the Prototypes entry in the lobby
- **THEN** the app navigates to `/game/prototypes` and mounts the Prototypes component

#### Scenario: Unknown slug still redirects
- **WHEN** a user navigates to `/game/unknown-slug`
- **THEN** the app redirects to `/` (existing behavior, unchanged)
