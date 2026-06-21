**App**: games

## Purpose

Defines requirements for the Prototypes entry in the games registry, enabling navigation to the Prototypes game component.

## Requirements

### Requirement: Prototypes entry in games registry
The system SHALL include a `prototypes` entry in `registry.ts` with name "Prototypes", description "prototypes and tests", and category `single-player`. The entry SHALL have no `mount` component — navigation is handled by the explicit `/game/prototypes` route. The `prototypes` entry SHALL appear last in the `games` array, after all other game entries.

#### Scenario: Prototypes appears last in the games list
- **WHEN** a user opens the games home page
- **THEN** "Prototypes" is the last card in the list, below all other games

#### Scenario: Prototypes card navigates to picker
- **WHEN** a user taps the Prototypes card on the home page
- **THEN** the app navigates to `/game/prototypes` and the prototype picker page is displayed

#### Scenario: Unknown slug still redirects
- **WHEN** a user navigates to `/game/unknown-slug`
- **THEN** the app redirects to `/` (existing behavior, unchanged)
