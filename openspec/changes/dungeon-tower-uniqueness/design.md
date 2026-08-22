## Context

See `proposal.md — Why`. Two facts about the board that the engine relies on but
has never enforced:

1. There is at most one tower. `npc.ts:127-136` keeps a single `towerPos`;
   `turn.ts:42`'s `isTowerImmune` and `npc.ts`'s `resolveTargetPos` both read
   "the tower" as a singular thing.
2. There is at least one tower. Nothing anywhere says this, and it only became
   visible when the bench's board generator turned out to produce none.

Power centers are the opposite: `isTowerImmune` is *defined* by counting them
(two or more makes the tower immune), so constraining them would delete a rule.
The first draft of the harness's usability note had these two structure kinds
the wrong way round; the correction is recorded in
`harness/docs/dungeon-harness/harness-rebuild/usability.md` §6.

## Goals / Non-Goals

**Goals:**

- The engine refuses a second tower at the moment of authoring, with a sentence
  a host can display verbatim.
- The engine refuses to start a towerless scenario, for both hosts, with the
  same kind of sentence.
- The shipped game shows that sentence rather than doing nothing.

**Non-Goals:**

- **Changing `isTowerImmune` or the power-center count.** Power centers stay
  unconstrained; the immunity rule is untouched.
- **A general scenario validator.** This adds one precondition to
  `startScenario`, not a validation framework. Other properties a scenario might
  need (units on both sides, a reachable objective) are not in scope and should
  not be smuggled in alongside.
- **Migrating or repairing saved maps.** A saved user map with no tower stops
  being startable, and the player is told why. The established policy across this
  work is *refuse with a reason, do not migrate*.
- **Content-editor validation.** The map editor may still author a towerless map;
  it just cannot be started. Warning at authoring time is a reasonable follow-on
  and is deliberately not here.
- **The harness side.** Board generation and the palette are the consumer's
  change (`dungeon-bench-setup-boundary` in the sibling repo).

## Decisions

### One helper, three call sites

`turn.ts` already holds `powerCenterCount`. Add `towerTiles(cells)` there
returning every tower's tile, and express the rest in terms of it:

- `placeStructure` refuses when `kind === 'tower'` and `towerTiles(cells).length > 0`.
- `startScenario` refuses when `towerTiles(state.cells).length === 0`.
- `npc.ts`'s planning-context scan becomes `towerTiles(cells)[0] ?? null`.

**Alternative rejected:** a `hasTower` boolean. It would leave `npc.ts`'s own
scan in place as a fourth spelling of the same loop, which is how the engine came
to hold the assumption in three places without stating it once.

Rewriting `npc.ts`'s scan is behavior-preserving — it already takes the first
tower in row-major order, which is what `towerTiles` returns first — and is worth
doing here because it is the site that made the assumption invisible.

### The tower rule is checked on placement, not on move or remove

- `placeStructure` — checked. This is the only operation that can *create* a
  second tower.
- `moveStructure` — not checked. Moving the one tower leaves one tower.
- `removeStructure` — not checked. Removing the tower is allowed; the scenario
  simply cannot be started until one is back. Refusing removal instead would
  make a misplaced tower unfixable, since there is no swap operation.

That asymmetry is deliberate and is why the required-tower half lives at
`startScenario` rather than at `removeStructure`: **authoring may pass through
an invalid state; starting may not.**

### Refusal wording

Match the existing authoring refusals in `scenario.ts`, which name the tile and
say what is wrong:

- Second tower: `A board has one tower, and (3, 4) already holds it.` — naming
  the existing tower's tile, because the designer's next move is to look at it.
- No tower: `A scenario needs a tower — a board with none is already lost.`

`ScenarioResult` and `SequencerResult` both carry `{ ok: false, reason }`
already; no shape changes.

### The game shows the reason in the status pill

`StatusPill` already renders top-center and already owns the placement prompt
(`Place your units`). A refused start replaces that text with the reason until
the next successful start.

```
DungeonTacticsGame  ──(startRefusal: string | null)──▶  Hud  ──▶  StatusPill
```

`handlePlacementDone` sets `startRefusal` from `result.reason` on refusal, and
clears it on success. `StatusPill` takes an optional `refusal` prop and prefers
it over the phase text.

**Alternatives rejected:**

- *A toast or new banner component.* A second message surface for one sentence,
  when the pill exists, is in the right place, and is empty during the player
  phase anyway.
- *Disabling Start when there is no tower.* It hides the reason, and the HUD
  would then be deciding a game rule locally — the thing this whole line of work
  is undoing. The engine refuses; the host reports.
- *Leaving `if (!result.ok) return`.* Rejected in the proposal: it is what makes
  the shared rule dishonest.

### Failing tests are re-aimed, never weakened

Existing fixtures that author a board and start it may have no tower. Those
fixtures get a tower — they are describing "a scenario that starts", and a
towerless one no longer is. Any test that turns out to be *asserting* that a
towerless scenario starts is asserting behavior this change removes, and must be
deleted with that said explicitly, not quietly adjusted.

## Risks / Trade-offs

- **A saved user map with no tower becomes unplayable.** Accepted, deliberately,
  with the reason shown to the player. See `proposal.md — Why startScenario`.
- **`bundledMap` is the only map under test.** It has a tower, so the game's own
  path is covered but the towerless case is only covered by unit tests. Browser
  verification of the refusal needs a hand-authored towerless map.
