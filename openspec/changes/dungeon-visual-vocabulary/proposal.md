## Why

The engine ships **rules and nothing else.** There is no palette in it, no shape
vocabulary, no notion of what "reachable" looks like — so each of its two hosts
invented one, and they drifted.

- The game draws with Phaser. Its colours live in
  `client-games/src/games/dungeon-tactics-solo/boardRender.ts` (terrain,
  structures) and `DungeonTacticsScene.ts` (units, overlays, pips).
- The design bench (harness repo) draws SVG in React, with its own table written
  fresh.

Four of the six unit fills match exactly, which says the bench started by copying
that one table and then stopped. Nothing else was ever reconciled, because nothing
ever asked it to be. Today the same board is sandy gold in one host and pale green
in the other; an enemy is a triangle in one and a circle in the other; movement is
green here and cyan there.

**This is the same shape of problem as the round, one layer up.** Two hosts, one
game, two implementations that drifted — and it takes the same fix: put it in the
engine once, and let both hosts consume it. The design is
`docs/dungeon-harness/reference/visual-palette.md` in the harness repo (step 3d of
its plan of record).

**This is not a crack in the "engine referees, hosts render" invariant.** The
engine gains no drawing code and no framework dependency. A palette is a shared
*reference*, the same way the unit-definition table is — data that both hosts read
and neither owns. What it must never do is decide something a rule decides, which
is why the one entry that comes close (§below) is handled the way it is.

### The one entry that comes close to a rule

An unselected unit's outline encodes something, and the designer's first framing
was *"white = you can select this right now."* That promise is one **neither host
keeps** — the game has a whole requirement for tapping an enemy
(`dungeon-tactics-unit-selection`, "Selecting an NPC opens an info-only popup"),
and the bench selects any unit in any phase.

Answered 2026-08-22: **the outline says whose side the round is soliciting right
now.** That is not a judgement about what the engine would allow; it is the
round's own `phase`, restated for presentation. So the engine publishes the
phase → side table, and a host combines it with the one thing only a host knows —
which sides it offers a seat to. The game seats the player; the bench seats both,
because it drives the enemy by hand.

Asking `availableActions` per unit *looks* like the rule-backed answer and is the
wrong one: it refuses every unit outside the player phase and every enemy always,
so it would paint a bench board black during setup. It answers a narrower
question — "may this unit act through the action surface".

## What Changes

- **`packages/dungeon-engine/src/palette.ts`** — a new module, exported from the
  package index. Data only: no Phaser, no SVG, no DOM, no drawing. Colours are
  declared once as numbers (`0xrrggbb`) with a `css()` helper, because Phaser
  wants numbers and SVG wants `#rrggbb`. One source, two spellings.
- **The engine names the shape vocabulary**: circle = player unit, triangle =
  enemy unit, square = structure. Both hosts already draw structures as squares,
  so this names what is there rather than adding to it.
- **The engine publishes which sides a phase solicits**, as a table keyed by
  `TurnPhase` so a new phase cannot be added without filling it in. It is the
  round's own turn order restated for presentation — published so that no host
  restates it, the same reason the round itself has one implementation.
- **A `./palette` subpath export**, so a browser host can import the vocabulary
  without importing the rules. `palette.ts` imports only types, which is what
  keeps that subpath free of runtime weight — and is why the phase table lives
  there rather than in `turn.ts`, which pulls in two stores.
- **Pip geometry is expressed as ratios of tile size, not pixels.** The game's
  tile is 80px and the bench's is 48px; the game's current absolute values would
  overflow a bench tile. The ratios chosen reproduce the game's present pixels
  exactly at 80px.
- **The game reads the vocabulary instead of declaring it.** `boardRender.ts` and
  `DungeonTacticsScene.ts` stop holding colour constants for anything shared.
- **The game gains the unit's archetype initial** overlaid on its token — the
  bench's letter is good, and the game did not have one.
- **The game's unit outline becomes the live/idle rule.** Its amber NPC ring goes;
  an enemy is idle-black in every phase, and a PC is live-white on its own turn.
- **Nothing the game draws changes colour.** Every shared value in the palette is
  the game's own present value: this change is a repaint for the bench and an
  extraction for the game, plus the two additions named above.

## Capabilities

### Modified Capabilities

- `dungeon-engine-package`: the engine additionally ships the shared visual
  vocabulary both hosts render from.
- `dungeon-tactics-solo`: the game renders from that vocabulary rather than from
  its own constants, and gains the unit initial and the live/idle outline.

## Impact

- `packages/dungeon-engine/src/palette.ts` — new.
- `packages/dungeon-engine/src/palette.test.ts` — new.
- `packages/dungeon-engine/src/index.ts` — the new exports.
- `packages/dungeon-engine/package.json` — the `./palette` subpath export.
- `client-games/src/games/dungeon-tactics-solo/boardRender.ts` — terrain,
  structure and structure-pip colours come from the palette; pip geometry becomes
  ratio-derived.
- `client-games/src/games/dungeon-tactics-solo/DungeonTacticsScene.ts` — unit
  fills, outlines, overlay colours and unit pips come from the palette; the
  archetype initial is added; the outline follows the live/idle rule.
- **The harness repo's bench is the other half** and is a separate change there
  (`dungeon-bench-visual-vocabulary`). Neither repo's work is complete without the
  other's. This one lands first: the bench's design references what this exports.

### Not in scope, deliberately

- **The telegraph marker.** The game draws an orange circle, the bench a
  white-over-black dashed halo whose comment records the three legibility fights
  it won. A known divergence, left open (`visual-palette.md` §9).
- **The tower's blue immunity ring.** The bench does not show immunity at all, and
  the harness `backlog.md` §1 is about to change what immunity *means*. Unifying
  the mark before the rule settles would be drawing the wrong thing consistently.
- **The reach/threat fields' colours.** They answer "which side covers this tile",
  not "what would this unit do", and keep their own side axis — decided
  2026-08-22 (`visual-palette.md` §6). They are a bench feature; the game has no
  equivalent.
- **The game's animation and spawner colours** (projectile, flash, area, spawner
  triangle). The palette is the *shared* vocabulary, not every colour in the game;
  the bench draws none of these.
- **Sprites.** `dungeon-tactics-sprite-rendering` is a separate open change;
  `boardRender.ts` remains its single upgrade point.
