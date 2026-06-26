## Why

Combat pacing feels lethargic. NPCs currently plan their entire turn (move + attack), telegraph the intended movement route as a polyline, and only then execute movement during a separate batched `npc-playback` phase. Because movement is deferred and telegraphed rather than acted on, the NPCs spend a full round closing distance while the player watches static route previews, and the PCs are frequently left too far from the enemy for anything to happen. Moving NPCs immediately, in turn order, tightens the loop and gets units into contact faster while still preserving the readable "what is this enemy about to hit?" telegraph for attacks.

## What Changes

- NPCs move **immediately** during their planning step, one at a time in turn order. When it is an NPC's turn, it examines the current board state, decides its full turn (move + intended attack), and the movement takes effect right away — animated as it commits — before the next NPC plans.
- **Remove NPC movement telegraphing**: the intended-route polyline drawn during a planning overlay for NPC moves is removed. Movement is no longer previewed; it simply happens in turn order.
- **Remove the batched NPC move playback**: movement is no longer deferred to a separate `npc-playback` step that replays every NPC's committed path. Each NPC's move resolves at plan time.
- NPCs **still plan and telegraph their attack decision**. After moving, an NPC stores its intended attack; that attack is rendered/telegraphed (so the player can see what each enemy is about to do) and resolves at the existing attack-resolution point, not during the move.
- Sequencing is strictly turn-ordered: NPC A examines → moves → stores its planned attack → then NPC B examines (against the already-updated board) → moves → stores its planned attack, and so on. Each NPC plans against the board as it stands after all prior NPCs in the round have moved.
- **BREAKING** (internal API): the NPC turn contract changes. `computeNpcPlans` / `beginNpcPlayback` / `resolveNpcAction` no longer model movement as a deferred, replayed step; movement and attack-planning are split so movement executes per-NPC at plan time and only the attack is carried forward as a telegraphed intent.

## Capabilities

### New Capabilities
<!-- None — this modifies the existing solo combat behavior. -->

### Modified Capabilities
- `npc-archetypes`: The "NPC movement via committed A* path" requirement changes — movement is executed immediately in turn order at plan time rather than committed and replayed during a batched playback phase, and the intended-route movement polyline telegraph is removed. Attack planning/telegraphing for each archetype is unchanged.
- `dungeon-tactics-solo`: The NPC turn-flow requirements change — the `TurnPhase`/playback model no longer batches NPC movement into an `npc-playback` replay step; NPCs move immediately and per-NPC in turn order, and only the planned attack is telegraphed and resolved separately.

## Impact

- **Code**: `client-games/src/games/dungeon-tactics-solo/npc.ts` (`computeNpcPlans`, `beginNpcPlayback`, `resolveNpcAction`, `NpcAction` shape), `turn.ts` (phase transitions / turn sequencing), `types.ts` (`TurnPhase`, `NpcAction`, planned-attack/intent fields), `DungeonTacticsScene.ts` and the HUD/overlay rendering (remove NPC move route polyline; keep attack telegraph), and `DungeonTacticsGame.tsx` (drive per-NPC turn-order stepping instead of batched playback).
- **Tests**: `npc.test.ts` (and any playback/turn tests) need updating for the new immediate-move, attack-only-telegraph flow.
- **No** backend, DB, API, or deploy changes — this is client-side game logic and rendering only.
