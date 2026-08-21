import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  newScenario,
  placeUnit,
  removeUnit,
  relocateUnit,
  setUnitHp,
  clearUnits,
  placeStructure,
  removeStructure,
  moveStructure,
  STRUCTURE_HP,
} from './scenario'
import { getEngineMode, setEngineMode } from './engine-mode'
import { boardCells, gridCols, playerSpawnZone, reset as resetContent } from './contentStore'
import { getMaxHp, setMaxHp, reset as resetDefs } from './defStore'
import { startScenario } from './sequencer'
import { validMoveDests } from './pc'
import { threatTiles } from './actions'
import type { GameState, TurnPhase } from './types'

// A fresh authored scenario on the bundled board's real terrain and
// structures — power centres at (8,3), (5,4), (11,4), (2,6), (14,6), a tower
// at (8,6) — the same fixture `sequencer.test.ts` describes. Bench mode must
// already be set by the caller.
function placementState(): GameState {
  const result = newScenario(boardCells())
  if (!result.ok) throw new Error(`setup: newScenario failed — ${result.reason}`)
  return result.state
}

function snapshot(state: GameState): unknown {
  return JSON.parse(JSON.stringify(state))
}

beforeEach(() => {
  resetContent()
  resetDefs()
  setEngineMode('bench')
})

afterEach(() => setEngineMode('game'))

// ─── 3.2 — the fence ────────────────────────────────────────────────────────────

describe('the fence', () => {
  it('refuses newScenario outside bench mode', () => {
    setEngineMode('game')
    const result = newScenario(boardCells())
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/bench-only/)
  })

  it('refuses every scenario-setup operation outside bench mode, leaving state unchanged', () => {
    const state = placementState()
    const before = snapshot(state)
    setEngineMode('game')

    const tile = { col: 0, row: 0 }
    const results = [
      placeUnit(state, 'melee', tile),
      removeUnit(state, 'melee-1'),
      relocateUnit(state, 'melee-1', tile),
      setUnitHp(state, 'melee-1', 2),
      clearUnits(state),
      placeStructure(state, 'tower', tile),
      removeStructure(state, tile),
      moveStructure(state, tile, { col: 1, row: 0 }),
    ]
    for (const result of results) {
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.reason).toMatch(/bench-only/)
    }
    expect(snapshot(state)).toEqual(before)
  })

  it.each(['player', 'npc-move', 'npc-attack'] as TurnPhase[])(
    'refuses a state-taking operation once the round has reached "%s", naming the phase (not "bench-only")',
    (phase) => {
      const state = { ...placementState(), phase }
      const before = snapshot(state)
      const result = placeUnit(state, 'melee', { col: 0, row: 0 })
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.reason).toContain(phase)
      expect(result.reason).not.toMatch(/bench-only/)
      expect(snapshot(state)).toEqual(before)
    },
  )

  it('the two refusal reasons are distinguishable from each other', () => {
    const state = placementState()
    setEngineMode('game')
    const gameModeReason = placeUnit(state, 'melee', { col: 0, row: 0 })
    setEngineMode('bench')
    const wrongPhaseReason = placeUnit({ ...state, phase: 'player' }, 'melee', { col: 0, row: 0 })
    expect(gameModeReason.ok).toBe(false)
    expect(wrongPhaseReason.ok).toBe(false)
    if (gameModeReason.ok || wrongPhaseReason.ok) return
    expect(gameModeReason.reason).not.toEqual(wrongPhaseReason.reason)
  })
})

// ─── 3.3 — units ──────────────────────────────────────────────────────────────

