## Context

See `proposal.md` — Why, and the full audit in the sibling harness repo at `docs/dungeon-harness/harness-rebuild/action-surface-plan.md`.

Two constraints shape the approach:

**The engine's stores are process-global singletons.** `contentStore` (board grid) and `defStore` (unit stats) are module-level, read by import rather than by argument. The new module inherits that; instance-scoping is a separate, deferred effort. Tests must therefore apply a board before asserting anything.

**Existing exports have three live consumers**, one of them in another repo. Nothing here may break them: this change is purely additive, and the migrations happen in `dungeon-game-action-adoption` and the harness's `dungeon-bench-action-adoption`.

## Goals / Non-Goals

**Goals:**
- One derivation of "what may this unit do" that every host shares.
- Validation on commit, so the renderer is no longer the enforcement layer.
- A shape the turn machine can produce later without the UI being rewritten.

**Non-Goals:**
- Migrating any host (two follow-on changes).
- The round/phase sequencer and the NPC telegraph window — the largest finding in the audit, deliberately deferred.
- Instance-scoping the engine.
- Win/lose evaluation.

## Decisions

### Commit against a tile; `Direction` becomes internal

The alternative — keep `Direction` in the signature and merely share the tile→direction helper — was rejected because it leaves the failure mode reachable: a host can still build a direction picker, which is exactly what the bench did for an attack the game targets by tile. Removing `Direction` from the surface makes the divergence unrepresentable rather than merely discouraged.

Direction resolution moves inside the engine, membership-checked. The existing bug (axis alignment assigning a direction without checking the tile is covered) is fixed by construction: resolution scans the four footprints for one containing the tile and returns nothing if none does.

Ambiguity is possible in principle — one tile covered by two directions' footprints. The engine SHALL resolve deterministically by scanning in a fixed order (up, down, left, right) and taking the first match. For today's three shapes the only overlap is a `plus` whose arms meet, where both choices cover the same tiles, so the choice is unobservable. This is documented in the module rather than left implicit, because a future shape could make it observable.

### `availableActions` returns unavailable actions too

Filtering them out would force each host to reconstruct the disabled state, which is finding 8 in the audit. Returning them with a reason is what lets the game's HUD and the bench's control row render identically without either knowing why an action is blocked.

### `ActionId` is a closed union, not an open string

`'move' | 'attack'`. Adding an action becomes a typed change that fails the build at every site that must handle it. When the turn machine arrives, its guarded transitions map onto this shape — a list of legal next actions with conditions — so the UI written against this surface survives the rules-layer swap.

### `effects` is a discriminated union from the start

A damage-only shape would have to be torn out the moment an attack applies a status or changes terrain. The union costs nothing now and means adding an effect kind extends rather than reshapes the contract. `hitsNothing` is a separate advisory flag, never an availability input — an attack that hits nothing stays legal, because a player may be aiming deliberately and future attacks will have non-damage purposes.

### `commitAction` returns a result, never throws

Both hosts already surface rejection text to a human — the bench to the designer and the agent, the game (after adoption) to the player. A thrown error would force try/catch at every call site and lose the reason. `{ ok: true, state } | { ok: false, reason }` keeps the reason on the normal path.

### Validation delegates to the existing resolvers

`commitAction` validates and then calls `applyMove` / `resolvePcAction` / `resolveNpcAction`, rather than reimplementing resolution. Those functions stay exported for now — the Gherkin steps and the harness bench still use them until their adoption changes land. Tightening or hiding them is a later cleanup, not part of this change.

### NPC attacks resolve against one tile; PC attacks resolve over the footprint

This asymmetry is existing engine behaviour, not something introduced here: a PC attack damages every NPC and structure in its footprint, while an NPC attack resolves against a single target cell. `commitAction` preserves it, dispatching on `unit.kind`. Erasing the asymmetry would be a rules change and belongs nowhere near this change.

### `threatTiles` is backed by the real scanners

`findShortRangeTarget` / `findLongRangeTarget` in `npc.ts` are private and walk `minRange`→`maxRange` along each cardinal, stopping at the first blocker. Exposing a query over the same walk removes the harness's documented approximation. The query reports the targeting band (an upper bound that ignores blocking) rather than the blocked result, because the consumer is a "what can reach me" overlay where understating danger is the worse error — and because a blocking-aware answer changes as units move, which would make the overlay flicker mid-turn.

## Risks / Trade-offs

- **[The action surface duplicates validation the resolvers should own]** → Accepted for now. Resolvers stay permissive so existing consumers keep working; once all three migrate, validation can move down and the resolvers can be narrowed. Recorded as a follow-up, not silently left.
- **[Direction ambiguity could become observable if a new attack shape overlaps itself]** → Fixed scan order is documented and tested, so the behaviour is defined rather than incidental.
- **[`previewAction` re-derives resolution logic and could drift from `resolvePcAction`]** → Mitigated by a test asserting that a preview's reported effects match the state change an actual commit produces, for each archetype. This is the same drift the audit found between the animations and `attackFootprint`; a test is the only thing that keeps them honest.
- **[Singleton stores mean tests leak board state into each other]** → Each test applies its own board first, matching how `npc.test.ts` and the harness bench already work.

## Migration Plan

Additive; nothing to migrate. The change is complete when the engine exports the new surface with tests and the existing test suite still passes. Rollback is removing the module and its exports — no host depends on it until the two adoption changes land.
