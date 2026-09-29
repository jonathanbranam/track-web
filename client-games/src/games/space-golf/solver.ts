import { buildCourse, type Level } from './levels'
import type { Tuning } from './physics'
import { START_HULL } from './run'
import { simulateShot, type Lie } from './shot'

/**
 * A coarse brute-force search over shots: breadth-first over lies (planet, way
 * round), sampling release angles × powers from each. Used by tests to prove a
 * level can reach its wormhole, and while designing levels to see how many
 * strokes a route needs. Stars are ignored.
 */

export interface SolveOptions {
  angles?: number
  powers?: number
  maxDepth?: number
}

export interface SolveResult {
  /** Fewest shots to the wormhole found, or null. */
  minStrokes: number | null
  /** The shots of that route, as (planet, angle, power). */
  route: { planet: number; angle: number; power: number }[]
  lies: number
}

export function solveLevel(level: Level, tuning: Tuning, opts: SolveOptions = {}): SolveResult {
  const angles = opts.angles ?? 72
  const powers = opts.powers ?? 12
  const maxDepth = opts.maxDepth ?? 8
  const course = buildCourse(level, tuning)
  const key = (l: Lie) => `${l.planet}:${l.dir}`

  type Node = { lie: Lie; route: SolveResult['route'] }
  const start: Lie = { planet: level.tee.planet, angle: 0, dir: level.tee.dir }
  const seen = new Set([key(start)])
  let frontier: Node[] = [{ lie: start, route: [] }]

  for (let depth = 1; depth <= maxDepth && frontier.length; depth++) {
    const next: Node[] = []
    for (const node of frontier) {
      for (let a = 0; a < angles; a++) {
        const angle = (a / angles) * Math.PI * 2
        for (let k = 1; k <= powers; k++) {
          const power = k / powers
          const res = simulateShot(course, node.lie, { angle, power }, { hull: START_HULL, collected: [] }, tuning)
          const step = { planet: node.lie.planet, angle, power }
          if (res.outcome?.kind === 'wormhole') {
            return { minStrokes: depth, route: [...node.route, step], lies: seen.size }
          }
          if (res.outcome?.kind === 'lock' && !seen.has(key(res.outcome.lie))) {
            seen.add(key(res.outcome.lie))
            next.push({ lie: res.outcome.lie, route: [...node.route, step] })
          }
        }
      }
    }
    frontier = next
  }
  return { minStrokes: null, route: [], lies: seen.size }
}

export interface StarWitness {
  /** The lie the shot is taken from. */
  from: Lie
  angle: number
  power: number
  /** How the shot ends. */
  outcome: 'lock' | 'wormhole'
  /** Shots needed to reach `from` (0 = the tee). */
  depth: number
}

/**
 * For each star, a real shot that collects it: some lie reachable from the tee
 * by a chain of locking shots, a release angle and power, whose simulated flight
 * passes through the star and survives to a lock or the wormhole. Null where no
 * sampled shot does. Uses the game's own simulateShot, so a witness is a flight
 * the player can actually fly.
 */
export function starWitnesses(level: Level, tuning: Tuning, opts: SolveOptions = {}): (StarWitness | null)[] {
  const angles = opts.angles ?? 72
  const powers = opts.powers ?? 12
  const maxDepth = opts.maxDepth ?? 8
  const course = buildCourse(level, tuning)
  const key = (l: Lie) => `${l.planet}:${l.dir}`
  const found: (StarWitness | null)[] = level.stars.map(() => null)

  const start: Lie = { planet: level.tee.planet, angle: 0, dir: level.tee.dir }
  const seen = new Set([key(start)])
  let frontier: Lie[] = [start]
  for (let depth = 0; depth < maxDepth && frontier.length; depth++) {
    const next: Lie[] = []
    for (const lie of frontier) {
      for (let a = 0; a < angles; a++) {
        if (found.every(Boolean)) return found
        const angle = (a / angles) * Math.PI * 2
        for (let k = 1; k <= powers; k++) {
          const power = k / powers
          const res = simulateShot(course, lie, { angle, power }, { hull: START_HULL, collected: [] }, tuning)
          const kind = res.outcome?.kind
          if (kind !== 'lock' && kind !== 'wormhole') continue
          for (const s of res.stars) {
            found[s] ??= { from: lie, angle, power, outcome: kind, depth }
          }
          if (res.outcome?.kind === 'lock' && !seen.has(key(res.outcome.lie))) {
            seen.add(key(res.outcome.lie))
            next.push(res.outcome.lie)
          }
        }
      }
    }
    frontier = next
  }
  return found
}
