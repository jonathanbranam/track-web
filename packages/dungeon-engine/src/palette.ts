// The shared visual vocabulary: everything a rendering host needs to draw the
// board the same way the game does — terrain and structure fills, unit fills
// and shapes, outline and selection colours, overlay colours, and HP pip
// geometry — published once so two hosts stop inventing it independently.
//
// Data, not drawing: no Phaser, no React, no DOM type, and no function that
// draws anything. Every colour here is a `number` (`0xrrggbb`) because Phaser's
// canvas API wants numbers; `css()` is the same value spelled the way an SVG
// host wants it.
//
// This module imports **only types**, and must keep doing so: a `./palette`
// subpath export (see `package.json`) lets a browser host that only renders —
// the design bench — take the vocabulary without taking the rules engine's
// turn sequencing, action surface, or in-memory stores with it. A runtime
// import here would drag those in behind it. See design.md §7 in the
// `dungeon-visual-vocabulary` change for the reasoning.

import type { NpcType, PcType, TerrainType, TurnPhase, UnitKind } from './types'
import type { StructureKind } from './scenario'

// ─── Colour spelling ────────────────────────────────────────────────────────

/** `0xd4a853` → `'#d4a853'`. The SVG host's spelling of the same value.
 *  Zero-pads to six hex digits: `css(0x00ff88)` is `'#00ff88'`, not `'#ff88'`. */
export function css(color: number): string {
  return '#' + color.toString(16).padStart(6, '0')
}

// ─── Terrain and structures ─────────────────────────────────────────────────
//
// Every value in this section is the game's present value, read off
// `boardRender.ts`. Nothing the game draws changes colour in this change.

export const TERRAIN: Record<TerrainType, number> = {
  plains: 0xd4a853,
  forest: 0x2d6a2f,
  water: 0x2b72b5,
  stone: 0x7d7d7d,
}

export const STRUCTURE_FILL: Record<StructureKind, number> = {
  'power-center': 0x8b5a2b,
  tower: 0xd4a000,
}
/** The tower's cross — the mark that keeps the board's objective from reading
 *  as ordinary scenery. Geometry as well as colour, because a host left to pick
 *  its own arm length and stroke weight picks a different one: the bench's first
 *  attempt was half again as long and twice as thick as the game's, which turned
 *  a marked tower into a tile-filling plus. Ratios are of tile size, so both
 *  hosts draw the same cross at their own scale; these reproduce the game's
 *  present pixels exactly at 80px (arm 17.6, thickness 4). */
export const TOWER_CROSS = {
  color: 0xffffff,
  armRatio: 0.22, // half-length of each arm
  thicknessRatio: 0.05,
  opacity: 0.7,
}

// ─── Units ───────────────────────────────────────────────────────────────────
//
// Fills are the game's present value, read off `DungeonTacticsScene.ts`.
// Initials are the design bench's, which the game did not have before.

export const UNIT_FILL: Record<PcType | NpcType, number> = {
  melee: 0x4a90e2,
  ranger: 0x2ecc71,
  'magic-user': 0x9b59b6,
  rogue: 0xe67e22,
  'short-range': 0xe24a4a,
  'long-range': 0xcc8800,
}

export const UNIT_INITIAL: Record<PcType | NpcType, string> = {
  melee: 'M',
  ranger: 'R',
  'magic-user': 'W',
  rogue: 'G',
  'short-range': 's',
  'long-range': 'l',
}

export type PieceShape = 'circle' | 'triangle' | 'square'

/** pc = circle, npc = triangle — the shapes both hosts already draw units as. */
export const UNIT_SHAPE: Record<UnitKind, PieceShape> = {
  pc: 'circle',
  npc: 'triangle',
}
export const STRUCTURE_SHAPE: PieceShape = 'square'

/** The three corners of a unit triangle, as offsets from the token's centre,
 *  for a token of radius `r` — the proportions `renderNpc` draws today.
 *
 *  Geometry, not drawing: it returns numbers and knows nothing about how they
 *  are stroked. It exists because *token radius* is each host's own call (an
 *  80px tile and a 48px one want different fractions of themselves) while the
 *  *shape* is vocabulary, and two hosts deriving a triangle independently is
 *  the drift this change is about. */
