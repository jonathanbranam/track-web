# Design — the shared visual vocabulary

Decisions already made. **Implement them as written; do not re-decide them.**
The reasoning behind each lives in the harness repo's
`docs/dungeon-harness/reference/visual-palette.md`, which is the design of record
for step 3d.

## 1. The module's shape

`packages/dungeon-engine/src/palette.ts`, exported from `index.ts`.

**Data, not drawing.** No import of Phaser, React, or any DOM type. The engine's
Node-environment test already fails on a browser global; this module must not be
the thing that breaks it.

Colours are `number` (`0xrrggbb`) because Phaser wants numbers, with one helper:

```ts
/** `0xd4a853` → `'#d4a853'`. The SVG host's spelling of the same value. */
export function css(color: number): string
```

Zero-pad to six digits — `css(0x00ff88)` is `'#00ff88'`, not `'#ff88'`. There is a
test for exactly that.

## 2. What it exports

Every value below is **the game's present value**. Nothing the game draws changes
colour in this change; the bench is the host that repaints.

```ts
export const TERRAIN: Record<TerrainType, number>
//   plains 0xd4a853 · forest 0x2d6a2f · water 0x2b72b5 · stone 0x7d7d7d

export const STRUCTURE_FILL: Record<StructureKind, number>
//   'power-center' 0x8b5a2b · 'tower' 0xd4a000
export const TOWER_CROSS = 0xffffff

export const UNIT_FILL: Record<PcType | NpcType, number>
//   melee 0x4a90e2 · ranger 0x2ecc71 · magic-user 0x9b59b6 · rogue 0xe67e22
//   short-range 0xe24a4a · long-range 0xcc8800

export const UNIT_INITIAL: Record<PcType | NpcType, string>
//   melee 'M' · ranger 'R' · magic-user 'W' · rogue 'G'
//   short-range 's' · long-range 'l'

export type PieceShape = 'circle' | 'triangle' | 'square'
export const UNIT_SHAPE: Record<UnitKind, PieceShape>   // pc circle, npc triangle
export const STRUCTURE_SHAPE: PieceShape                 // square

/** The three corners of a unit triangle, as offsets from the token's centre,
 *  for a token of radius `r`: `[[0, -r], [0.87r, 0.7r], [-0.87r, 0.7r]]` — the
 *  proportions the game draws today.
 *
 *  Geometry, not drawing: it returns numbers and knows nothing about how they
 *  are stroked. It exists because *token radius* is each host's own call (an
 *  80px tile and a 48px one want different fractions of themselves) while the
 *  *shape* is vocabulary, and two hosts deriving a triangle independently is the
 *  drift this change is about. */
export function trianglePoints(r: number): Array<[number, number]>

export const OUTLINE = {
  live: 0xffffff,          // the round is soliciting this side
  idle: 0x000000,          // it is not
  selected: 0xffff00,      // the selected piece's inner ring
  selectedBacking: 0x000000, // and the ring drawn outside it
}

export const OVERLAY = {
  move:   { color: 0x00ff88, fillAlpha: 0.15 },
  attack: { color: 0xff6600, fillAlpha: 0.15 },
}

export const PIP = {
  widthRatio: 0.075,
  gapRatio: 0.025,
  insetRatio: 0.0375,        // from the tile's left edge
  bottomRatio: 0.05,         // from the tile's bottom edge
  maxHeightRatio: 0.125,
  maxColumnRatio: 0.5375,    // the whole column never exceeds this much of a tile
  emptyStroke: 0x333333,
}
export const STRUCTURE_PIP_FILL: Record<StructureKind, number>
//   'power-center' 0x22cc44 · 'tower' 0xffdd44

export function pipHeightRatio(maxHp: number): number
```

### Why the pip numbers are ratios, and why those ratios

The game's tile is 80px and the bench's is 48px. The game's absolute pip height of
10px, five times over for a tower, is 50px of pips in a 48px tile — it does not
fit, which is why the game already has a second magic number (`isTower ? 7 : 10`).
Ratios fix both problems at once.

`pipHeightRatio(maxHp)` is:

