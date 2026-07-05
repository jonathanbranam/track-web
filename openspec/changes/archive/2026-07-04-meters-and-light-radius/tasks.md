## 1. Meter resting-state schema

- [x] 1.1 Add `MeterState { label: string; style: 'bar' | 'counter'; value: number; max?: number; anchorEntity?: string }` to `precompute.ts`; add `meters: Record<string, MeterState>` to `World`/`RestingState`
- [x] 1.2 Add a `cloneMeters` helper (shallow per-entry copy, matching `cloneBattle`'s pattern) and wire it into `createInitialWorld` (empty record), `cloneWorld`, `restingStateToWorld`, and `snapshotRestingState`

## 2. Light radius resting-state schema

- [x] 2.1 Add `LightRadiusState { anchorEntity: string; radius: number }` to `precompute.ts`; add `lightRadius: LightRadiusState | null` to `World`/`RestingState`
- [x] 2.2 Wire `lightRadius` (defaulting to `null`) into `createInitialWorld`, `cloneWorld`, `restingStateToWorld`, and `snapshotRestingState` alongside `meters`

## 3. Meter action vocabulary

- [x] 3.1 Add `SetMeterAction { type: 'setMeter'; meterId: string; label: string; style: 'bar' | 'counter'; value: number; max?: number; anchorEntity?: string }` to `script.ts`'s `Action` union and to `applyAction`: replaces `world.meters[meterId]` wholesale
- [x] 3.2 Add `AddMeterAction { type: 'addMeter'; meterId: string; delta: number }` to the `Action` union and to `applyAction`: no-op if `meterId` isn't in `world.meters`; otherwise adds `delta` to `value`, clamped to `[0, max]` when `style: 'bar'`
- [x] 3.3 Wire `setMeter`/`addMeter` into `createExecutor` (`executors.ts`) as `InstantExecutor`-style actions — no new executor class
- [x] 3.4 Promote `setMeter`/`addMeter` from Proposed to Established in `action-vocabulary.md` with their final shapes

## 4. Light radius action vocabulary and animation

- [x] 4.1 Add `SetLightRadiusAction { type: 'setLightRadius'; anchorEntity: string; radius: number; overSeconds?: number }` to the `Action` union and to `applyAction`: sets `world.lightRadius = { anchorEntity, radius }` directly (ignoring `overSeconds` — precompute only records the final value, per design.md)
- [x] 4.2 Implement `LightRadiusExecutor` in `executors.ts`, structurally mirroring `StepWalkExecutor`: steps the live `lightRadius.radius` by ±1 on a `setTimeout` cadence derived from `overSeconds / |Δradius|` until it reaches the target, calling `onWorldChange` after each step
- [x] 4.3 Wire `setLightRadius` into `createExecutor`: use `LightRadiusExecutor` when `overSeconds` is set and the radius actually changes, otherwise fall back to `InstantExecutor`
- [x] 4.4 Promote `setLightRadius` from Proposed to Established in `action-vocabulary.md` with its final shape

## 5. Meter rendering

- [x] 5.1 Build `MeterHud.tsx`: reads `resting.meters`, renders a bar-fill element (`value / max`) for `style: 'bar'` entries and a plain numeric readout for `style: 'counter'` entries
- [x] 5.2 For entries with `anchorEntity` set, position the element via the existing `useWorldAnchor(entityId)` hook (same mechanism `BattleHud`'s `HpLabel` uses); for entries with no `anchorEntity`, render at a fixed on-screen HUD position (e.g. a top corner) instead
- [x] 5.3 Mount `MeterHud` as a sibling of `BattleHud`/`DialogueBox`/`MenuShell`/`TextCard` in `RpgExperience.tsx`'s `Experience`

## 6. Light radius / fog rendering

- [x] 6.1 In `TalkRpgScene.applySnapshot`, when `resting.lightRadius` is non-null: compute each tile rectangle's and `EntityView`'s alpha as a function of its grid (Chebyshev) distance from the anchor entity's current position vs. the radius (full visibility within, zero beyond); when `null`, reset every tile/entity to full alpha
- [x] 6.2 Confirm the fog pass runs after `loadArea`'s tile-rect (re)creation on a scene switch, so newly-created tiles get the correct alpha immediately rather than for one frame at full visibility

## 7. Demo content

- [x] 7.1 Add a placeholder cave-shaped scene to `script.ts` (new `GameMap` entry in `MAPS`, following the `TOWN_MAP`/`OVERWORLD_MAP` Tiled-JSON pattern) sized to demonstrate light radius clearly
- [x] 7.2 Extend `SCRIPT` with a beat sequence entering the cave scene and running `setLightRadius` through a grow → shrink → extinguish arc (exercising `overSeconds` at least once and `radius: 0` at least once)
- [x] 7.3 Extend `SCRIPT` with a scripted gold counter: `setMeter` defining a `style: 'counter'` `gold` meter, followed by one or more `addMeter` ticks on later beats

## 8. Tests

- [x] 8.1 Unit tests for the `meters` reducer: `setMeter` fully replaces a meter's descriptor; `addMeter` mutates only `value` and clamps for `style: 'bar'`; `addMeter` against an undefined `meterId` is a no-op
- [x] 8.2 Unit tests for the `lightRadius` reducer: `setLightRadius` sets the final value instantly regardless of `overSeconds`; `radius: 0` is representable; `null` is the default before any `setLightRadius`
- [x] 8.3 Headless precompute test: a script running `setMeter` → `addMeter` (gold) and `setLightRadius` (grow → shrink → `0`) asserts the cached resting state at each `stop` has the expected `meters`/`lightRadius` shape
- [x] 8.4 Test that `skipTo` a checkpoint following several `addMeter`/`setLightRadius` actions (without passing through them live) reproduces the same meter values and light radius as live playback

## 9. Verification

- [x] 9.1 Run `npm run test` and confirm all tests pass, including the extended `client-talks` suite
- [x] 9.2 Run `npm run build:talks` and confirm zero TypeScript errors
- [x] 9.3 Manually verify in the browser (Playwright screenshot, saved to `/tmp/track-verify/`): the gold counter ticks on its scripted beats, the cave scene's fog visibly grows/shrinks/extinguishes, and `back()`/`skipTo()` across a meter or light-radius checkpoint land the correct values with no stale state from a prior scene