export function trianglePoints(r: number): Array<[number, number]> {
  return [
    [0, -r],
    [0.87 * r, 0.7 * r],
    [-0.87 * r, 0.7 * r],
  ]
}

// ─── Outlines, selection, and overlays ──────────────────────────────────────

export const OUTLINE = {
  live: 0xffffff, // the round is soliciting this side
  idle: 0x000000, // it is not
  selected: 0xffff00, // the selected piece's inner ring
  selectedBacking: 0x000000, // and the ring drawn outside it
}

export const OVERLAY = {
  move: { color: 0x00ff88, fillAlpha: 0.15 },
  attack: { color: 0xff6600, fillAlpha: 0.15 },
}

// ─── HP pips ─────────────────────────────────────────────────────────────────
//
// Expressed as ratios of tile size, not pixels, because the game's tile is
// 80px and the bench's is 48px — the game's absolute pixel values (a pip
// height of 10px, or 7px for the tower's five) would overflow a 48px tile.
// The ratios below reproduce the game's present pixels exactly at 80px; see
// `pipHeightRatio`.

export const PIP = {
  widthRatio: 0.075,
  gapRatio: 0.025,
  insetRatio: 0.0375, // from the tile's left edge
  bottomRatio: 0.05, // from the tile's bottom edge
  maxHeightRatio: 0.125,
  maxColumnRatio: 0.5375, // the whole column never exceeds this much of a tile
  emptyStroke: 0x333333,
}

export const STRUCTURE_PIP_FILL: Record<StructureKind, number> = {
  'power-center': 0x22cc44,
  tower: 0xffdd44,
}

/** The pip height, as a fraction of tile size, for a piece with `maxHp` pips
 *  stacked in its column. Chosen so the column never exceeds `maxColumnRatio`
 *  of the tile regardless of how many pips it holds, while never drawing a
 *  pip taller than `maxHeightRatio`.
 *
 *  `maxColumnRatio` (`0.5375`) is chosen to reproduce the game's present
 *  pixels exactly at its 80px tile — this is an extraction, not a redesign:
 *  `pipHeightRatio(3) * 80 === 10` (a PC/NPC/power-center's three pips, the
 *  game's existing 10px) and `pipHeightRatio(5) * 80 === 7` (a tower's five,
 *  the game's existing 7px special case). */
export function pipHeightRatio(maxHp: number): number {
  return Math.min(PIP.maxHeightRatio, (PIP.maxColumnRatio - (maxHp - 1) * PIP.gapRatio) / maxHp)
}

// ─── Which side a phase solicits ────────────────────────────────────────────

/** Which sides the round is soliciting input for, by phase.
 *
 *  This is the round's own turn order, published so that **no host restates
 *  it** — the same reason the round itself has one implementation. It is not
 *  a new rule and it decides nothing: `sequencer.ts` still owns every phase
 *  transition, and this only names whose side each phase belongs to.
 *
 *  A `Record` and not a switch, deliberately: adding a `TurnPhase` fails to
 *  compile until this table answers for it.
 *
 *  It lives in this module rather than beside the sequencer because
 *  presentation is its only consumer, and because this module imports
 *  nothing but types — which is what lets a browser host import the
 *  vocabulary without pulling the engine's stores in behind it (see the
 *  module header). */
export const SOLICITED_SIDES: Record<TurnPhase, UnitKind[]> = {
  placement: ['pc', 'npc'], // the bench's authoring surface places either side
  player: ['pc'],
  'npc-move': ['npc'],
  'npc-attack': ['npc'],
}

export function solicitedSides(phase: TurnPhase): UnitKind[] {
  return SOLICITED_SIDES[phase]
}

export type OutlineRole = 'live' | 'idle'

/** `seats` is what only the host knows: the game seats `['pc']`; the design
 *  bench seats `['pc', 'npc']`, because it drives the enemy by hand.
 *
 *  `'live'` exactly when the phase solicits that side **and** the host seats
 *  it. This is presentation, not legality: it does not ask whether the unit
 *  could act, only whose side the round is currently soliciting. */
export function outlineRole(opts: { phase: TurnPhase; side: UnitKind; seats: UnitKind[] }): OutlineRole {
  const { phase, side, seats } = opts
  return solicitedSides(phase).includes(side) && seats.includes(side) ? 'live' : 'idle'
}
