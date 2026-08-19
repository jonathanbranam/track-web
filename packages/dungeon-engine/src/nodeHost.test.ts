import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import type { ContentMap, GameState, NpcAction } from './index'

// The standing guard for "the engine runs in a Node host": it imports *only* the
// package barrel — the surface an outside consumer sees — plays a full round on a
// host-supplied board, and fails if any browser global is touched while doing it.
//
// Every other test in this package imports its modules directly. This one goes
// through `./index` on purpose: if the barrel stops exporting something a host
// needs, or a module behind it reaches for `fetch`/`localStorage`/the DOM, this
// test is what breaks.

// Browser globals, recorded rather than thrown, so a reintroduced `fetch` or
// `localStorage.getItem` inside the engine surfaces as a named access here even
// when the engine swallows the resulting failure in a try/catch.
const touched: string[] = []

function recorder(name: string): unknown {
  return new Proxy(function () {} as object, {
    get(_target, prop) {
      if (typeof prop === 'string') touched.push(`${name}.${prop}`)
      return undefined
    },
    apply() {
      touched.push(`${name}()`)
      return undefined
    },
  })
}

// The barrel, imported dynamically so the stubs above are already in place when
// the package's module-level initialization runs.
let engine: typeof import('./index')

beforeAll(async () => {
  for (const name of ['fetch', 'localStorage', 'sessionStorage', 'window', 'document', 'navigator']) {
    vi.stubGlobal(name, recorder(name))
  }
  engine = await import('./index')
})

afterAll(() => {
  vi.unstubAllGlobals()
})

// An 8×4 plains board with five enemy spawners along the top row and a player
// spawn zone along the bottom — enough for `initialState()`'s five NPCs and four
// PCs, small enough that every position below is checkable by hand.
const BOARD: ContentMap = {
  id: 'map-node-host',
  regionId: 'region-node-host',
  name: 'Node host board',
  order: 0,
  size: { cols: 8, rows: 4 },
  terrain: Array.from({ length: 4 }, () => Array.from({ length: 8 }, () => 'plains' as const)),
  objects: [],
  enemySpawnZone: ['0,0', '1,0', '2,0', '3,0', '4,0'],
  playerSpawnZone: ['0,3', '1,3', '2,3', '3,3', '4,3', '5,3'],
}

// A player-phase board: the four PCs seated on the spawn zone, one short-range
// NPC on (5,1) within reach of a PC that steps up to meet it.
function playerPhase(): GameState {
  const s = engine.initialState()
  return {
    ...s,
    phase: 'player',
    units: [
      { id: 'pc-0', kind: 'pc', col: 5, row: 3, unitType: 'melee', hp: engine.getMaxHp('melee') },
      { id: 'npc-0', kind: 'npc', col: 5, row: 1, unitType: 'short-range', hp: engine.getMaxHp('short-range') },
    ],
    npcPlans: [],
  }
}