describe('placeUnit', () => {
  it('places a unit on an empty tile that belongs to no spawn zone', () => {
    const state = placementState()
    const outsideZone = { col: 0, row: 0 }
    expect(playerSpawnZone().has(`${outsideZone.col},${outsideZone.row}`)).toBe(false)
    const result = placeUnit(state, 'short-range', outsideZone)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.unit.col).toBe(outsideZone.col)
    expect(result.unit.row).toBe(outsideZone.row)
    expect(result.state.units).toContainEqual(result.unit)
  })

  it('refuses a tile already holding a unit, leaving state unchanged', () => {
    const state = placementState()
    const first = placeUnit(state, 'melee', { col: 0, row: 0 })
    expect(first.ok).toBe(true)
    if (!first.ok) return
    const before = snapshot(first.state)
    const result = placeUnit(first.state, 'rogue', { col: 0, row: 0 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(snapshot(first.state)).toEqual(before)
  })

  it('refuses a tile holding a structure', () => {
    const state = placementState()
    // (8,6) is the bundled board's tower.
    const result = placeUnit(state, 'melee', { col: 8, row: 6 })
    expect(result.ok).toBe(false)
  })

  it('refuses an off-board tile', () => {
    const state = placementState()
    const result = placeUnit(state, 'melee', { col: gridCols(), row: 0 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toMatch(/off the board/)
  })

  it('defaults HP to the archetype maximum, including a session override', () => {
    const state = placementState()
    const stock = placeUnit(state, 'melee', { col: 0, row: 0 })
    expect(stock.ok).toBe(true)
    if (!stock.ok) return
    expect(stock.unit.hp).toBe(getMaxHp('melee'))

    setMaxHp('melee', 9)
    const overridden = placeUnit(stock.state, 'melee', { col: 1, row: 0 })
    expect(overridden.ok).toBe(true)
    if (!overridden.ok) return
    expect(overridden.unit.hp).toBe(9)
  })

  it('accepts an explicit starting HP instead of the maximum', () => {
    const state = placementState()
    const result = placeUnit(state, 'melee', { col: 0, row: 0 }, 1)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.unit.hp).toBe(1)
  })
})

describe('removeUnit', () => {
  it('removes a unit from the board', () => {
    const state = placementState()
    const placed = placeUnit(state, 'melee', { col: 0, row: 0 })
    expect(placed.ok).toBe(true)
    if (!placed.ok) return
    const result = removeUnit(placed.state, placed.unit.id)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.units).toEqual([])
  })

  it('refuses to remove a unit that is not on the board', () => {
    const state = placementState()
    const result = removeUnit(state, 'melee-99')
    expect(result.ok).toBe(false)
  })
})

describe('relocateUnit', () => {
  it('moves a unit beyond its movement range, leaving turn records untouched', () => {
    const state = placementState()
    const placed = placeUnit(state, 'melee', { col: 0, row: 0 })
    expect(placed.ok).toBe(true)
    if (!placed.ok) return
    // melee's movement range is well under this Manhattan distance.
    expect(getMaxHp('melee')).toBeGreaterThan(0) // sanity: the def store is live
    const far = { col: 10, row: 0 }
    const result = relocateUnit(placed.state, placed.unit.id, far)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const moved = result.state.units.find((u) => u.id === placed.unit.id)!
    expect(moved.col).toBe(far.col)
    expect(moved.row).toBe(far.row)
    expect(result.state.movedThisTurn).toEqual(placed.state.movedThisTurn)
    expect(result.state.attackedThisTurn).toEqual(placed.state.attackedThisTurn)
    expect(result.state.undoStack).toEqual(placed.state.undoStack)
  })

  it('refuses relocation onto an occupied, structure-held, or off-board tile', () => {
    const state = placementState()
    const a = placeUnit(state, 'melee', { col: 0, row: 0 })
    const b = placeUnit(a.ok ? a.state : state, 'rogue', { col: 1, row: 0 })
    expect(a.ok && b.ok).toBe(true)
    if (!a.ok || !b.ok) return

    expect(relocateUnit(b.state, a.unit.id, { col: 1, row: 0 }).ok).toBe(false) // occupied by rogue
    expect(relocateUnit(b.state, a.unit.id, { col: 8, row: 6 }).ok).toBe(false) // tower
    expect(relocateUnit(b.state, a.unit.id, { col: -1, row: 0 }).ok).toBe(false) // off board
  })
})

describe('setUnitHp', () => {
  it('sets a unit\'s HP', () => {
    const state = placementState()
    const placed = placeUnit(state, 'melee', { col: 0, row: 0 })
    expect(placed.ok).toBe(true)
    if (!placed.ok) return
    const result = setUnitHp(placed.state, placed.unit.id, 1)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.units.find((u) => u.id === placed.unit.id)!.hp).toBe(1)
  })

  it('refuses HP at zero or below, leaving the unit untouched', () => {
    const state = placementState()
    const placed = placeUnit(state, 'melee', { col: 0, row: 0 })
    expect(placed.ok).toBe(true)
    if (!placed.ok) return

    for (const hp of [0, -1]) {
      const result = setUnitHp(placed.state, placed.unit.id, hp)
      expect(result.ok).toBe(false)
    }
    expect(placed.state.units.find((u) => u.id === placed.unit.id)!.hp).toBe(placed.unit.hp)
  })
})

