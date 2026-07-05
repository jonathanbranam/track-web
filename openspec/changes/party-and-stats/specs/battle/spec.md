**App**: talks

## MODIFIED Requirements

### Requirement: Battle scene entry via startBattle
The system SHALL provide a `startBattle` action that switches the active scene to a single reusable battle arena scene, places one or more named ally combatants and one or more named enemy combatants at fixed arena positions (one ally slot and one enemy slot per combatant, in authored order), initializes each combatant's current/max HP from the action's authored data, defaults every placed ally's choreography tag to `'in'`, and plays an encounter transition effect (a flash/wipe distinct from the plain `enterScene` cut) — all as one instant, deterministic step whose final state is identical whether reached via live playback or `snapTo`.

#### Scenario: startBattle switches to the battle arena
- **WHEN** a `startBattle` action executes with one or more allies and one or more named enemies
- **THEN** the active scene becomes the battle arena, every ally and enemy entity renders at its own fixed arena slot, and each combatant's resting HP equals the value authored on the action

#### Scenario: startBattle places one to several allies at distinct slots
- **WHEN** a `startBattle` action executes with more than one ally
- **THEN** each ally renders at its own arena slot (not stacked on a single position), facing the enemy side, and each starts with choreography tag `'in'`

#### Scenario: Encounter transition plays on live entry, not on skip
- **WHEN** `startBattle` executes during live forward playback
- **THEN** the encounter flash/wipe transition plays once
- **WHEN** `snapTo`/`back`/`skipTo` applies a resting-state snapshot at or after a `startBattle` checkpoint
- **THEN** the battle arena and combatants render directly at their settled state, with no transition replayed

## ADDED Requirements

### Requirement: Multi-combatant choreography via tagCombatant
The system SHALL provide a `tagCombatant` action that sets a named ally's choreography tag to `'in'`, `'out'`, or `'needs-attention'`, reconstructing correctly under `snapTo`/`back`/`skipTo` exactly like combatant HP. `tagCombatant` SHALL be a no-op if no battle is active or the named entity is not an ally in the current battle. Enemies SHALL NOT carry a choreography tag.

#### Scenario: tagCombatant marks an ally out
- **WHEN** a `tagCombatant` action executes with `action: 'out'` for an ally currently tagged `'in'`
- **THEN** that ally's resting choreography tag becomes `'out'`, reconstructing identically whether reached via live playback or `skipTo`

#### Scenario: tagCombatant is a no-op outside battle
- **WHEN** a `tagCombatant` action executes while no battle is active
- **THEN** the resting state is unchanged

### Requirement: New allies join the party via partyJoin
The system SHALL provide a `partyJoin` action that adds a named entity to the current scene at an authored named location (or, when omitted, at the protagonist's current position) and plays a one-shot join effect during live forward playback only. `partyJoin` SHALL NOT itself place the joined entity into an active battle; a subsequent `startBattle` action authors which allies participate in a given fight.

#### Scenario: partyJoin adds a new entity to the scene
- **WHEN** a `partyJoin` action executes for an entity not already present in the current scene
- **THEN** that entity appears in the scene at the authored (or default) location, reconstructing identically under `snapTo`/`back`/`skipTo`

#### Scenario: Join effect plays on live entry, not on skip
- **WHEN** `partyJoin` executes during live forward playback
- **THEN** the one-shot join effect plays once
- **WHEN** `snapTo`/`back`/`skipTo` applies a resting-state snapshot at or after a `partyJoin` checkpoint
- **THEN** the joined entity renders directly at its settled position, with no join effect replayed