describe('the engine in a Node host', () => {
  it('builds a board from host-supplied content with no I/O', () => {
    engine.applyMap(BOARD)
    expect(engine.gridCols()).toBe(8)
    expect(engine.gridRows()).toBe(4)
    expect(engine.enemySpawners()).toHaveLength(5)
    expect(engine.playerStartTiles().slice(0, 4)).toEqual([
      { col: 0, row: 3 }, { col: 1, row: 3 }, { col: 2, row: 3 }, { col: 3, row: 3 },
    ])
  })

  it('seats both sides on that board', () => {
    engine.applyMap(BOARD)
    const s = engine.initialState()
    expect(s.phase).toBe('placement')
    expect(s.units.filter((u) => u.kind === 'pc').map((u) => u.unitType))
      .toEqual(['melee', 'ranger', 'magic-user', 'rogue'])
    expect(s.units.filter((u) => u.kind === 'npc')).toHaveLength(5)
    // PCs sit on the spawn zone; NPCs on the spawner tiles.
    for (const u of s.units) {
      expect(u.row).toBe(u.kind === 'pc' ? 3 : 0)
    }
  })

  it('applies host-supplied unit definitions to the units it seats', () => {
    engine.applyMap(BOARD)
    engine.applyLoaded({ melee: { ...engine.unitDefs.melee, maxHp: 7 } })
    const melee = engine.initialState().units.find((u) => u.unitType === 'melee')
    expect(melee?.hp).toBe(7)
    engine.resetDefs()
  })

  // Moving and then attacking in one turn is two committed actions, not one
  // bundled action — the game has worked that way since plan-then-commit was
  // replaced by immediate actions. Driving it through the action surface is what
  // makes the movement charge observable; the bundled variant this replaces
  // passed an empty path, so it teleported for free.
  it('resolves a PC move and then an attack, charging the movement', () => {
    engine.applyMap(BOARD)
    const s = playerPhase()

    // The melee PC can reach the tile below the NPC (4 move range on open plains).
    expect(engine.validMoveDests(s, 'pc-0')).toContainEqual({ col: 5, row: 2 })

    const moved = engine.commitAction(s, 'pc-0', 'move', { col: 5, row: 2 })
    expect(moved.ok).toBe(true)
    if (!moved.ok) return
    expect(moved.state.units.find((u) => u.id === 'pc-0')).toMatchObject({ col: 5, row: 2 })
    // One tile of a melee PC's four spent on the way in.
    expect(engine.remainingMove(moved.state, moved.state.units.find((u) => u.id === 'pc-0')!)).toBe(3)

    const attacked = engine.commitAction(moved.state, 'pc-0', 'attack', { col: 5, row: 1 })
    expect(attacked.ok).toBe(true)
    if (!attacked.ok) return

    // Melee deals 2; the short-range NPC starts at 3.
    expect(attacked.state.units.find((u) => u.id === 'npc-0')?.hp).toBe(1)
    expect(engine.hasAttacked(attacked.state, 'pc-0')).toBe(true)
    // Attacking is committal: an attacked PC has no movement left this turn.
    expect(engine.remainingMove(attacked.state, attacked.state.units.find((u) => u.id === 'pc-0')!)).toBe(0)
  })

  it('resolves an NPC move and its telegraphed attack', () => {
    engine.applyMap(BOARD)
    const s = playerPhase()

    const { moves, attackPlans } = engine.computeNpcTurns(s)
    expect(moves.map((m) => m.unitId)).toEqual(['npc-0'])

    let next: GameState = { ...s, phase: 'npc-move' }
    for (const m of moves as NpcAction[]) next = engine.resolveNpcAction(next, m)
    for (const p of attackPlans) next = engine.resolveNpcAction(next, p)

    const pc = next.units.find((u) => u.id === 'pc-0')
    const npc = next.units.find((u) => u.id === 'npc-0')
    // The NPC closed on the PC and the telegraph landed for 1.
    expect(npc && Math.abs(npc.col - 5) + Math.abs(npc.row - 3)).toBeLessThanOrEqual(2)
    expect(pc?.hp).toBe(engine.getMaxHp('melee') - 1)
  })

  it('ends the round and hands the turn back to the player', () => {
    engine.applyMap(BOARD)
    const s = engine.resolvePcAction(playerPhase(), { kind: 'stay', unitId: 'pc-0' })
    const ended = engine.endRound(s)
    expect(ended.phase).toBe('player')
    expect(ended.attackedThisTurn).toEqual([])
    expect(ended.movedThisTurn).toEqual({})
    expect(ended.undoStack).toEqual([])
  })

  it('undoes a move without a host', () => {
    engine.applyMap(BOARD)
    const s = playerPhase()
    // The immediate-move path a host drives tile by tile: `applyMove` charges the
    // budget and pushes the undo record, `undoLastMove` reverses both.
    const moved = engine.applyMove(s, 'pc-0', 5, 2, [{ col: 5, row: 2 }])
    expect(moved.units.find((u) => u.id === 'pc-0')).toMatchObject({ col: 5, row: 2 })
    expect(engine.remainingMove(moved, moved.units.find((u) => u.id === 'pc-0')!)).toBe(3)
    const undone = engine.undoLastMove(moved)
    expect(undone.units.find((u) => u.id === 'pc-0')).toMatchObject({ col: 5, row: 3 })
    expect(engine.remainingMove(undone, undone.units.find((u) => u.id === 'pc-0')!)).toBe(4)
  })

  it('answers footprint and pathfinding queries', () => {
    engine.applyMap(BOARD)
    expect(engine.inBounds(7, 3)).toBe(true)
    expect(engine.inBounds(8, 3)).toBe(false)
    expect(engine.attackFootprint(engine.unitDefs.melee, { col: 2, row: 2 }, 'up')).toEqual([{ col: 2, row: 1 }])
  })

  // The tripwire: every assertion above ran through the barrel, so if any module
  // behind it read a browser global the recorder logged the property name.
  it('touched no browser global doing any of it', () => {
    expect(touched).toEqual([])
  })
})
