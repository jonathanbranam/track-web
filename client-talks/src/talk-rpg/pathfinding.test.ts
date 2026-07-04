import { describe, expect, it } from 'vitest'
import { findPath, pathToDirections, resolveTarget } from './pathfinding'
import { EntityState } from './precompute'
import { GameMap } from './script'

// A 5x5 grid, walkable everywhere except a wall column at x=2 (rows 0-3),
// leaving row 4 open as the only route across — and one fully isolated
// unreachable tile at (4, 0).
const WIDTH = 5
const HEIGHT = 5
const WALL_COLUMN_X = 2
const walkableGrid: boolean[] = []
for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    const isWallColumn = x === WALL_COLUMN_X && y < 4
    const isIsolated = x === 4 && y === 0
    walkableGrid.push(!isWallColumn && !isIsolated)
  }
}

const MAP: GameMap = {
  sceneId: 'test-map',
  width: WIDTH,
  height: HEIGHT,
  tiles: new Array(WIDTH * HEIGHT).fill(0),
  walkableGrid,
  namedLocations: {
    plaza: { x: 4, y: 4 },
    gate: { x: 0, y: 4 },
  },
  entities: [],
}

const ENTITIES: Record<string, EntityState> = {
  npc: { id: 'npc', x: 3, y: 1, facing: 'down' },
}

describe('resolveTarget', () => {
  it('resolves a named location', () => {
    expect(resolveTarget(MAP, ENTITIES, 'plaza')).toEqual({ x: 4, y: 4 })
  })

  it('resolves a live entity position', () => {
    expect(resolveTarget(MAP, ENTITIES, 'npc')).toEqual({ x: 3, y: 1 })
  })

  it('returns null for an unknown target', () => {
    expect(resolveTarget(MAP, ENTITIES, 'nowhere')).toBeNull()
  })
})

describe('findPath', () => {
  it('reaches every named location, routing around the wall column', () => {
    const toPlaza = findPath(MAP, { x: 0, y: 0 }, { x: 4, y: 4 })
    expect(toPlaza).not.toBeNull()
    expect(toPlaza![toPlaza!.length - 1]).toEqual({ x: 4, y: 4 })
    // Every step must avoid the wall column above row 4.
    for (const step of toPlaza!) {
      expect(step.x === WALL_COLUMN_X && step.y < 4).toBe(false)
    }

    const toGate = findPath(MAP, { x: 4, y: 4 }, { x: 0, y: 4 })
    expect(toGate).not.toBeNull()
    expect(toGate![toGate!.length - 1]).toEqual({ x: 0, y: 4 })
  })

  it('reaches a tile adjacent to an NPC', () => {
    const path = findPath(MAP, { x: 0, y: 0 }, { x: 3, y: 0 })
    expect(path).not.toBeNull()
    expect(path![path!.length - 1]).toEqual({ x: 3, y: 0 })
  })

  it('returns an empty path when already at the target', () => {
    expect(findPath(MAP, { x: 1, y: 1 }, { x: 1, y: 1 })).toEqual([])
  })

  it('returns null for an unreachable tile', () => {
    expect(findPath(MAP, { x: 0, y: 0 }, { x: 4, y: 0 })).toBeNull()
  })
})

describe('pathToDirections', () => {
  it('converts a coordinate path into unit-step directions', () => {
    const path = findPath(MAP, { x: 0, y: 4 }, { x: 2, y: 4 })!
    const directions = pathToDirections({ x: 0, y: 4 }, path)
    expect(directions).toEqual(['right', 'right'])
  })
})
