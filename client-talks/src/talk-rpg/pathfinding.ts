import { Direction, GameMap } from './script'
import { EntityState } from './precompute'

export interface GridPoint {
  x: number
  y: number
}

function key(point: GridPoint): string {
  return `${point.x},${point.y}`
}

function isWalkable(map: GameMap, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return false
  return map.walkableGrid[y * map.width + x] ?? false
}

const NEIGHBORS: Array<{ dx: number; dy: number }> = [
  { dx: 0, dy: -1 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 1, dy: 0 },
]

/** Resolves a `walkTo` target string to a grid coordinate: a named location first, then a live entity's position. */
export function resolveTarget(map: GameMap, entities: Record<string, EntityState>, target: string): GridPoint | null {
  const location = map.namedLocations[target]
  if (location) return { x: location.x, y: location.y }
  const entity = entities[target]
  if (entity) return { x: entity.x, y: entity.y }
  return null
}

/**
 * A* over `map`'s walkable grid. Returns the ordered list of grid points from
 * (but not including) `start` to `goal`, `[]` if already there, or `null` if
 * `goal` is unreachable (including when `goal` itself isn't walkable).
 */
export function findPath(map: GameMap, start: GridPoint, goal: GridPoint): GridPoint[] | null {
  if (start.x === goal.x && start.y === goal.y) return []
  if (!isWalkable(map, goal.x, goal.y)) return null

  const startKey = key(start)
  const goalKey = key(goal)
  const heuristic = (point: GridPoint) => Math.abs(point.x - goal.x) + Math.abs(point.y - goal.y)

  const gScore = new Map<string, number>([[startKey, 0]])
  const fScore = new Map<string, number>([[startKey, heuristic(start)]])
  const cameFrom = new Map<string, string | null>([[startKey, null]])
  const pointOf = new Map<string, GridPoint>([[startKey, start]])
  const open = new Set<string>([startKey])

  while (open.size > 0) {
    let current = ''
    let bestF = Infinity
    for (const candidate of open) {
      const f = fScore.get(candidate) ?? Infinity
      if (f < bestF) {
        bestF = f
        current = candidate
      }
    }

    if (current === goalKey) {
      const path: GridPoint[] = []
      let cursor: string | null = current
      while (cursor !== null && cursor !== startKey) {
        path.unshift(pointOf.get(cursor)!)
        cursor = cameFrom.get(cursor) ?? null
      }
      return path
    }

    open.delete(current)
    const point = pointOf.get(current)!
    const g = gScore.get(current) ?? Infinity

    for (const { dx, dy } of NEIGHBORS) {
      const nx = point.x + dx
      const ny = point.y + dy
      if (!isWalkable(map, nx, ny)) continue
      const neighborKey = `${nx},${ny}`
      const tentativeG = g + 1
      if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, current)
        gScore.set(neighborKey, tentativeG)
        fScore.set(neighborKey, tentativeG + heuristic({ x: nx, y: ny }))
        pointOf.set(neighborKey, { x: nx, y: ny })
        open.add(neighborKey)
      }
    }
  }

  return null
}

/** Converts a sequence of adjacent grid points (as returned by `findPath`) into unit-step directions. */
export function pathToDirections(start: GridPoint, path: GridPoint[]): Direction[] {
  const directions: Direction[] = []
  let cursor = start
  for (const point of path) {
    if (point.x === cursor.x + 1 && point.y === cursor.y) directions.push('right')
    else if (point.x === cursor.x - 1 && point.y === cursor.y) directions.push('left')
    else if (point.y === cursor.y + 1 && point.x === cursor.x) directions.push('down')
    else if (point.y === cursor.y - 1 && point.x === cursor.x) directions.push('up')
    cursor = point
  }
  return directions
}
