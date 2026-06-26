**App**: games

## ADDED Requirements

### Requirement: A dedicated `/studio` design section exists outside the play flow
The system SHALL provide a `/studio` route area in `client-games`, separate from the `/game/…` play namespace, as the home for content-authoring tools. The area SHALL require a logged-in session and SHALL NOT require an admin role. Because it is outside `/game/…`, the bottom navigation SHALL be shown on `/studio` routes (it is hidden only in-game).

#### Scenario: Studio home renders for a logged-in user
- **WHEN** a logged-in user navigates to `/studio`
- **THEN** the system SHALL render the studio home and SHALL show the bottom navigation

#### Scenario: Studio requires authentication
- **WHEN** an unauthenticated user navigates to a `/studio` route
- **THEN** the system SHALL redirect to login and SHALL NOT render the studio

### Requirement: A second "Studio" navigation tab
The bottom navigation SHALL present two equal-width tabs — **"Games" → `/`** and **"Studio" → `/studio`** — with the active tab visually indicated. Both tabs SHALL be hidden while in-game (paths under `/game/…`) and shown elsewhere, preserving the existing in-game hiding behavior and safe-area padding.

#### Scenario: Both tabs are shown outside the game
- **WHEN** the user is on a non-`/game/…` route
- **THEN** the navigation SHALL show the Games and Studio tabs with the current route's tab marked active

#### Scenario: Navigation stays hidden in-game
- **WHEN** the user is on a `/game/…` route
- **THEN** the navigation SHALL remain hidden

### Requirement: The studio home lists games that offer a studio
The `/studio` home SHALL list the games that provide a studio, each linking to that game's studio hub. The list SHALL be data-driven so additional games can be added without restructuring the page. For now it SHALL contain Dungeon Tactics linking to `/studio/dungeon-tactics`.

#### Scenario: Dungeon Tactics is listed and navigable
- **WHEN** a user views the studio home
- **THEN** it SHALL list Dungeon Tactics and SHALL navigate to `/studio/dungeon-tactics` when selected