describe('clearUnits', () => {
  it('removes every unit from the board', () => {
    const state = placementState()
    const a = placeUnit(state, 'melee', { col: 0, row: 0 })
    const b = placeUnit(a.ok ? a.state : state, 'rogue', { col: 1, row: 0 })
    expect(a.ok && b.ok).toBe(true)
    if (!a.ok || !b.ok) return
    const result = clearUnits(b.state)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.units).toEqual([])
  })
})

// ─── 3.4 — unit ids ──────────────────────────────────────────────────────────

describe('unit ids', () => {
  it('two units of one archetype get distinct ids naming that archetype', () => {
    const state = placementState()
    const first = placeUnit(state, 'melee', { col: 0, row: 0 })
    expect(first.ok).toBe(true)
    if (!first.ok) return
    const second = placeUnit(first.state, 'melee', { col: 1, row: 0 })
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(first.unit.id).not.toBe(second.unit.id)
    expect(first.unit.id.startsWith('melee-')).toBe(true)
    expect(second.unit.id.startsWith('melee-')).toBe(true)
  })

  it('does not collide with an id that arrived from elsewhere, gaps and all', () => {
    const base = placementState()
    // Simulate units installed by the host rather than by placeUnit — a
    // timeline jump or a restored position — whose ids have a gap.
    const withGap: GameState = {
      ...base,
      units: [{ id: 'melee-5', kind: 'pc', unitType: 'melee', col: 2, row: 2, hp: getMaxHp('melee') }],
    }
    const result = placeUnit(withGap, 'melee', { col: 0, row: 0 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(withGap.units.some((u) => u.id === result.unit.id)).toBe(false)
    expect(result.unit.id).toBe('melee-6')
  })
})

// ─── 3.5 — structures ────────────────────────────────────────────────────────

describe('placeStructure', () => {
  it('places a structure on an empty tile at its kind\'s default HP', () => {
    const state = placementState()
    const tile = { col: 0, row: 0 }
    const result = placeStructure(state, 'tower', tile)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const cell = result.state.cells[tile.row][tile.col]
    expect(cell.hasStructure).toBe(true)
    expect(cell.structureKind).toBe('tower')
    expect(cell.structureHp).toBe(STRUCTURE_HP.tower)
  })

  it('accepts an explicit HP instead of the default', () => {
    const state = placementState()
    const result = placeStructure(state, 'power-center', { col: 0, row: 0 }, 1)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.cells[0][0].structureHp).toBe(1)
  })

  it('refuses a tile that holds a unit', () => {
    const state = placementState()
    const placed = placeUnit(state, 'melee', { col: 0, row: 0 })
    expect(placed.ok).toBe(true)
    if (!placed.ok) return
    const result = placeStructure(placed.state, 'tower', { col: 0, row: 0 })
    expect(result.ok).toBe(false)
  })

  it('refuses a tile that already holds a structure, leaving the board unchanged', () => {
    const state = placementState()
    const before = snapshot(state)
    // (8,6) already holds the bundled board's tower.
    const result = placeStructure(state, 'power-center', { col: 8, row: 6 })
    expect(result.ok).toBe(false)
    expect(snapshot(state)).toEqual(before)
  })
})

describe('removeStructure', () => {
  it('removes a structure, clearing kind and HP', () => {
    const state = placementState()
    const result = removeStructure(state, { col: 8, row: 6 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const cell = result.state.cells[6][8]
    expect(cell.hasStructure).toBe(false)
    expect(cell.structureKind).toBeUndefined()
    expect(cell.structureHp).toBeUndefined()
  })

  it('refuses a tile that holds no structure', () => {
    const state = placementState()
    const result = removeStructure(state, { col: 0, row: 0 })
    expect(result.ok).toBe(false)
  })
})

describe('moveStructure', () => {
  it('carries kind and current HP to the destination and clears the origin', () => {
    const state = placementState()
    const placed = placeStructure(state, 'power-center', { col: 0, row: 0 }, 1)
    expect(placed.ok).toBe(true)
    if (!placed.ok) return
    const result = moveStructure(placed.state, { col: 0, row: 0 }, { col: 1, row: 0 })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.cells[0][0].hasStructure).toBe(false)
    const dest = result.state.cells[0][1]
    expect(dest.hasStructure).toBe(true)
    expect(dest.structureKind).toBe('power-center')
    expect(dest.structureHp).toBe(1)
  })

  it('refuses when the origin holds no structure', () => {
    const state = placementState()
    const result = moveStructure(state, { col: 0, row: 0 }, { col: 1, row: 0 })
    expect(result.ok).toBe(false)
  })

  it('refuses when the destination holds a unit or another structure', () => {
    const state = placementState()
    const placed = placeStructure(state, 'power-center', { col: 0, row: 0 })
    expect(placed.ok).toBe(true)
    if (!placed.ok) return

    // (8,6) already holds the bundled board's tower.
    expect(moveStructure(placed.state, { col: 0, row: 0 }, { col: 8, row: 6 }).ok).toBe(false)

    const unitPlaced = placeUnit(placed.state, 'melee', { col: 2, row: 0 })
    expect(unitPlaced.ok).toBe(true)
    if (!unitPlaced.ok) return
    expect(moveStructure(unitPlaced.state, { col: 0, row: 0 }, { col: 2, row: 0 }).ok).toBe(false)
  })
})

describe('a placed structure changes what the board reports', () => {
  it('blocks a path a unit could previously move through', () => {
    const state = placementState()
    const placed = placeUnit(state, 'melee', { col: 5, row: 5 })
    expect(placed.ok).toBe(true)
    if (!placed.ok) return

    const target = { col: 6, row: 5 }
    const before = placed.state
    expect(validMoveDests(before, placed.unit.id)).toContainEqual(target)

    const withStructure = placeStructure(before, 'tower', target)
    expect(withStructure.ok).toBe(true)
    if (!withStructure.ok) return

    expect(validMoveDests(withStructure.state, placed.unit.id)).not.toContainEqual(target)
  })

  it('blocks a tile a unit could previously shoot across', () => {
    // short-range's attack is minRange 1 / maxRange 2 with penetration
    // `stop_at_first`: a blocker at range 1 still names itself a legal target
    // (attacking a structure is how it takes damage) but stops the scan from
    // reaching range 2 beyond it.
    const state = placementState()
    const placed = placeUnit(state, 'short-range', { col: 5, row: 5 })
    expect(placed.ok).toBe(true)
    if (!placed.ok) return

    const blocker = { col: 6, row: 5 }
    const beyond = { col: 7, row: 5 }
    const before = placed.state
    expect(threatTiles(before, placed.unit.id)).toContainEqual(beyond)

    const withStructure = placeStructure(before, 'tower', blocker)
    expect(withStructure.ok).toBe(true)
    if (!withStructure.ok) return

    const threatened = threatTiles(withStructure.state, placed.unit.id)
    expect(threatened).toContainEqual(blocker)
    expect(threatened).not.toContainEqual(beyond)
  })
})

// ─── 3.6 — entering the round ────────────────────────────────────────────────

describe('an authored scenario entering the round', () => {
  it('reaches npc-move through startScenario, the same way a loaded one does', () => {
    const state = placementState()
    expect(state.phase).toBe('placement')
    const result = startScenario(state)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.phase).toBe('npc-move')
  })

  it('carries the authored units and cells through the transition', () => {
    const state = placementState()
    const placed = placeUnit(state, 'melee', { col: 0, row: 0 })
    expect(placed.ok).toBe(true)
    if (!placed.ok) return
    const result = startScenario(placed.state)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.units).toEqual(placed.state.units)
    expect(result.state.cells).toEqual(placed.state.cells)
  })
})