```
min(maxHeightRatio, (maxColumnRatio - (maxHp - 1) * gapRatio) / maxHp)
```

`maxColumnRatio` is `0.5375` **because that value reproduces the game's present
pixels exactly at an 80px tile**, so this is an extraction and not a redesign:

- `maxHp 3` → `min(0.125, (0.5375 − 0.05) / 3 = 0.1625)` = `0.125` → **10px** ✓
- `maxHp 5` → `min(0.125, (0.5375 − 0.10) / 5 = 0.0875)` = `0.0875` → **7px** ✓

There is a test asserting both.

## 3. The outline rule

**The outline says whose side the round is soliciting right now** — not "can I
select this". See the proposal's "The one entry that comes close to a rule" for
why the original framing was narrowed, and note that the colours and the
designer's table did not change when it was.

It is assembled from three things, and the split matters:

| Fact | Who owns it |
|---|---|
| which sides this phase solicits | **the engine** — it is the round's own `phase` |
| which side a unit is on | the engine — `unit.kind` |
| which sides this host offers a seat to | **the host**, and only the host |

So the engine publishes the table, and `palette.ts` is where it lives:

```ts
/** Which sides the round is soliciting input for, by phase.
 *
 *  This is the round's own turn order, published so that **no host restates
 *  it** — the same reason the round itself has one implementation. It is not a
 *  new rule and it decides nothing: `sequencer.ts` still owns every phase
 *  transition, and this only names whose side each phase belongs to.
 *
 *  A `Record` and not a switch, deliberately: adding a `TurnPhase` fails to
 *  compile until this table answers for it.
 *
 *  It lives in this module rather than beside the sequencer because
 *  presentation is its only consumer, and because this module imports nothing
 *  but types — which is what lets a browser host import the vocabulary without
 *  pulling the engine's stores in behind it (§7). */
export const SOLICITED_SIDES: Record<TurnPhase, UnitKind[]> = {
  placement:    ['pc', 'npc'],  // the bench's authoring surface places either side
  player:       ['pc'],
  'npc-move':   ['npc'],
  'npc-attack': ['npc'],
}
export function solicitedSides(phase: TurnPhase): UnitKind[]
```

and `palette.ts` carries the mapping to a colour:

```ts
export type OutlineRole = 'live' | 'idle'
/** `seats` is what only the host knows: the game seats `['pc']`; the design
 *  bench seats `['pc', 'npc']`, because it drives the enemy by hand. */
export function outlineRole(opts: {
  phase: TurnPhase
  side: UnitKind
  seats: UnitKind[]
}): OutlineRole
```

`'live'` exactly when the phase solicits that side **and** the host seats it.

This reproduces the designer's table without either host holding a rule:

| Host | Phase | PC | NPC |
|---|---|---|---|
| game (`seats: ['pc']`) | placement | live | idle |
| game | player | live | idle |
| game | npc-move / npc-attack | idle | idle |
| bench (`seats: ['pc','npc']`) | placement | live | live |
| bench | player | live | idle |
| bench | npc-move / npc-attack | idle | live |

The game's row for the npc phases — everything idle — is correct and is a small
visible change during NPC playback: it is nobody's turn to act, and the board now
says so.

## 4. Selection is two rings, not one

The selected piece takes `OUTLINE.selected` (yellow) with `OUTLINE.selectedBacking`
(black) drawn **outside** it. Yellow alone is what the game does today and it works
on the game's board; a black band underneath raises contrast against pale terrain
and pale unit fills, which is where the bench's mark became invisible. It is the
same trick the bench's telegraph halo already uses, for the same reason.

**Token radius and stroke widths are not in the palette.** They are a function of pixel density —
the game's tile is 80px, the bench's 48px — not of vocabulary. Each host picks a
radius and widths that read on its own board. What the vocabulary fixes is the
*shape* (via `trianglePoints`, which takes whatever radius the host chose) and
*two rings, yellow inside black*.

The selected mark replaces the live/idle outline on that piece; it does not stack
with it.

## 5. What the game gains, beyond the extraction

