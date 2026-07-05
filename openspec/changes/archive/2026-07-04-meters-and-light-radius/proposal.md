## Why

Phase 4 (`scripted-battle`) proved the framework can carry per-combatant HP
through the precompute pass and `snapTo`/`back`/`skip`, but the engine still
has no way to represent the other diegetic state `requirements.md` §4F/§4G
calls for: attachable scriptable meters (a gold/cost counter, a bar-style
capacity gauge) and the cave "light radius/fog" set-piece. `talk-director`'s
spec currently scopes these out explicitly ("No other action type
(`walkTo`, `thought`, `enterScene`, battle/meter/light actions, etc.) SHALL
be required to exist yet"). Building both now — while they're still
independent of party/stats — keeps Phase 6's entity-model work from having
to design around them retroactively, and unblocks the cave/cost-motif
content tracked in `idea-board.md`.

## What Changes

- New actions `setMeter` and `addMeter` (per `action-vocabulary.md`'s
  "Diegetic resources" section): attach a scriptable gauge to an entity and
  drive its value on scripted beats — `setMeter` jumps to an absolute value,
  `addMeter` ticks a running counter (the gold/cost use case) by a delta.
- New action `setLightRadius` (per `action-vocabulary.md`'s "Environmental —
  light radius" section): changes the visible-tile radius around an anchor
  entity, with real per-step radius motion executed like `walk` rather than
  a generic tween, including animating down to zero.
- New `RestingState` fields for meters (current value/style per `meterId`)
  and light radius (anchor entity + current radius), computed by the
  existing deterministic precompute pass and reconstructed exactly by
  `snapTo`/`back`/`skipTo` like every other piece of resting state.
- Bar-style meter rendering (DOM, via `ui-overlay`'s existing overlay
  conventions) for the gauge/counter use case.
- Light-radius/fog rendering (tile-visibility masking layered on
  `world-rendering`'s existing tilemap) for the cave use case.
- Per `requirements.md` §4F's note, both the bar-style meter *and* the
  light-radius treatment are implemented so the narrative can choose which
  represents "capacity/context" later — this change does not decide that
  fork (tracked in `idea-board.md`), it only builds both primitives.
- A placeholder cave scene and a scripted gold counter demonstrating both
  systems end-to-end, verified correct under `back`/`skip`.

## Capabilities

### New Capabilities

- `diegetic-resources`: Attachable scriptable meters (`setMeter`/`addMeter`),
  the gold/cost counter as a meter instance, the bar-style meter rendering,
  and the scriptable light-radius/fog system (`setLightRadius`) including
  its tile-visibility masking — covering `requirements.md` groups F and G
  together, per §8's proposal boundary grouping.

### Modified Capabilities

None. Following the pattern `scripted-battle` set for `battle`: the new
`setMeter`/`addMeter`/`setLightRadius` actions are new vocabulary added
under the `diegetic-resources` capability, so `talk-director`'s
Phase-1-scoped action-vocabulary requirement doesn't need its text changed.
`world-rendering`'s tile-rendering requirement doesn't claim every tile is
always visible, so layering a visibility mask on top for light radius is
additive, not a change to that requirement.

## Impact

- **Code**: `client-talks/src/talk-rpg/` — new action executors for
  `setMeter`/`addMeter`/`setLightRadius`; `script.ts`'s `Action` union grows
  accordingly; `RestingState` gains `meters` and `lightRadius` fields per
  `requirements.md` §5's resting-state field list.
- **Rendering**: `ui-overlay`'s DOM layer gains a meter/gauge component;
  `world-rendering`'s Phaser tile rendering gains a fog/visibility mask
  driven by `RestingState.lightRadius`.
- **Content**: one placeholder cave-shaped scene and one scripted gold
  counter, both used to verify `back`/`skip` correctness — no final art.
- **Docs**: `action-vocabulary.md` entries for `setMeter`/`addMeter`/
  `setLightRadius` move from proposed to established; `phased-implementation.md`
  Phase 5 gets linked to this change per `writing-openspec-proposals.md` §4.
