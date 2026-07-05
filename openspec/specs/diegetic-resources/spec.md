**App**: talks

## Purpose

The `diegetic-resources` capability provides attachable, scriptable resource state for the talk RPG experience: meters (`setMeter`/`addMeter`) for gauges and counters — including the gold/cost counter as an ordinary meter instance — and a scriptable light radius (`setLightRadius`) for cave-style fog/visibility set-pieces. Both are driven entirely by authored script actions on deterministic beats (never continuous animation or live simulation), computed by the existing headless precompute pass, and reconstructed exactly by `snapTo`/`back`/`skipTo` like every other piece of resting state. Rendering rides on `ui-overlay`'s DOM overlay conventions (meters) and `world-rendering`'s tilemap (light-radius visibility masking).

## Requirements

### Requirement: Attachable scriptable meters via setMeter/addMeter
The system SHALL provide a `setMeter` action carrying a `meterId`, display `label`, `style` (`bar` | `counter`), a `value`, and an optional `max` (required for `style: 'bar'`) and `anchorEntity`, which fully defines or replaces that meter's descriptor and value in the resting state as one instant, deterministic step. The system SHALL provide an `addMeter` action carrying a `meterId` and a signed `delta` that mutates only that meter's `value` (clamped to `[0, max]` when `style: 'bar'`), and SHALL treat `addMeter` as a no-op if `meterId` has not been defined by a prior `setMeter`. Values SHALL change only on authored beats, never via continuous animation or live simulation.

#### Scenario: setMeter defines a bar-style meter
- **WHEN** a `setMeter` action executes with `style: 'bar'`, `value: 8`, `max: 10`
- **THEN** the resting state records that meter's label, style, value, and max exactly as authored

#### Scenario: addMeter ticks an existing meter
- **WHEN** an `addMeter` action with `delta: 5` executes against a meter previously set to `value: 10`
- **THEN** that meter's resting value becomes `15`, clamped to its `max` if `style: 'bar'`

#### Scenario: addMeter is a no-op against an undefined meter
- **WHEN** an `addMeter` action targets a `meterId` with no prior `setMeter`
- **THEN** the resting state is unchanged and no meter is created

### Requirement: Cost/currency counter as a meter instance
The system SHALL represent the gold/cost counter as an ordinary meter (`style: 'counter'`, no `anchorEntity`) driven by `setMeter`/`addMeter` — no separate action type or component SHALL exist for currency specifically.

#### Scenario: Gold counter ticks via addMeter
- **WHEN** an `addMeter` action with `meterId: 'gold'` executes against a `style: 'counter'` meter
- **THEN** the displayed running counter updates to the new value, styled as in-world currency, using the same rendering path as any other meter

### Requirement: Bar-style meter rendering, world-anchored or fixed
The system SHALL render every meter in `resting.meters` as a DOM overlay element: a bar-style meter with a fill proportional to `value / max`, or a counter-style meter as a plain numeric readout. When a meter's `anchorEntity` is set, its element SHALL track that entity's screen position as the camera moves (the same world-anchoring mechanism `ui-overlay` established for dialogue/labels); when omitted, it SHALL render at a fixed on-screen HUD position.

#### Scenario: Anchored meter tracks its entity
- **WHEN** a meter with `anchorEntity: 'ally'` is present in the resting state and the camera pans
- **THEN** the meter's rendered position moves to stay over the `ally` entity, matching `BattleHud`'s existing world-anchored HP label behavior

#### Scenario: Unanchored meter renders at a fixed position
- **WHEN** a meter with no `anchorEntity` is present in the resting state
- **THEN** it renders at a fixed HUD position regardless of camera movement

### Requirement: Meter state reconstructs deterministically
The system SHALL include every defined meter's full descriptor and value as part of the resting-state snapshot such that `snapTo`/`back`/`skipTo` reconstruct every meter exactly as the deterministic precompute pass computed it, with no dependency on replaying intervening `setMeter`/`addMeter` actions.