1. **The archetype initial**, overlaid on the token, white, centred — the same
   letters the bench already draws (`UNIT_INITIAL`). The game already renders a
   turn-order number at the token's upper left; the initial is centred, so the two
   do not collide. **On a triangle, centre it on the centroid, not the token
   origin** — the centroid sits about `0.13r` below centre, and a letter placed at
   the origin rides high in the apex where the shape is narrowest.
2. **The live/idle outline**, replacing `PC_STROKE` / `NPC_STROKE`. The amber NPC
   ring (`0xffcc00`) goes.

Everything else in the game is byte-identical output: same fills, same overlays,
same pip pixels.

## 6. Alternatives considered

- **Ask `availableActions` per unit for the outline.** Rejected: it refuses every
  unit outside the player phase and every enemy always, so a bench board in setup
  would be entirely black — contradicting two rows of the designer's table. It
  answers "may this unit act through the action surface", which is narrower than
  "is the round soliciting this side".
- **Let each host keep its own terrain.** Rejected 2026-08-22 by the designer:
  the game's fills win wholesale. The named risk is that the bench's reach/threat
  washes were tuned against a pale board and may go muddy over dark-green forest.
  **If that happens, the wash opacities get retuned — not the terrain**, and the
  retune belongs in whichever host owns the fields (the bench; the game has none).
- **Put the phase → sides table beside the sequencer, or in `turn.ts`.**
  Considered at length and rejected for a concrete reason, not a stylistic one:
  `turn.ts` imports `contentStore` and `defStore`, so a browser host importing the
  vocabulary would drag the engine's stores into its bundle (§7). `types.ts` is
  the other candidate and is pure types today — adding the first runtime value to
  it would change that. So it sits in `palette.ts`, which imports only types, with
  a comment saying plainly that it restates the round's turn order and decides
  nothing.
- **Let the bench hand-mirror the palette**, the way `client-dungeon/src/bench/
  types.ts` already hand-mirrors the engine's types. Rejected outright: a
  hand-copied colour table is precisely the drift this change exists to end, and
  it is how the two hosts got here.
- **Ship the palette to the bench over its websocket**, alongside the unit
  definitions `BenchState` already carries. Workable, and it would have needed no
  build-system change at all — but it makes static data arrive asynchronously,
  forces a mirrored *type* in the client anyway, and is a larger change to the
  bench's rendering than importing the module is. Rejected as more plumbing for
  less directness.
- **Absolute pip pixels, scaled by the host.** Rejected: the game already needs
  two magic heights to fit five tower pips in its own tile, and the bench's tile
  is smaller still. Ratios remove both.
- **Put every colour the game draws into the palette** (spawners, projectiles,
  damage flashes). Rejected: the bench draws none of them, so they are not shared
  vocabulary — they are the game's own presentation, and moving them would make
  the palette a dumping ground rather than a contract.

## 7. How the browser hosts reach the vocabulary

The game is in this repo and imports the engine already; nothing to arrange.

The **bench** is in the harness repo, and today only its *server* depends on
`@repo/dungeon-engine` — the bench client hand-mirrors the engine's types by hand
(`client-dungeon/src/bench/types.ts` says so at the top). Letting it hand-mirror
the palette too would recreate the exact drift this change exists to end, so it
must import the real thing.

**This change adds the subpath that lets it**, and nothing more:

```jsonc
// packages/dungeon-engine/package.json
"exports": {
  ".": "./src/index.ts",
  "./palette": "./src/palette.ts"
}
```

Two reasons it is a subpath and not the barrel:

1. **The client gets the vocabulary, not the rules.** In the harness the engine
   lives on the *server*; a browser bundle carrying the rules engine would blur
   the one boundary that repo is built around.
2. `palette.ts` imports **only types**, so the subpath pulls in nothing at
   runtime. This is why `SOLICITED_SIDES` is here rather than in `turn.ts`, which
   imports `contentStore` and `defStore` and would have dragged both into a
   browser bundle.

Keep it that way: **`palette.ts` must never import a module with runtime
state.** If it ever needs to, the subpath stops being cheap and the harness side
has to be reconsidered.

The rest of the arrangement — the dependency entry, Vite's file-serving allow
list — is the harness change's problem, not this one's. Verified there: Vite
currently refuses the path with a 403.
