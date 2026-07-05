## 1. Battle state schema widening

- [x] 1.1 In `precompute.ts`, add `PartyMemberState extends CombatantHp { tag: 'in' | 'out' | 'needs-attention' }`; change `BattleState` from `{ ally: CombatantHp; enemies: CombatantHp[] }` to `{ allies: PartyMemberState[]; enemies: CombatantHp[] }`
- [x] 1.2 Update `cloneBattle` to clone `allies[]` (spreading each `PartyMemberState`, including `tag`) instead of a singular `ally`
- [x] 1.3 In `script.ts`, widen `StartBattleAction.ally: CombatantHp` to `allies: CombatantHp[]`
- [x] 1.4 In `script.ts`'s `BATTLE_MAP`, rename `allySlot` to `allySlot0`/`allySlot1`/`allySlot2`/`allySlot3` (four ally slots, matching idea-board's Stage-3 four-familiar party), positioned symmetrically to the existing `enemySlot0`/`1`/`2`

## 2. Action vocabulary — startBattle/tagCombatant/partyJoin

- [x] 2.1 In `precompute.ts`'s `applyAction`, update the `startBattle` case to loop over `action.allies` placing each at `allySlot${i}` (mirroring the existing `enemies` loop) and set `battle: { allies: action.allies.map(a => ({ ...a, tag: 'in' })), enemies: ... }`
- [x] 2.2 Update `battleAction`'s `applyDamage` to map over `battle.allies` and `battle.enemies` uniformly (dropping the special-cased single `ally`)
- [x] 2.3 Add `TagCombatantAction { type: 'tagCombatant'; entity: string; action: 'in' | 'out' | 'needs-attention' }` to `script.ts`'s `Action` union and `applyAction`: finds the named ally in `battle.allies` and replaces its `tag`; no-op if no battle is active or the entity isn't an ally
- [x] 2.4 Add `PartyJoinAction { type: 'partyJoin'; entity: string; at?: string; fx?: string }` to `script.ts`'s `Action` union and `applyAction`: resolves `at` against the current scene's `namedLocations` (falling back to `pc`'s position) and adds one entry to `world.entities`
- [x] 2.5 Wire `tagCombatant`/`partyJoin` into `createExecutor` (`executors.ts`) as `InstantExecutor`-style actions

## 3. Action vocabulary — showStatus/levelUp

- [x] 3.1 Add `EntityStats { level: number; role?: string; hp: number; maxHp: number }` to `script.ts`
- [x] 3.2 Add `ShowStatusAction { type: 'showStatus'; entity: string; stats: EntityStats; options?: string[] }` to `script.ts`'s `Action` union and `applyAction`: sets `ui: { kind: 'menu', menuKind: 'status', entity: action.entity, stats: action.stats, options: action.options ?? [], selectedIndex: 0 }`
- [x] 3.3 Add `LevelUpAction { type: 'levelUp'; entity: string; text: string }` to `script.ts`'s `Action` union and `applyAction`: sets `ui: { kind: 'dialogue', text: action.text, variant: 'say' }`
- [x] 3.4 Remove `'status'` from `ShowMenuAction.menuKind`, narrowing it to `'command'` only; widen `ActiveUI`'s `menu` variant to a discriminated pair (`menuKind: 'command'` without stats vs. `menuKind: 'status'` with `entity`/`stats`); update `cloneUI` for the new shape
- [x] 3.5 Wire `showStatus`/`levelUp` into `createExecutor` as `InstantExecutor`-style actions
- [x] 3.6 Promote `tagCombatant`, `partyJoin`, `showStatus`, `levelUp` from Proposed to Established in `action-vocabulary.md` with their final shapes; update the Established `showMenu` entry to note `menuKind` is now `'command'`-only

## 4. Rendering

- [x] 4.1 Update `BattleHud.tsx` to render one `HpLabel` per `battle.allies` entry (instead of the single `battle.ally`), matching the existing `battle.enemies.map` pattern
- [x] 4.2 In `BattleHud.tsx`, visually distinguish a tagged-out ally (e.g. reduced opacity/badge) based on `tag`, read declaratively off the current snapshot — no diffing
- [x] 4.3 In `TalkRpgScene.ts`, declaratively dim/undim each ally's `EntityView` based on `battle.allies[].tag` on every snapshot (mirroring `applyFog`'s "recompute fresh every call" pattern)
- [x] 4.4 In `TalkRpgScene.ts`, update the damage-number diff loop to iterate `[...battle.allies, ...battle.enemies]` instead of `[battle.ally, ...battle.enemies]`
- [x] 4.5 In `TalkRpgScene.ts`, detect a live (`isPlaying`) `partyJoin` by diffing entity ids between the previous and current snapshot (an id present now that wasn't before) and play a one-shot join effect (e.g. a brief flash/tween on the new entity), never replayed on `snapTo`/`back`/`skipTo`
- [x] 4.6 In `MenuShell.tsx`, update `StatusScreen` to read `ui.entity`/`ui.stats` (real level/role/HP) instead of hardcoded placeholder text, keeping the same bordered layout and optional footer command list

## 5. Demo content

- [x] 5.1 In `script.ts`'s `SCRIPT`, update the existing Phase 4 `startBattle` beat's `ally: {...}` to `allies: [{...}]`
- [x] 5.2 Widen the demo fight to a second ally (exercising multi-ally placement) and add one `tagCombatant` beat (e.g. tagging the second ally `'out'` mid-fight) and one `partyJoin` beat (a new ally joining in a field scene before the fight)
- [x] 5.3 Replace `SCRIPT`'s Phase 3 `{ type: 'showMenu', menuKind: 'status', options: ['pc'] }` proving beat with a `showStatus` beat carrying real authored stats
- [x] 5.4 Add one `levelUp` proving beat with authored narration text

## 6. Tests

- [x] 6.1 Update existing `precompute.test.ts`/`directorEngine.test.ts` fixtures and assertions that reference `battle.ally` (singular) to `battle.allies` (array), including the `BATTLE_MAP` test fixtures' `allySlot` → `allySlot0`
- [x] 6.2 Unit tests for `startBattle` placing multiple allies at distinct slots, each defaulting to `tag: 'in'`
- [x] 6.3 Unit tests for `tagCombatant`: sets an ally's tag; no-op outside battle; no-op for a non-ally entity id
- [x] 6.4 Unit tests for `partyJoin`: adds a new entity at an authored named location and at the default (pc's position) when `at` is omitted
- [x] 6.5 Unit tests for `showStatus`/`levelUp`: `showStatus` sets the real-content status `ui` variant; `levelUp` sets the narration dialogue `ui` slot; two `showStatus` calls for the same entity with different payloads produce independent resting-state content
- [x] 6.6 Headless precompute test: a script running `partyJoin` → `startBattle` (two allies) → `tagCombatant` (tag one ally `'out'`) → `battleAction`s → `endBattle` asserts each checkpoint's `battle.allies`/`entities` shape, and that `skipTo` a checkpoint following the tag/battle actions reproduces the same allies/tag state as live playback (mirroring the existing `scripted-battle` skipTo-parity test)

## 7. Verification

- [x] 7.1 Run `npm run test` and confirm all tests pass, including the extended `client-talks` suite
- [x] 7.2 Run `npm run build:talks` and confirm zero TypeScript errors
- [x] 7.3 Manually verify in the browser (Playwright screenshot, saved to `/tmp/track-verify/`): a `partyJoin` beat shows the join effect, a two-ally battle renders both HP labels at distinct slots, `tagCombatant` visibly dims the tagged-out ally, `showStatus` renders real stat content (not placeholder text), `levelUp` shows narration text, and `back()`/`skipTo()` across these checkpoints reproduce correct state with no stale content
