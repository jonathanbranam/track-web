**App**: dungeon-tactics-solo

## ADDED Requirements

### Requirement: A Dungeon Tactics studio hub lists its authoring tools
The system SHALL provide a Dungeon Tactics studio hub at `/studio/dungeon-tactics` that lists the game's authoring tools. The list SHALL be data-driven and each tool SHALL carry an availability status so a not-yet-built tool can be shown as a disabled "coming soon" entry. For this change the hub SHALL list the **Unit Designer** as available and the **Map editor** as coming soon.

#### Scenario: Hub lists available and upcoming tools
- **WHEN** a logged-in user opens `/studio/dungeon-tactics`
- **THEN** it SHALL show the Unit Designer as an available tool and the Map editor as a disabled "coming soon" entry

#### Scenario: Selecting an available tool navigates to it
- **WHEN** the user selects the Unit Designer from the hub
- **THEN** the system SHALL navigate to the Unit Designer page at `/studio/dungeon-tactics/unit-designer`

### Requirement: A standalone Unit Designer edits the same unit definitions as the in-game editor
The system SHALL provide a standalone Unit Designer page at `/studio/dungeon-tactics/unit-designer` under the DT studio hub that edits unit definitions through the **same** content store (`defStore`) and the **same** existing unit-def endpoints used by the in-game `ScenarioEditor`. The designer SHALL support non-destructively saving edited definitions as a **Variant** (a named unit-def set) using the existing scenario endpoints. Edits made in the studio designer SHALL persist to the same unit defs the in-game editor reads, with no separate storage. The in-game `ScenarioEditor` panel SHALL remain available for live in-match tuning.

#### Scenario: Studio edits persist to the shared unit defs
- **WHEN** a user edits a unit definition in the standalone Unit Designer and saves
- **THEN** the change SHALL persist through the existing unit-def store/endpoints and SHALL be reflected wherever that unit def is read (including the in-game editor)

#### Scenario: Saving a Variant is non-destructive
- **WHEN** a user saves their edits as a new Variant in the Unit Designer
- **THEN** the system SHALL create a new named unit-def set via the existing scenario endpoints without overwriting the previously active set

#### Scenario: The in-game editor still works
- **WHEN** the standalone designer exists
- **THEN** the in-game `ScenarioEditor` panel SHALL remain functional for live tuning during a match

### Requirement: Dungeon Tactics HUD elements render in ReactDOM
All Dungeon Tactics HUD/chrome elements — the placement/turn controls (Done / Reset / Undo) and the confirm modal — SHALL be rendered as ReactDOM elements overlaid on the game canvas, not painted into the Phaser canvas. World-space rendering (board, units, planning overlays) MAY remain in Phaser. The HUD overlay SHALL drive the same game actions as before via the existing scene events/callbacks, and SHALL take input precedence over the board so taps on HUD controls are not also handled as board taps.

#### Scenario: HUD controls are DOM elements
- **WHEN** the game presents its HUD during placement or play
- **THEN** the Done / Reset / Undo controls and any confirm modal SHALL be ReactDOM elements over the canvas, not drawn into the Phaser canvas

#### Scenario: HUD actions still work
- **WHEN** a user activates a HUD control (e.g. Done, Reset, Undo, or confirm)
- **THEN** the system SHALL perform the same action it did when the HUD was Phaser-drawn, and the underlying board tap SHALL NOT be double-handled
