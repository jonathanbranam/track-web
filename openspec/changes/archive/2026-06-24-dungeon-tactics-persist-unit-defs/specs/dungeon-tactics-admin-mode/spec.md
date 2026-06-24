**App**: dungeon-tactics-solo

## MODIFIED Requirements

### Requirement: Overrides drive the engine immediately
Committed max HP and movement edits SHALL be the values the engine uses for affected
behavior — at minimum the move-range helper that computes walk-destination tiles and the
max-HP value used for HP display and clamping. Edits SHALL be applied by mutating the
loaded in-memory unit-definition store (the single read seam the engine reads from), so
after an edit is committed, dependent board state (such as walk-destination tiles when a
unit of that archetype is next selected) SHALL reflect the new value without requiring a
reload. The session-scoped override module (`statOverrides.ts`) SHALL NOT be used.

#### Scenario: New movement value changes walk-destination tiles
- **WHEN** admin mode is on, the designer increases movement for an archetype, and a unit of that archetype is then selected in the player phase
- **THEN** the unit's walk-destination tiles SHALL be computed using the new movement value

#### Scenario: Raised max HP raises current HP by the same amount
- **WHEN** the designer increases an archetype's max HP
- **THEN** each affected unit's current HP SHALL increase by the same amount (e.g. a 3/3 unit becomes 4/4 and a 1/3 unit becomes 2/4)

#### Scenario: Lowered max HP lowers current HP by the same amount, floored at 1
- **WHEN** the designer decreases an archetype's max HP
- **THEN** each affected unit's current HP SHALL decrease by the same amount (e.g. a 4/4 unit becomes 3/3 and a 2/4 unit becomes 1/3)
- **AND** current HP SHALL never drop below 1, so lowering max HP can never kill a unit

## REMOVED Requirements

### Requirement: Overrides are session-scoped
**Reason**: Superseded by persistent, scenario-based unit definitions (Stage 2,
`persisted-unit-defs`). The session-only `statOverrides.ts` module is removed; the engine
reads from the loaded definition store, and max HP / movement edits now persist to the
current scenario through the backend rather than being discarded on reload.

**Migration**: Edits to max HP / movement made through the admin popup are written through
to the in-memory store and persisted via `PUT .../scenarios/:scenario/unit-defs/:archetype`
to the current (default) scenario. They survive a reload (the game reloads the persisted
scenario). To discard an unsaved in-memory edit, use the editor panel's "Reload from
server"; to revert a persisted value, edit it back or re-seed the default scenario.
