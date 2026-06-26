**App**: dungeon-tactics-solo

## ADDED Requirements

### Requirement: A Dungeon Tactics studio hub lists its authoring tools
The system SHALL provide a Dungeon Tactics studio hub at `/studio/dungeon-tactics` that lists the game's authoring tools. The list SHALL be data-driven and each tool SHALL carry an availability status so a not-yet-built tool can be shown as a disabled "coming soon" entry. For this change the hub SHALL list the **Variant designer** as available and the **Map editor** as coming soon.

#### Scenario: Hub lists available and upcoming tools
- **WHEN** a logged-in user opens `/studio/dungeon-tactics`
- **THEN** it SHALL show the Variant designer as an available tool and the Map editor as a disabled "coming soon" entry

#### Scenario: Selecting an available tool navigates to it
- **WHEN** the user selects the Variant designer from the hub
- **THEN** the system SHALL navigate to the Variant designer page

### Requirement: A standalone Variant designer edits the same Variants as the in-game editor
The system SHALL provide a standalone Variant designer page under the DT studio hub that edits unit definitions ("Variants") through the **same** content store (`defStore`) and the **same** existing unit-def endpoints used by the in-game `ScenarioEditor`. Edits made in the studio designer SHALL persist to the same Variants the in-game editor reads, with no separate storage. The in-game `ScenarioEditor` panel SHALL remain available for live in-match tuning.

#### Scenario: Studio edits persist to the shared Variants
- **WHEN** a user edits a unit definition in the standalone Variant designer and saves
- **THEN** the change SHALL persist through the existing unit-def store/endpoints and SHALL be reflected wherever that Variant is read (including the in-game editor)

#### Scenario: The in-game editor still works
- **WHEN** the standalone designer exists
- **THEN** the in-game `ScenarioEditor` panel SHALL remain functional for live tuning during a match
