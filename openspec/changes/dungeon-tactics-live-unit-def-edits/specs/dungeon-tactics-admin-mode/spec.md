**App**: dungeon-tactics-solo

## REMOVED Requirements

### Requirement: Admin toggle button in the upper-right
**Reason**: Admin mode is replaced by the Unit editor panel as the single editing surface. The in-HUD toggle is removed.
**Migration**: Open the Unit editor panel to tune units; there is no Admin toggle. Unit tuning is available to any logged-in user without a mode switch.

### Requirement: Gameplay is unchanged while admin mode is off
**Reason**: With admin mode removed there is no on/off state; the unit info popup is permanently read-only.
**Migration**: None — the popup always presents stats as read-only, the former admin-off behavior.

### Requirement: Editing max HP and movement in the info popup while admin is on
**Reason**: In-popup stat editing is removed; editing happens only through the Unit editor panel, which can edit every `UnitDef` field, not just max HP and movement.
**Migration**: Edit max HP, movement, and all other fields in the Unit editor panel; edits apply live to the running match.

### Requirement: Edits apply per archetype
**Reason**: Per-archetype application is retained, but it is now provided by the Unit editor flow under the `persisted-unit-defs` capability rather than by admin mode.
**Migration**: Editing an archetype in the Unit editor applies to every unit of that archetype, as before.

### Requirement: Overrides drive the engine immediately
**Reason**: Immediate engine effect and the max-HP/current-HP reconciliation (floored at 1) are retained, but are now part of the Unit editor's live-apply behavior under `persisted-unit-defs`. The single-archetype persist path used by admin mode is removed.
**Migration**: Editor edits mutate the same in-memory def store and reconcile current HP by the max-HP delta (floored at 1) live; persistence is via the bulk write on Save.
