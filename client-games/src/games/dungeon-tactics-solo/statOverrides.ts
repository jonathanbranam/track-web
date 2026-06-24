import type { PcType, NpcType } from './types'
import { unitDefs } from './unitDefs'

// Session-scoped, per-archetype stat overrides for the admin tuning tool.
//
// These maps are module-level mutable state seeded with the engine's default
// values. They are intentionally NOT part of GameState: stat helpers like
// moveRange() are called all over pc.ts/npc.ts without state, and designer
// tuning values are not game state (they should not be captured by the undo
// stack or match reset). Overrides are session-only — the module re-initializes
// on page load, so a reload naturally discards them. This module is the seam a
// future persistence change will hook into.

type UnitType = PcType | NpcType

// Bounds for edited values (see design.md). Movement may be 0; HP must be ≥ 1.
const HP_MIN = 1
const HP_MAX = 9
const MOVE_MIN = 0
const MOVE_MAX = 12

// The unit definition table is the single source of truth for per-archetype
// defaults; this override layer seeds from it (see unitDefs.ts).
const ALL_UNIT_TYPES: UnitType[] = [
  'melee', 'ranger', 'magic-user', 'rogue', 'short-range', 'long-range',
]

let maxHpByType: Record<UnitType, number>
let moveRangeByType: Record<UnitType, number>

function seed() {
  maxHpByType = {} as Record<UnitType, number>
  moveRangeByType = {} as Record<UnitType, number>
  for (const t of ALL_UNIT_TYPES) {
    maxHpByType[t] = unitDefs[t].maxHp
    moveRangeByType[t] = unitDefs[t].movement.range
  }
}

seed()

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)))
}

export function getMaxHp(unitType: UnitType): number {
  return maxHpByType[unitType] ?? unitDefs[unitType].maxHp
}

export function getMoveRange(unitType: UnitType): number {
  return moveRangeByType[unitType] ?? unitDefs[unitType].movement.range
}

export function setMaxHp(unitType: UnitType, n: number): number {
  const v = clampInt(n, HP_MIN, HP_MAX)
  maxHpByType[unitType] = v
  return v
}

export function setMoveRange(unitType: UnitType, n: number): number {
  const v = clampInt(n, MOVE_MIN, MOVE_MAX)
  moveRangeByType[unitType] = v
  return v
}

// Restore every archetype to its default value. Intended for tests so they stay
// deterministic regardless of prior mutations.
export function resetOverrides() {
  seed()
}
