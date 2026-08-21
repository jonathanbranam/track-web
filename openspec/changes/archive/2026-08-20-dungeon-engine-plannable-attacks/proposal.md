## Why

`commitNpcTurn` lets a host author an enemy's turn: a move plus an optional
attack, validated with the attack checked from the enemy's **post-move**
position. But nothing exposes that post-move target set as a query. A host can
only discover which attacks are legal by attempting one and reading the refusal.

The harness's phase 3b (`dungeon-bench-enemy-planning`) is the first consumer
that needs it. Its whole purpose is letting a designer author enemy turns, and a
design tool that cannot show which tiles an enemy could attack from a prospective
destination leaves the designer guessing — the same blindness
`dungeon-tactics-action-surface` removed for player characters, where
`availableActions` reports every legal target up front.

The computation already exists inside `commitNpcTurn`. This exposes it.

## What Changes

- A query reporting which tiles an enemy could attack **if** it made a given
  move — the same move choice `commitNpcTurn` accepts, evaluated without
  committing anything.
- It derives its answer from the same code path `commitNpcTurn` validates
  against, so a host cannot be offered a tile the commit would then refuse.

Purely additive. No existing behaviour changes and no host is touched.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `dungeon-tactics-turn-sequencer`: the query surface gains post-move attack
  targets for a prospective enemy plan, alongside the existing next-step,
  unplanned-enemy, and locked-telegraph queries.

## Impact

- `packages/dungeon-engine/src/sequencer.ts` — one query, reusing the post-move
  evaluation `commitNpcTurn` already performs.
- `packages/dungeon-engine/src/index.ts` — one export.
- No host changes. `client-games` is untouched; the harness consumes this in its
  own change.