#### Scenario: Skipping directly to a checkpoint after several addMeter actions shows the correct value
- **WHEN** `skipTo(i)` jumps directly to a checkpoint following several `addMeter` actions, without passing through them live
- **THEN** every meter's displayed value matches what the precompute pass recorded for checkpoint `i`, identical to reaching it via live playback

### Requirement: Scriptable light radius via setLightRadius
The system SHALL provide a `setLightRadius` action carrying an `anchorEntity`, a target `radius`, and an optional `overSeconds`, which sets the resting state's light-radius value to exactly the authored final `{ anchorEntity, radius }` as one deterministic step regardless of `overSeconds` (the precompute pass computes only the final value, matching the existing `walk` action's instant-final-position semantics). A `null` light-radius state SHALL mean full visibility (no fog). The `radius` SHALL be able to reach `0` (full extinguish).

#### Scenario: setLightRadius sets the final radius instantly in precompute
- **WHEN** a `setLightRadius` action with `radius: 3` and `overSeconds: 2` is processed by the headless precompute pass
- **THEN** the resulting resting-state checkpoint records `radius: 3` with no intermediate value

#### Scenario: setLightRadius can extinguish to zero
- **WHEN** a `setLightRadius` action executes with `radius: 0`
- **THEN** the resting state's light radius is `0`, and no tiles beyond the anchor entity's own tile render as visible

### Requirement: Light radius animates via discrete deterministic steps during live playback
During live playback (not `snapTo`/`back`/`skipTo`), a `setLightRadius` action with `overSeconds` SHALL animate the displayed radius from its current value to the target value in discrete integer steps timed to complete within `overSeconds`, using the same timer-driven mechanism as `walk`'s step-by-step movement rather than a continuous engine-level tween, so the animation's intermediate states are reproducible rather than tied to an untracked animation object.

#### Scenario: Live playback steps the radius down to the target
- **WHEN** `next()` plays a `setLightRadius` action with a lower target `radius` and a nonzero `overSeconds`
- **THEN** the displayed radius decreases by discrete integer steps until it reaches the target value at or before `overSeconds` elapses

#### Scenario: Omitting overSeconds applies the radius instantly
- **WHEN** a `setLightRadius` action executes with no `overSeconds`
- **THEN** the displayed radius changes to the target value immediately, with no step animation

### Requirement: Light radius renders as tile/entity visibility masking
The system SHALL render a non-null light radius by computing each visible tile's and entity's display alpha as a pure function of its grid (Chebyshev) distance from the anchor entity's current position and the current radius, recomputed fresh on every resting-state snapshot rather than mutated incrementally on a persistent lighting object. When the light radius is `null`, every tile and entity SHALL render at full visibility.

#### Scenario: Tiles outside the radius are not visible
- **WHEN** the resting state has a non-null light radius around an anchor entity
- **THEN** tiles whose grid (Chebyshev) distance from the anchor exceeds the radius render with zero visibility, and tiles within the radius render at full visibility

#### Scenario: Re-applying the same resting state produces identical fog
- **WHEN** the same resting-state snapshot with a light radius is applied twice in a row (e.g. via repeated `snapTo` calls to the same checkpoint)
- **THEN** the rendered fog is pixel-identical both times, since it is recomputed from the snapshot rather than carried over from prior render state

### Requirement: Light radius state reconstructs deterministically
The system SHALL include the light-radius value as part of the resting-state snapshot such that `snapTo`/`back`/`skipTo` reconstruct the exact radius the deterministic precompute pass computed for that checkpoint, with no dependency on replaying intervening `setLightRadius` actions or animation.

#### Scenario: Jumping into a cave scene lands at the correct light state instantly
- **WHEN** `skipTo(i)` jumps directly to a checkpoint inside a cave scene with an active light radius, without passing through the `setLightRadius` action live
- **THEN** the rendered fog matches the radius the precompute pass recorded for checkpoint `i`, identical to reaching it via live playback
