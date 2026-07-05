**App**: talks

## Purpose

The `battle` capability depicts a scripted, fully-authored combat sequence for the talk RPG experience: entry into a single reusable battle arena scene (`startBattle`) with one or more allied combatants and one or more enemy combatants, scripted combat beats that apply authored HP deltas and narration (`battleAction`, including a `wrong-action` kind for depicting mistakes), multi-combatant party choreography (`tagCombatant` for tagging an ally `in`/`out`/`needs-attention`, `partyJoin` for a new ally joining the roster), command issuance via the existing menu shell reused from `ui-overlay`, defeat and outcome sequences (`defeatSequence`/`endBattle`), and minimal per-combatant HP tracking that reconstructs deterministically under `snapTo`/`back`/`skipTo`. There is no combat AI and no computed outcome — every effect is authored on the action itself. Real, authored stat content (level, role) beyond battle HP is the `entity-stats` capability's concern.

## Requirements

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

### Requirement: Scripted combat sequencing via battleAction
The system SHALL provide a `battleAction` action (`kind`: `attack` | `spell` | `item` | `wrong-action`) that applies an authored, signed HP delta to a named target combatant (clamped to `[0, maxHp]`), shows an authored narration line via the existing dialogue-box display, and requires no combat AI or computed outcome — every effect is authored on the action itself. A `wrong-action` kind SHALL be able to depict a scripted mistake (e.g. an attack that heals its target) using the same mechanism as a correct action, distinguished only by its authored delta and narration.

#### Scenario: battleAction damages a target
- **WHEN** a `battleAction` with `kind: 'attack'` and a positive damage value targets an enemy combatant
- **THEN** that combatant's resting HP decreases by the authored amount, clamped to zero, and the authored narration line displays in the dialogue box

#### Scenario: wrong-action battleAction heals its target
- **WHEN** a `battleAction` with `kind: 'wrong-action'` and a negative damage value targets an enemy combatant
- **THEN** that combatant's resting HP increases by the corresponding amount, clamped to its max, and the authored narration line displays the mistake

### Requirement: Command-issuance depiction reuses the menu shell
The system SHALL depict the protagonist issuing a battle command using the existing command/status menu shell (`showMenu`/`selectMenuOption`/`hideMenu`) established by the `ui-overlay` capability, with no new or battle-specific menu component.

#### Scenario: Battle command menu opens via the existing menu shell
- **WHEN** a `showMenu` action with `menuKind: 'command'` executes during battle
- **THEN** the same command-window component used outside battle renders the authored options with a movable selection highlight

### Requirement: Defeat and outcome sequences
The system SHALL provide a `defeatSequence` action that displays an authored full-screen defeat message using the existing full-screen overlay mechanism (a distinct overlay kind, not a new component), and an `endBattle` action that records one of `victory` | `defeat` | `flee` | `stalemate` as the battle's outcome and clears battle state. `endBattle` SHALL NOT implicitly restore whatever scene or position was active before the battle began; returning to a non-battle scene SHALL require an explicit subsequent `enterScene` action, consistent with every other scene transition in the framework.

#### Scenario: defeatSequence shows a full-screen defeat card
- **WHEN** a `defeatSequence` action executes with authored text
- **THEN** a full-screen defeat card displays that text, visually distinct from the `act-card`/`headline`/`title` overlay kinds

#### Scenario: endBattle clears battle state without changing scene
- **WHEN** an `endBattle` action executes with any outcome
- **THEN** the resting state's battle data is cleared and the active scene remains the battle arena until a subsequent `enterScene` action changes it

### Requirement: Minimal combatant HP tracking reconstructs deterministically
The system SHALL track each in-battle combatant's current and max HP as part of the resting-state snapshot, scoped to HP only (no level, role, or other stats), such that `snapTo`/`back`/`skipTo` reconstruct every combatant's HP exactly as the deterministic precompute pass computed it — with no dependency on replaying intervening `battleAction`s.

#### Scenario: Skipping directly to a mid-battle checkpoint shows correct HP
- **WHEN** `skipTo(i)` jumps directly to a checkpoint following several `battleAction`s, without passing through them live
- **THEN** every combatant's displayed HP matches the value the precompute pass recorded for checkpoint `i`, identical to reaching it via live playback
