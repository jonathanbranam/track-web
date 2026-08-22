## Why

A board has exactly one tower, and any number of power centers including none.
The engine has always half-believed this and never said it:

```ts
// npc.ts:127-136 — the planning context
let towerPos: { col: number; row: number } | null = null
for (let r = 0; r < planRows && towerPos === null; r++)
  for (let c = 0; c < planCols && towerPos === null; c++)
    if (cells[r][c].hasStructure && cells[r][c].structureKind === 'tower') towerPos = { col: c, row: r }
```

`towerPos` is **one tile, not a list**. A board with two towers does not make the
enemy AI target both — it makes the AI silently ignore one, whichever the scan
reaches second. `isTowerImmune` (`turn.ts:42`) likewise speaks of "the tower",
singular. `bundledMap` obeys the rule: one tower, five power centers.

So this is not a new constraint being imposed on the engine. It is an assumption
the engine already makes, written down and enforced, before the design bench in
the sibling `harness` repo starts letting a designer author boards freely and
discovers the hard way that the second tower they placed does nothing.

The other half is that **a tower is required**. No tower is the end of the game,
not the start of one. Today nothing says so, and the bench's own board generator
(`board-gen.ts`) produces boards with no tower at all.

## What Changes

- **`scenario.placeStructure` refuses a second tower**, with a reason, the way
  every other authoring refusal reads. Power centers stay unconstrained: zero is
  a valid scenario, so is any number.
- **`scenario.moveStructure` is unaffected** — moving the one tower does not
  create a second. Stated because it is the obvious place to over-apply the rule.
- **`sequencer.startScenario` refuses a scenario with no tower standing**, with a
  reason, **for both hosts**. This is the half that reaches the shipped game.
- **The game surfaces that refusal instead of swallowing it.**
  `DungeonTacticsGame.tsx:420` currently reads `if (!result.ok) return`, so a
  towerless map would make Placement Done look like a dead button. The reason
  goes to the status pill, which already sits top-center during placement.

### Why `startScenario`, given it is shared

Putting the required-tower rule in `startScenario` means a **saved user map with
no tower stops being startable**. That was the decision to make, and it was made
deliberately: one rule, one implementation, both hosts.

The alternative was to enforce it only where scenarios are authored — a
bench-only rule. The harness's plan of record
(`docs/dungeon-harness/harness-rebuild/phase-5-correction.md` §0) is explicit
that bench exceptions are argued back **one at a time, and only when argued**;
"it was more convenient" is exactly the reasoning that produced the exception
that plan exists to delete. A tower is a game rule, so it lives with the game
rules.

Fixing the game's silent return is therefore not optional politeness — it is what
keeps the decision honest. A refusal nobody can see is a dead button.

## Capabilities

### Modified Capabilities

- `dungeon-tactics-scenario-setup`: structure authoring gains the tower rule.
- `dungeon-tactics-turn-sequencer`: starting a scenario gains a precondition.
- `dungeon-tactics-hud`: the status pill carries a refused start's reason, and
  the Start control's outcome is no longer unconditional.

## Impact

- `packages/dungeon-engine/src/scenario.ts` — `placeStructure` tower check.
- `packages/dungeon-engine/src/sequencer.ts` — `startScenario` tower precondition.
- `packages/dungeon-engine/src/turn.ts` — a shared `towerCount`/`findTower`
  helper, since three call sites now scan for the same thing.
- `packages/dungeon-engine/src/scenario.test.ts`, `sequencer.test.ts` — new cases.
- `client-games/src/games/dungeon-tactics-solo/DungeonTacticsGame.tsx` — hold the
  refusal reason instead of discarding it.
- `client-games/src/games/dungeon-tactics-solo/hud/Hud.tsx`, `hud/StatusPill.tsx`
  — thread and render it.
- **Not touched:** `bundledMap` (already one tower), `isTowerImmune` and the
  power-center count it reads, the enemy AI's targeting.
- **Consumer, landing as its own change in the sibling `harness` repo:**
  `dungeon-bench-setup-boundary` adopts this — `board-gen.ts` places exactly one
  tower so a generated board is a valid start state, and the palette disables the
  tower entry once one is placed. **Neither repo's work is complete without the
  other's**, and this change should not be archived before that one is verified.
