## 1. Battle map and resting-state schema

- [x] 1.1 Add `BATTLE_SCENE_ID = 'battle'` and a hand-authored `BATTLE_MAP: GameMap` constant to `script.ts` (backdrop tiles sized only for camera bounds, `namedLocations` for the ally slot and enemy slot(s), `entities: []`), and register it in `MAPS`
- [x] 1.2 Add `CombatantHp { id: string; hp: number; maxHp: number }` and `BattleState { enemies: CombatantHp[]; ally: CombatantHp }` to `precompute.ts`; add `battle: BattleState | null` to `World`/`RestingState`
- [x] 1.3 Update `createInitialWorld`, `cloneWorld`, `restingStateToWorld`, `snapshotRestingState` in `precompute.ts` to carry `battle` (defaulting to `null` outside battle)
- [x] 1.4 Extend `OverlayCard['kind']` with `'defeat'`

## 2. Action vocabulary additions

- [x] 2.1 Add `StartBattleAction { type: 'startBattle'; ally: CombatantHp; enemies: CombatantHp[]; surprised?: 'party' | 'enemy' }` to `script.ts`'s `Action` union and to `applyAction`: switches `sceneId` to `BATTLE_SCENE_ID`, places `ally`/`enemies` into `entities` at the battle map's fixed slots (with a fixed facing per slot, per design.md's Risk note), and sets `battle: { ally, enemies }`
- [x] 2.2 Add `EndBattleAction { type: 'endBattle'; outcome: 'victory' | 'defeat' | 'flee' | 'stalemate' }` to the `Action` union and to `applyAction`: clears `battle` to `null` without touching `sceneId`/`entities`
- [x] 2.3 Add `BattleActionAction { type: 'battleAction'; actor: string; target: string; kind: 'attack' | 'spell' | 'item' | 'wrong-action'; damage: number; text: string }` to the `Action` union and to `applyAction`: finds `target` in `battle.enemies`/`battle.ally`, sets `hp = clamp(hp - damage, 0, maxHp)`, and sets `ui: { kind: 'dialogue', text: action.text, variant: 'say' }`
- [x] 2.4 Add `DefeatSequenceAction { type: 'defeatSequence'; text: string }` to the `Action` union and to `applyAction`: sets `overlay: { kind: 'defeat', text }`
- [x] 2.5 Wire `startBattle`/`endBattle`/`battleAction`/`defeatSequence` into `createExecutor` (`executors.ts`) as `InstantExecutor`-style actions (apply the reducer, complete synchronously) — no new executor class
- [x] 2.6 Promote `startBattle`, `endBattle`, `battleAction`, `defeatSequence` from Proposed to Established in `action-vocabulary.md` with their final shapes (including the signed-`damage`/heal convention and the `text` narration field)

## 3. Battle scene rendering

- [x] 3.1 In `TalkRpgScene.loadArea`, special-case `sceneId === BATTLE_SCENE_ID`: skip the tile-rect grid draw and render a single full-arena backdrop rectangle instead
- [x] 3.2 In `TalkRpgScene.applySnapshot`, when `resting.sceneId === BATTLE_SCENE_ID`, snap the camera to a fixed wide arena framing (no `startFollow`) regardless of `isPlaying`/movement
- [x] 3.3 Confirm (via the existing create/update/destroy-by-id loop) that battle combatants get `EntityView`s and `getScreenPosition` support with no additional wiring, and that a fixed per-slot facing (ally faces the enemy side, enemies face back) is set when they're placed by `startBattle`
- [x] 3.4 Implement the encounter transition: a one-shot flash/wipe Phaser tween played when `TalkRpgScene` detects a live (`isPlaying`) transition into `BATTLE_SCENE_ID`, not replayed on `snapTo`/`back`/`skipTo`
- [x] 3.5 Implement the damage-number popup: a short-lived Phaser text/tween triggered off a `battleAction`'s HP change, fire-and-forget (no resting-state footprint), analogous to `EntityView`'s walk-step bob tween

## 4. Battle HUD and defeat card

- [x] 4.1 Build `BattleHud.tsx`: reads `resting.battle`, and for each id in `battle.enemies`/`battle.ally` renders an HP label anchored via the existing `useWorldAnchor(entityId)`; renders nothing when `battle` is `null`
- [x] 4.2 Mount `BattleHud` as a sibling of `DialogueBox`/`MenuShell`/`TextCard` in `RpgExperience.tsx`'s `Experience`
- [x] 4.3 Add a `'defeat'` branch to `TextCard.tsx` with distinct "Thou art dead"-style full-screen styling, reusing the existing `overlay` rendering path
- [x] 4.4 Confirm the battle command window needs no changes: `showMenu({ menuKind: 'command', options: [...] })`/`selectMenuOption`/`hideMenu` against `MenuShell`'s existing `CommandWindow` is sufficient

## 5. Demo content

- [x] 5.1 Extend `SCRIPT` in `script.ts` with one complete scripted fight: `startBattle` → command menu → a correct `battleAction` → a `wrong-action` `battleAction` → `endBattle` → `defeatSequence` or victory framing → an explicit `enterScene` back to the field, exercising every new action at least once

## 6. Tests

- [x] 6.1 Unit tests for `RestingState.battle` reducer transitions: `startBattle` sets `sceneId`/`entities`/`battle` together; `battleAction` clamps HP for both damage and heal (`wrong-action`) directions and sets the narration `ui` slot; `endBattle` clears `battle` without touching `sceneId`/`entities`; `defeatSequence`/`hideOverlay` round-trip through `overlay`'s new `'defeat'` kind
- [x] 6.2 Headless precompute test: a script running `startBattle` → `battleAction` (normal) → `battleAction` (`wrong-action`) → `endBattle('victory')` → `enterScene` (back to town) asserts the cached resting state at each `stop` has the expected `battle`/`entities`/`sceneId` shape, and that the post-battle town checkpoint matches a same-town `enterScene` outside of battle (no leftover battle-only state)
- [x] 6.3 Test that `skipTo` a checkpoint following several `battleAction`s (without passing through them live) reproduces the same combatant HP as live playback

## 7. Verification

- [x] 7.1 Run `npm run test` and confirm all tests pass, including the extended `client-talks` suite
- [x] 7.2 Run `npm run build:talks` and confirm zero TypeScript errors
- [x] 7.3 Manually verify in the browser (Playwright screenshot, saved to `/tmp/track-verify/`): the encounter flash plays entering battle, the command window opens via the reused `MenuShell`, a `battleAction` updates an HP label and shows narration text, `defeatSequence` shows a distinct full-screen defeat card, and `back()`/`skipTo()` across a battle checkpoint land combatant positions/HP/`ui` correctly with no stale state from the field scene or a prior fight
