## ADDED Requirements

### Requirement: Editor numeric fields enforce per-field range bounds
The unit editor's numeric fields SHALL constrain each value to a sensible range so a designer cannot commit or persist an invalid `UnitDef`. The bounds are:

| Field | Min | Max |
|-------|-----|-----|
| Max HP | 1 | 20 |
| Move (movement range) | 0 | 22 |
| Damage | 0 | 15 |
| Min range | 0 | 22 |
| Max range | 1 | 22 |

The maxima of 22 for movement and range equal the board's maximum Manhattan span (a 16×8 board: `(16-1)+(8-1)`), the farthest any move or attack can reach. Each field SHALL carry native `min`/`max` input attributes as a browser affordance, and the value committed to the in-memory store SHALL be clamped to the field's range (after the existing integer rounding) so that a typed or pasted out-of-range value can never enter the store regardless of the affordance.

#### Scenario: Negative entry is clamped to the field minimum
- **WHEN** a user types a negative value into any numeric field (e.g. Move = `-5`)
- **THEN** the value committed to the store SHALL be the field's minimum (Move → `0`), and no negative value SHALL reach the running match or be persisted

#### Scenario: Zero is rejected where a field requires at least one
- **WHEN** a user enters `0` for Max HP or Max range
- **THEN** the committed value SHALL be clamped to that field's minimum (`1`), so a unit can never have `maxHp` of 0 nor an attack that reaches no tile

#### Scenario: Over-cap entry is clamped to the field maximum
- **WHEN** a user enters a value above a field's cap (e.g. Damage = `40`, or Move = `30`)
- **THEN** the committed value SHALL be the field's maximum (Damage → `15`, Move → `22`)

### Requirement: The min/max range pair stays coupled so max is never below min
The editor SHALL keep the attack range pair consistent such that Max range is never less than Min range. The field the user edits SHALL keep the value entered; the partner field SHALL be moved to match when the pair would otherwise invert:
- Raising **Min range** above the current **Max range** SHALL raise Max range to equal the new Min range.
- Lowering **Max range** below the current **Min range** SHALL lower Min range to equal the new Max range.

After either adjustment the two values SHALL be equal. The coupled (already-consistent) pair is what enters the store and is persisted.

#### Scenario: Raising min above max pulls max up to match
- **WHEN** Max range is `3` and the user sets Min range to `5`
- **THEN** Min range SHALL be `5` and Max range SHALL be raised to `5`

#### Scenario: Lowering max below min pulls min down to match
- **WHEN** Min range is `6` and the user sets Max range to `2`
- **THEN** Max range SHALL be `2` and Min range SHALL be lowered to `2`

#### Scenario: An edit that keeps the pair ordered leaves the partner untouched
- **WHEN** Min range is `2` and Max range is `8` and the user sets Min range to `4`
- **THEN** Min range SHALL be `4` and Max range SHALL remain `8`

## MODIFIED Requirements

### Requirement: Any logged-in user writes definitions and scenarios over a validated API
The system SHALL expose, on the games router and requiring a logged-in session but **no admin role** for now (matching the project's equal-rights default): `PUT .../scenarios/:scenario/unit-defs` (bulk), `POST .../scenarios` (create + name), and `PUT .../scenarios/:scenario/default` (set default). There SHALL be no single-archetype write endpoint; the bulk write upserts each archetype internally. Every request body SHALL be validated before it is persisted. The `UnitDef` write schema (Zod, mirroring the `UnitDef` interface) SHALL enforce the same per-field bounds as the editor — `maxHp` in `[1,20]`, `movement.range` in `[0,22]`, `attack.damage` in `[0,15]`, `attack.targeting.minRange` in `[0,22]`, `attack.targeting.maxRange` in `[1,22]` — and SHALL reject a def whose `maxRange` is less than its `minRange`, so the schema (not only the UI) is the authority and no client can persist an out-of-range or inverted-range def. The endpoints SHALL be structured so an admin restriction can be added later without changing the API shape.

#### Scenario: Logged-in user upserts valid definitions in a scenario
- **WHEN** a logged-in client sends a `PUT .../scenarios/:scenario/unit-defs` with a body whose archetypes satisfy the `UnitDef` schema
- **THEN** the system SHALL persist the upserts into that scenario and return success

#### Scenario: Invalid definition is rejected
- **WHEN** a `UnitDef` write body fails schema validation
- **THEN** the system SHALL reject it with a `400` and SHALL NOT persist any change

#### Scenario: Out-of-range value is rejected by the schema
- **WHEN** a write body carries a value outside the per-field bounds (e.g. `maxHp` of `0` or `25`, `attack.damage` of `40`, or `movement.range` of `30`)
- **THEN** the system SHALL reject it with a `400` and SHALL NOT persist any change

#### Scenario: Inverted range pair is rejected by the schema
- **WHEN** a write body carries a def whose `attack.targeting.maxRange` is less than its `attack.targeting.minRange`
- **THEN** the system SHALL reject it with a `400` and SHALL NOT persist any change

#### Scenario: Unauthenticated write is rejected
- **WHEN** an unauthenticated client calls any write, create-scenario, or set-default endpoint
- **THEN** the system SHALL respond `401` and SHALL NOT persist any change
